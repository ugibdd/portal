// Модуль администратора
const Admin = (function() {
    let employeesCache = [];

    // Загрузка списка сотрудников
    async function loadEmployeesList() {
        const { data } = await supabaseClient
            .from('employees')
            .select('*')
            .order('nickname');
        
        employeesCache = data || [];
        return employeesCache;
    }

    // Отображение списка сотрудников для управления
	function renderEmployeesManagementList() {
		const container = document.getElementById('employeesManageList');
		if (!container) return;

		container.innerHTML = '';
		
		if (!employeesCache.length) {
			container.innerHTML = '<div class="list-item">Нет сотрудников</div>';
			return;
		}

		const currentUser = Auth.getCurrentUser();

		employeesCache.forEach(emp => {
			const div = document.createElement('div');
			div.className = 'list-item';
			
			// Проверяем, может ли текущий пользователь удалить этого сотрудника
			const canDelete = Auth.canDeleteUser(emp);
			// Проверяем, может ли текущий пользователь редактировать этого сотрудника
			const canEdit = Auth.canEditUser(emp);
			// НОВОЕ: Проверяем, является ли сотрудник текущим пользователем
			const isSelf = currentUser && currentUser.id === emp.id;
			
			div.innerHTML = `
				<div style="flex:1;">
					<div class="item-title">${emp.nickname} ${isSelf ? '(Вы)' : ''}</div>
					<div class="item-meta">${emp.rank} · ${emp.department} · ${emp.category}</div>
				</div>
				<div class="flex-row" style="gap: 8px;">
					${canEdit ? `<button class="small" data-id="${emp.id}" data-action="edit">✏️ Редактировать</button>` : ''}
					${canDelete && !isSelf ? `<button class="small secondary" data-id="${emp.id}" data-action="delete">🗑️ Удалить</button>` : ''}
				</div>
			`;
			container.appendChild(div);
		});

		// Обработчики для кнопок
		container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
			btn.onclick = () => openEditEmployeeModal(btn.dataset.id);
		});

		container.querySelectorAll('button[data-action="delete"]').forEach(btn => {
			btn.onclick = () => deleteEmployee(btn.dataset.id);
		});
	}

    // Открыть модальное окно для редактирования сотрудника
    async function openEditEmployeeModal(id) {
        Auth.ping(); // Сбрасываем таймер
        
        const employee = employeesCache.find(emp => emp.id === id);
        if (!employee) return;

        // Проверяем права на редактирование
        if (!Auth.canEditUser(employee)) {
            UI.showNotification('У вас нет прав для редактирования этого сотрудника', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'editEmployeeModal';
        
        modal.innerHTML = `
		<div class="modal-container">
			<div class="modal-header">
				<h3>Редактирование сотрудника</h3>
				<button class="modal-close">&times;</button>
			</div>
			<div class="modal-content">
				<div class="form-group">
					<label for="edit_nickname">Логин <span class="required">*</span></label>
					<input id="edit_nickname" type="text" placeholder="Введите логин" value="${employee.nickname}">
				</div>
				
				<div class="form-group">
					<label for="edit_password">Новый пароль</label>
					<input id="edit_password" type="text" placeholder="Оставьте пустым, если не меняете"> 
					<small class="field-hint">Минимальная длина: 6 символов</small>
				</div>
				
				<div class="form-group">
					<label for="edit_rank">Звание <span class="required">*</span></label>
					<input id="edit_rank" placeholder="Например: старший лейтенант" value="${employee.rank || ''}">
				</div>
				
				<div class="form-group">
					<label for="edit_department">Подразделение <span class="required">*</span></label>
					<input id="edit_department" placeholder="Например: ОБ" value="${employee.department || ''}">
				</div>
				
				<div class="form-group">
					<label for="edit_category">Категория <span class="required">*</span></label>
					<select id="edit_category">
						<option value="МС" ${employee.category === 'МС' ? 'selected' : ''}>Младший состав (МС)</option>
						<option value="РС" ${employee.category === 'РС' ? 'selected' : ''}>Руководящий состав (РС)</option>
						<option value="ВРС" ${employee.category === 'ВРС' ? 'selected' : ''}>Высший руководящий состав (ВРС)</option>
						<option value="Администратор" ${employee.category === 'Администратор' ? 'selected' : ''}>Администрация</option>
					</select>
				</div>
				
				<div class="flex-row" style="justify-content: flex-end; margin-top: 24px;">
					<button id="cancelEditBtn" class="secondary">Отмена</button>
					<button id="saveEditBtn">Сохранить изменения</button>
				</div>
			</div>
		</div>
	`;

        document.body.appendChild(modal);

        // Обработчики
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.getElementById('cancelEditBtn').onclick = () => modal.remove();

        document.getElementById('saveEditBtn').onclick = async () => {
            Auth.ping(); // Сбрасываем таймер при сохранении
            
            const nickname = document.getElementById('edit_nickname')?.value.trim();
            const password = document.getElementById('edit_password')?.value.trim();
            const rank = document.getElementById('edit_rank')?.value.trim();
            const department = document.getElementById('edit_department')?.value.trim();
            const category = document.getElementById('edit_category')?.value;

            if (!nickname || !rank || !department) {
                UI.showNotification('Заполните все обязательные поля', 'error');
                return;
            }

            try {
                // Сохраняем текущую сессию администратора для восстановления
                const { data: { session: adminSession } } = await supabaseClient.auth.getSession();
                
                if (!adminSession) {
                    throw new Error('Сессия администратора не найдена');
                }

                // 1. Если меняется пароль
                if (password) {
                    try {
                        await SupabaseAdmin.updateUserPassword(employee.auth_user_id, password);
                        UI.showNotification('Пароль успешно изменен', 'success');
                    } catch (error) {
                        console.error('Password update error:', error);
                        throw new Error('Ошибка при обновлении пароля: ' + error.message);
                    }
                }

                // 2. Если меняется никнейм
                if (nickname !== employee.nickname) {
                    try {
                        await SupabaseAdmin.updateUserMetadata(employee.auth_user_id, {
                            nickname: nickname,
                            rank: rank,
                            department: department,
                            category: category
                        });
                    } catch (error) {
                        console.error('Metadata update error:', error);
                        throw new Error('Ошибка при обновлении логина: ' + error.message);
                    }
                }

                // 3. Восстанавливаем сессию администратора
                await supabaseClient.auth.setSession({
                    access_token: adminSession.access_token,
                    refresh_token: adminSession.refresh_token
                });

                // 4. Обновляем данные в таблице employees
                const updateData = { 
                    nickname, 
                    rank, 
                    department, 
                    category 
                };
                
                const { error: dbError } = await supabaseClient
                    .from('employees')
                    .update(updateData)
                    .eq('id', id);

                if (dbError) {
                    throw new Error('Ошибка при обновлении данных: ' + dbError.message);
                }

                UI.showNotification('Данные сотрудника обновлены', 'success');
                modal.remove();
                await loadEmployeesList();
                renderEmployeesManagementList();
                renderEmployeesCreateList();
                
            } catch (error) {
				console.error('Update error:', error);
				ErrorHandler.showError(error, 'Ошибка при обновлении данных');
				
				// Пытаемся восстановить сессию в случае ошибки
				try {
					const { data: { session } } = await supabaseClient.auth.getSession();
					if (!session) {
						const currentUser = Auth.getCurrentUser();
						if (currentUser) {
							window.location.hash = '';
							UI.showAuthMode();
						}
					}
				} catch (e) {
					console.error('Session recovery error:', e);
				}
			}
        };
    }

    // Удаление сотрудника
	async function deleteEmployee(id) {
		Auth.ping(); // Сбрасываем таймер
		
		const employee = employeesCache.find(emp => emp.id === id);
		if (!employee) return;

		// Проверяем права на удаление
		if (!Auth.canDeleteUser(employee)) {
			UI.showNotification('У вас нет прав для удаления этого сотрудника', 'error');
			return;
		}

		// НОВОЕ: Проверяем, не пытается ли пользователь удалить сам себя
		const currentUser = Auth.getCurrentUser();
		if (currentUser && currentUser.id === id) {
			UI.showNotification('Вы не можете удалить свой собственный аккаунт', 'error');
			return;
		}

		const confirmModal = document.createElement('div');
		confirmModal.className = 'modal-overlay';
		confirmModal.innerHTML = `
			<div class="modal-container" style="max-width: 400px;">
				<div class="modal-header">
					<h3>Подтверждение удаления</h3>
					<button class="modal-close">&times;</button>
				</div>
				<div class="modal-content">
					<p style="margin-bottom: 20px;">Вы уверены, что хотите удалить сотрудника <strong>${employee.nickname}</strong>?</p>
					<div class="flex-row" style="justify-content: flex-end;">
						<button id="cancelDeleteBtn" class="secondary">Отмена</button>
						<button id="confirmDeleteBtn" style="background: #dc3545;">Удалить</button>
					</div>
				</div>
			</div>
		`;

		document.body.appendChild(confirmModal);

		// Обработчики
		const closeBtn = confirmModal.querySelector('.modal-close');
		const cancelBtn = document.getElementById('cancelDeleteBtn');
		const confirmBtn = document.getElementById('confirmDeleteBtn');
		
		closeBtn.onclick = () => confirmModal.remove();
		
		confirmModal.onclick = (e) => {
			if (e.target === confirmModal) confirmModal.remove();
		};
		
		if (cancelBtn) {
			cancelBtn.onclick = () => confirmModal.remove();
		}
		
		if (confirmBtn) {
			confirmBtn.onclick = async () => {
				Auth.ping(); // Сбрасываем таймер при подтверждении
				
				// ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Ещё раз проверяем, не удаляет ли пользователь себя
				const currentUserCheck = Auth.getCurrentUser();
				if (currentUserCheck && currentUserCheck.id === id) {
					UI.showNotification('Вы не можете удалить свой собственный аккаунт', 'error');
					confirmModal.remove();
					return;
				}
				
				try {
					// Сохраняем текущую сессию администратора
					const { data: { session: adminSession } } = await supabaseClient.auth.getSession();
					
					if (!adminSession) {
						throw new Error('Сессия администратора не найдена');
					}
					
					// 1. Удаляем пользователя из Auth через Edge Function
					await SupabaseAdmin.deleteUser(employee.auth_user_id);
					
					// 2. Восстанавливаем сессию администратора
					await supabaseClient.auth.setSession({
						access_token: adminSession.access_token,
						refresh_token: adminSession.refresh_token
					});
					
					// 3. Удаляем из базы данных
					const { error } = await supabaseClient
						.from('employees')
						.delete()
						.eq('id', id);

					if (error) {
						throw new Error('Ошибка при удалении из базы: ' + error.message);
					}

					UI.showNotification('Сотрудник удалён', 'success');
					confirmModal.remove();
					await loadEmployeesList();
					renderEmployeesManagementList();
					renderEmployeesCreateList();
					
				} catch (error) {
					console.error('Delete error:', error);
					ErrorHandler.showError(error, 'Ошибка при удалении сотрудника');
					confirmModal.remove();
				}
			};
		}
	}

    // Отображение списка сотрудников для создания
    function renderEmployeesCreateList() {
        const ul = document.getElementById('employeesList');
        if (!ul) return;

        ul.innerHTML = '';
        employeesCache.forEach(emp => {
            const li = document.createElement('li');
            li.style.padding = '8px 0';
            li.style.borderBottom = '1px solid #dbe4ee';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            
            // Определяем класс бейджа в зависимости от роли
            let badgeClass = 'badge-new';
            if (emp.category === 'Администратор') {
                badgeClass = 'badge-progress';
            } else if (emp.category === 'ВРС') {
                badgeClass = 'badge-vrs';
            } else if (emp.category === 'РС') {
                badgeClass = 'badge-rs';
            }
            
            li.innerHTML = `
                <span>${emp.nickname} · ${emp.rank} · ${emp.department}</span>
                <span class="badge ${badgeClass}">${emp.category}</span>
            `;
            ul.appendChild(li);
        });
    }

    // Создание нового сотрудника
	async function createEmployee() {
		Auth.ping(); // Сбрасываем таймер
		
		if (!Auth.canManageUsers()) {
            UI.showNotification('У вас нет прав для создания сотрудников', 'error');
            return false;
        }

		// Получаем значения из формы
		const nickname = document.getElementById('nickname')?.value.trim();
		const password = document.getElementById('newPassword')?.value.trim();
		const rank = document.getElementById('rank')?.value.trim();
		const department = document.getElementById('department')?.value.trim();
		const category = document.getElementById('category')?.value;

		// Валидация обязательных полей
		if (!nickname || !password || !rank || !department) {
			UI.showNotification('Заполните все обязательные поля', 'error');
			return false;
		}

		// длина пароля (минимум 6 символов)
		if (password.length < 6) {
			UI.showNotification('Пароль должен содержать не менее 6 символов', 'error');
			
			// Подсвечиваем поле с паролем для наглядности
			const passwordInput = document.getElementById('newPassword');
			passwordInput.style.borderColor = '#dc3545';
			passwordInput.focus();
			
			// Убираем подсветку через 3 секунды
			setTimeout(() => {
				passwordInput.style.borderColor = '';
			}, 3000);
			
			return false;
		}

		// Дополнительные проверки
		if (nickname.length < 3) {
			UI.showNotification('Логин должен содержать не менее 3 символов', 'error');
			return false;
		}

		try {
			// Сохраняем текущую сессию администратора
			const { data: { session: adminSession } } = await supabaseClient.auth.getSession();
			
			if (!adminSession) {
				throw new Error('Сессия администратора не найдена');
			}

			// Показываем индикатор загрузки
			const createBtn = document.getElementById('createUserBtn');
			const originalText = createBtn.textContent;
			createBtn.textContent = '⏳ Создание...';
			createBtn.disabled = true;

			// 1. Создаем пользователя через Edge Function
			const authData = await SupabaseAdmin.createUser({
				email: `${nickname}@app.local`,
				password: password,
				metadata: {
					nickname: nickname,
					rank: rank,
					department: department,
					category: category
				}
			});

			console.log('Пользователь создан в Auth:', authData.user.id);
			
			// 2. Восстанавливаем сессию администратора
			await supabaseClient.auth.setSession({
				access_token: adminSession.access_token,
				refresh_token: adminSession.refresh_token
			});

			// 3. Создаем запись в employees
			const { error: insertError, data: insertData } = await supabaseClient
				.from('employees')
				.insert([{
					nickname: nickname,
					rank: rank,
					department: department,
					category: category,
					auth_user_id: authData.user.id
				}])
				.select();

			if (insertError) {
				console.error('Insert error:', insertError);
				
				// Пытаемся удалить созданного пользователя из Auth, если не удалось создать запись в БД
				try {
					await SupabaseAdmin.deleteUser(authData.user.id);
					await supabaseClient.auth.setSession({
						access_token: adminSession.access_token,
						refresh_token: adminSession.refresh_token
					});
				} catch (cleanupError) {
					console.error('Cleanup error:', cleanupError);
				}
				
				throw new Error(insertError.message);
			}

			console.log('Сотрудник создан:', insertData);
			UI.showNotification('Сотрудник успешно создан', 'success');
			
			// Очищаем форму
			document.getElementById('nickname').value = '';
			document.getElementById('newPassword').value = '';
			document.getElementById('rank').value = '';
			document.getElementById('department').value = '';
			document.getElementById('category').value = 'МС';
			
			// Обновляем списки
			await loadEmployeesList();
			renderEmployeesManagementList();
			renderEmployeesCreateList();
			
			// Возвращаем кнопку в исходное состояние
			createBtn.textContent = originalText;
			createBtn.disabled = false;
			
			return true;
			
		} catch (error) {
			console.error('Create employee error:', error);
			
			// Возвращаем кнопку в исходное состояние
			const createBtn = document.getElementById('createUserBtn');
			if (createBtn) {
				createBtn.textContent = '➕ Создать учётную запись';
				createBtn.disabled = false;
			}
			
			// Показываем локализованное сообщение об ошибке
			ErrorHandler.showError(error, 'Ошибка при создании сотрудника');
			
			// Если ошибка связана с паролем, подсвечиваем поле
			if (error.message && error.message.toLowerCase().includes('password')) {
				const passwordInput = document.getElementById('newPassword');
				passwordInput.style.borderColor = '#dc3545';
				passwordInput.focus();
				
				setTimeout(() => {
					passwordInput.style.borderColor = '';
				}, 3000);
			}
			
			return false;
		}
	}

    // Переключение между вкладками управления
    function switchManagementTab(tab) {
        const manageSection = document.getElementById('manageAccountsSection');
        const createSection = document.getElementById('createAccountSection');
        const manageBtn = document.getElementById('manageTabBtn');
        const createBtn = document.getElementById('createTabBtn');

        if (!manageSection || !createSection || !manageBtn || !createBtn) return;

        if (tab === 'manage') {
            manageSection.classList.remove('hidden');
            createSection.classList.add('hidden');
            
            manageBtn.classList.add('active');
            createBtn.classList.remove('active');
            
            renderEmployeesManagementList();
        } else {
            manageSection.classList.add('hidden');
            createSection.classList.remove('hidden');
            
            createBtn.classList.add('active');
            manageBtn.classList.remove('active');
        }
    }

    // Инициализация панели администратора
    async function initAdminPanel() {
        // Проверяем, что пользователь имеет права (Админ или ВРС)
        if (!Auth.canManageUsers()) {
            UI.showNotification('У вас нет прав для доступа к этому разделу', 'error');
            window.location.hash = 'home';
            return;
        }

        Auth.ping(); // Сбрасываем таймер при входе в админку

        // Загружаем шаблон админки
        const clone = UI.loadTemplate('admin');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);

        // Загружаем список сотрудников
        await loadEmployeesList();

        const title = document.querySelector('#mainApp h2');
        if (title) title.textContent = 'Управление сотрудниками';

        const manageBtn = document.getElementById('manageTabBtn');
        const createBtn = document.getElementById('createTabBtn');
        const manageSection = document.getElementById('manageAccountsSection');
        const createSection = document.getElementById('createAccountSection');

        if (!manageBtn || !createBtn || !manageSection || !createSection) return;

        // Локальная функция для безопасного переключения вкладок
        function switchTab(tab) {
            if (tab === 'manage') {
                manageSection.classList.remove('hidden');
                createSection.classList.add('hidden');
                manageBtn.classList.add('active');
                createBtn.classList.remove('active');
                renderEmployeesManagementList();
            } else {
                manageSection.classList.add('hidden');
                createSection.classList.remove('hidden');
                createBtn.classList.add('active');
                manageBtn.classList.remove('active');
            }
        }

        // Ставим «Управление» по умолчанию
        switchTab('manage');

        // Обработчики для кнопок вкладок
        manageBtn.onclick = () => switchTab('manage');
        createBtn.onclick = () => switchTab('create');

        // Обработчик кнопки создания сотрудника
        document.getElementById('createUserBtn').onclick = createEmployee;

        // Рендер списка создания (для быстрого переключения)
        renderEmployeesCreateList();

        // Подсвечиваем кнопку "Управление" в главной навигации
        UI.setActiveTab(UI.getElements().navAdmin);
    }

    function getEmployeesCache() {
        return employeesCache;
    }

    return {
        initAdminPanel,
        loadEmployeesList,
        getEmployeesCache
    };
})();