// Главный модуль приложения
const App = (function () {
    const elements = UI.getElements();

    // Функция экранирования HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Инициализация приложения
    function init() {
        // Проверка сессии сотрудника
        const user = Auth.restoreSession();

        if (user && !Auth.isGuest()) {
            UI.showEmployeeMode(user);
            handleRouting();
        } else {
            UI.showAuthMode();
            // Добавляем очистку хэша при возврате на экран авторизации
            if (window.location.hash) {
                window.location.hash = '';
            }
        }

        // Привязка обработчиков
        bindEvents();

        // Слушаем изменения hash
        window.addEventListener('hashchange', handleRouting);
    }

    // Обработка роутинга
    function handleRouting() {
        Auth.ping(); // Сбрасываем таймер при смене страницы

        if (UI.getCurrentMode() === 'auth') {
            window.location.hash = '';
            return;
        }

        const hash = window.location.hash.slice(1) || 'home';

        if (UI.getCurrentMode() === 'guest') {
            handleGuestRouting(hash);
        } else if (UI.getCurrentMode() === 'employee') {
            handleEmployeeRouting(hash);
        }
    }

    // Маршрутизация для гостей
    function handleGuestRouting(hash) {
        switch (hash) {
            case 'home':
                showGuestHome();
                break;
            case 'appeals':
                showGuestAppeals();
                break;
            case 'driver-license':
                if (window.DriverLicense) {
                    DriverLicense.initDriverLicensePage();
                } else {
                    UI.showNotification('Модуль не загружен', 'error');
                    window.location.hash = 'home';
                }
                break;
            case 'info':
                showGuestInfo();
                break;
            default:
                window.location.hash = 'home';
        }
    }

    // Маршрутизация для сотрудников
    function handleEmployeeRouting(hash) {
        switch (hash) {
            case 'home':
                showHome();
                break;
            case 'profile':
                showProfile();
                break;
            case 'kusp':
                KUSP.initKuspList();
                break;
            case 'protocols':
                Protocol.initProtocolsList();
                break;
            case 'tsu':
                if (window.TSU) {
                    TSU.initTsuList();
                } else {
                    UI.showNotification('Модуль не загружен', 'error');
                    window.location.hash = 'home';
                }
                break;
            case 'admin':
                if (Auth.canManageUsers()) {
                    Admin.initAdminPanel();
                } else {
                    UI.showNotification('Доступ запрещен', 'error');
                    window.location.hash = 'home';
                }
                break;
            default:
                window.location.hash = 'home';
        }
    }

    // Привязка событий
    function bindEvents() {
        // Обработчики авторизации
        elements.loginBtn.onclick = handleLogin;

        // Обработчики для сотрудников
        elements.navLogout.onclick = handleLogout;

        elements.navHome.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'home';
        };

        elements.navProfile.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'profile';
        };

        elements.navKusp.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'kusp';
        };

        elements.navProtocols.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'protocols';
        };

        elements.navTsu.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'tsu';
        };

        elements.navAdmin.onclick = (e) => {
            e.preventDefault();
            if (Auth.canManageUsers()) {
                window.location.hash = 'admin';
            } else {
                UI.showNotification('Доступ запрещен', 'warning');
            }
        };

        // Обработчики для гостей
        elements.guestNavHome.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'home';
        };

        elements.guestNavAppeals.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'appeals';
        };

        if (elements.guestNavDriverLicense) {
            elements.guestNavDriverLicense.onclick = (e) => {
                e.preventDefault();
                window.location.hash = 'driver-license';
            };
        }

        elements.guestNavInfo.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'info';
        };

        elements.guestNavToEmployee.onclick = (e) => {
            e.preventDefault();
            handleGuestLogout();
        };

        // Обработчик для гостевого доступа
        document.getElementById('guestAccessBtn').onclick = handleGuestAccess;
    }

    // Обработка входа для сотрудников
    async function handleLogin() {
        const login = elements.loginInput.value.trim();
        const pass = elements.passwordInput.value.trim();

        if (!login || !pass) {
            UI.showNotification('Введите логин и пароль', 'warning');
            return;
        }

        try {
            const user = await Auth.login(login, pass);
            UI.showEmployeeMode(user);
            window.location.hash = 'home';
            UI.showNotification('Добро пожаловать, ' + user.nickname, 'success');
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    }

    // Обработка гостевого доступа
    function handleGuestAccess() {
        const guestUser = Auth.startGuestSession();
        UI.showGuestMode();
        window.location.hash = 'home';
    }

    // Выход из гостевого режима
    function handleGuestLogout() {
        Auth.logout();
        UI.showAuthMode();
        window.location.hash = '';
    }

    // Выход из режима сотрудника
    function handleLogout() {
        Auth.logout();
        UI.showAuthMode();
        elements.loginInput.value = '';
        elements.passwordInput.value = '';
        window.location.hash = '';
    }

    // Показать главную для сотрудников
    async function showHome() {

        const clone = UI.loadTemplate('home');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);

        const user = Auth.getCurrentUser();
        document.getElementById('greetingMessage').innerText = `👤 ${user.nickname} (${user.rank})`;

        // СРАЗУ устанавливаем активную вкладку
        UI.setActiveTab(elements.navHome);

        // Показываем спиннеры
        const todaySpan = document.getElementById('statsTodayCount');
        const monthSpan = document.getElementById('statsMonthCount');

        if (todaySpan) todaySpan.innerHTML = '<span class="loading-spinner-small"></span>';
        if (monthSpan) monthSpan.innerHTML = '<span class="loading-spinner-small"></span>';

        // Обновляем название месяца
        const monthLabel = document.getElementById('statsMonthLabel');
        if (monthLabel) {
            const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
                'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
            monthLabel.textContent = months[new Date().getMonth()];
        }

        try {
            await Protocol.loadProtocolsList();
            Protocol.updateDashboardStats();

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            if (todaySpan) todaySpan.textContent = 'Ошибка';
            if (monthSpan) monthSpan.textContent = 'Ошибка';
        }
    }

    // Показать профиль для сотрудников
    function showProfile() {
		const clone = UI.loadTemplate('profile');
		UI.clearMain();
		document.getElementById('mainApp').appendChild(clone);

		const user = Auth.getCurrentUser();
		
		// Заполняем данные пользователя
		document.getElementById('profileNickname').textContent = user.nickname;
		document.getElementById('profileRank').textContent = user.rank;
		document.getElementById('profileDepartment').textContent = user.department;
		document.getElementById('profileCategory').textContent = user.category;
		document.getElementById('profilePosition').textContent = user.position || 'Не указано';
		document.getElementById('profileFullName').textContent = user.fullname || 'Не указано';
		
		// Отображаем подпись если есть
		const signaturePreview = document.getElementById('profileSignaturePreview');
		if (user.signature_data) {
			signaturePreview.innerHTML = `<img src="${escapeHtml(user.signature_data)}" style="max-width: 100%; max-height: 80px;">`;
		} else {
			signaturePreview.innerHTML = '<span style="color: #6b7f99;">Подпись не добавлена</span>';
		}
		
		// Переключаемся в режим просмотра
		document.getElementById('profileViewMode').style.display = 'block';
		document.getElementById('profileEditMode').style.display = 'none';
		
		// Обработчик кнопки редактирования
		document.getElementById('editProfileBtn').onclick = () => {
			showProfileEditMode(user);
		};
		
		UI.setActiveTab(elements.navProfile);
	}

	// Режим редактирования профиля
	function showProfileEditMode(user) {
		document.getElementById('profileViewMode').style.display = 'none';
		document.getElementById('profileEditMode').style.display = 'block';
		
		// Заполняем форму
		document.getElementById('edit_position').value = user.position || '';
		document.getElementById('edit_fullname').value = user.fullname || '';
		document.getElementById('profile_signature_data').value = user.signature_data || '';
		
		// Инициализируем подпись
		initProfileSignatureCanvas(user.signature_data);
		
		// Обработчик отмены
		document.getElementById('cancelProfileEditBtn').onclick = () => {
			showProfile(); // Возвращаемся в режим просмотра
		};
		
		// Обработчик сохранения
		document.getElementById('profileEditForm').onsubmit = async (e) => {
			e.preventDefault();
			await saveProfileData(user);
		};
	}

	// Инициализация canvas для подписи в профиле
	function initProfileSignatureCanvas(existingSignature = null) {
		const canvas = document.getElementById('profileSignatureCanvas');
		const previewCanvas = document.getElementById('profileSignaturePreviewCanvas');
		const noSignatureMessage = document.getElementById('profileNoSignatureMessage');
		const signatureDataInput = document.getElementById('profile_signature_data');
		
		// Настройка вкладок
		const drawTab = document.getElementById('signatureDrawTabBtn');
		const uploadTab = document.getElementById('signatureUploadTabBtn');
		const drawMode = document.getElementById('signatureDrawMode');
		const uploadMode = document.getElementById('signatureUploadMode');
		
		// Переключение на вкладку рисования
		drawTab.onclick = () => {
			drawTab.classList.add('active');
			uploadTab.classList.remove('active');
			drawMode.style.display = 'block';
			uploadMode.style.display = 'none';
		};
		
		// Переключение на вкладку загрузки
		uploadTab.onclick = () => {
			uploadTab.classList.add('active');
			drawTab.classList.remove('active');
			uploadMode.style.display = 'block';
			drawMode.style.display = 'none';
		};

		if (!canvas) return;

		let isDrawing = false;
		let lastX = 0;
		let lastY = 0;

		const ctx = canvas.getContext('2d');
		ctx.strokeStyle = '#002b59';
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		function updatePreview() {
			const signatureData = canvas.toDataURL('image/png');
			signatureDataInput.value = signatureData;

			if (previewCanvas) {
				previewCanvas.width = 200;
				previewCanvas.height = 80;
				const previewCtx = previewCanvas.getContext('2d');
				previewCtx.clearRect(0, 0, 200, 80);
				previewCtx.drawImage(canvas, 0, 0, 200, 80);
				previewCanvas.style.display = 'block';
				if (noSignatureMessage) noSignatureMessage.style.display = 'none';
			}
		}

		function draw(e) {
			if (!isDrawing) return;
			e.preventDefault();

			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;

			const x = (e.clientX - rect.left) * scaleX;
			const y = (e.clientY - rect.top) * scaleY;

			ctx.beginPath();
			ctx.moveTo(lastX, lastY);
			ctx.lineTo(x, y);
			ctx.stroke();

			lastX = x;
			lastY = y;
		}

		canvas.addEventListener('mousedown', (e) => {
			isDrawing = true;
			const rect = canvas.getBoundingClientRect();
			lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
			lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
		});

		canvas.addEventListener('mousemove', draw);
		canvas.addEventListener('mouseup', () => {
			isDrawing = false;
			updatePreview();
		});
		canvas.addEventListener('mouseleave', () => {
			isDrawing = false;
		});

		// Загрузка существующей подписи
		if (existingSignature) {
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				updatePreview();
				
				// Также показываем в режиме загрузки
				const uploadedPreview = document.getElementById('uploadedSignaturePreview');
				const uploadMessage = document.getElementById('uploadNoSignatureMessage');
				if (uploadedPreview) {
					uploadedPreview.src = existingSignature;
					uploadedPreview.style.display = 'block';
					if (uploadMessage) uploadMessage.style.display = 'none';
				}
			};
			img.src = existingSignature;
		}

		// Обработчик очистки
		const clearBtn = document.getElementById('clearProfileSignatureBtn');
		if (clearBtn) {
			clearBtn.addEventListener('click', () => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				updatePreview();
				if (noSignatureMessage) noSignatureMessage.style.display = 'block';
				if (previewCanvas) previewCanvas.style.display = 'none';
				
				// Также очищаем загруженную подпись
				const uploadedPreview = document.getElementById('uploadedSignaturePreview');
				const uploadMessage = document.getElementById('uploadNoSignatureMessage');
				if (uploadedPreview) {
					uploadedPreview.style.display = 'none';
					uploadedPreview.src = '';
					if (uploadMessage) uploadMessage.style.display = 'block';
				}
				signatureDataInput.value = '';
			});
		}
		
		// Обработчик загрузки файла
		const selectFileBtn = document.getElementById('selectFileBtn');
		const fileInput = document.getElementById('signatureFileInput');
		const uploadedPreview = document.getElementById('uploadedSignaturePreview');
		const uploadMessage = document.getElementById('uploadNoSignatureMessage');
		const fileNameDisplay = document.getElementById('selectedFileName');
		
		if (selectFileBtn && fileInput) {
			selectFileBtn.onclick = () => {
				fileInput.click();
			};
			
			fileInput.onchange = (e) => {
				const file = e.target.files[0];
				if (!file) return;
				
				// Проверяем, что это PNG
				if (!file.type.match('image/png')) {
					UI.showNotification('Пожалуйста, выберите PNG файл', 'error');
					return;
				}
				
				// Проверяем размер файла (макс 1 МБ)
				if (file.size > 1024 * 1024) {
					UI.showNotification('Файл слишком большой (максимум 1 МБ)', 'error');
					return;
				}
				
				fileNameDisplay.textContent = `Выбран: ${file.name}`;
				
				const reader = new FileReader();
				reader.onload = (event) => {
					const img = new Image();
					img.onload = () => {
						// Очищаем canvas
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						
						// Рисуем изображение с сохранением пропорций
						const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
						const x = (canvas.width - img.width * scale) / 2;
						const y = (canvas.height - img.height * scale) / 2;
						
						ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
						
						// Обновляем предпросмотр
						updatePreview();
						
						// Показываем в режиме загрузки
						uploadedPreview.src = event.target.result;
						uploadedPreview.style.display = 'block';
						uploadMessage.style.display = 'none';
						
						UI.showNotification('Подпись загружена', 'success');
					};
					img.src = event.target.result;
				};
				reader.readAsDataURL(file);
			};
		}
	}

	// Сохранение данных профиля
	async function saveProfileData(user) {
		const position = document.getElementById('edit_position').value.trim();
		const fullname = document.getElementById('edit_fullname').value.trim();
		const signatureData = document.getElementById('profile_signature_data').value;

		// Валидация
		if (!fullname) {
			UI.showNotification('Заполните фамилию и инициалы', 'error');
			document.getElementById('edit_fullname').focus();
			return;
		}

		try {
			// ИСПРАВЛЕНИЕ: Не используем админский клиент для обычного пользователя
			// Просто обновляем данные в таблице employees
			const { error: dbError } = await supabaseClient
				.from('employees')
				.update({
					position: position,
					fullname: fullname,
					signature_data: signatureData
				})
				.eq('id', user.id);

			if (dbError) {
				throw new Error('Ошибка при обновлении данных: ' + dbError.message);
			}

			// Обновляем текущего пользователя в сессии
			user.position = position;
			user.fullname = fullname;
			user.signature_data = signatureData;
			
			// Обновляем localStorage
			localStorage.setItem('user', JSON.stringify(user));

			UI.showNotification('Профиль успешно обновлен', 'success');
			
			// Возвращаемся в режим просмотра
			showProfile();

		} catch (error) {
			console.error('Profile update error:', error);
			ErrorHandler.showError(error, 'Ошибка при сохранении профиля');
		}
	}
	
    // Гостевые страницы
    function showGuestHome() {
        const clone = UI.loadTemplate('guestHome');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);
        UI.setActiveTab(elements.guestNavHome);
    }

    // Поиск дела по номеру талона для гостей
    async function findKuspByTicketNumber(ticketNumber) {
        try {
            // Ищем запись в КУСП по номеру талона
            const { data, error } = await supabaseClient
                .from('kusps')
                .select(`
					kusp_number,
					ticket_number,
					received_datetime,
					received_by_name,
					reporter_name,
					short_content,
					status,
					review_result,
					notes,
					created_at,
					updated_at
				`)
                .eq('ticket_number', ticketNumber)
                .maybeSingle();

            if (error) {
                console.error('Error finding kusp:', error);
                return { error: 'Ошибка при поиске дела' };
            }

            if (!data) {
                return { error: 'Дело с таким номером не найдено' };
            }

            return { data };
        } catch (error) {
            console.error('Error in findKuspByTicketNumber:', error);
            return { error: 'Ошибка при поиске дела' };
        }
    }

    // Показать информацию о деле для гостя
    function showKuspInfoForGuest(kusp) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'kuspGuestInfoModal';

        // Определяем статус дела
        let statusText = '';
        let statusClass = '';
        switch (kusp.status) {
            case 'new':
                statusText = 'Зарегистрировано';
                statusClass = 'badge-new';
                break;
            case 'in_progress':
                statusText = 'В работе';
                statusClass = 'badge-progress';
                break;
            case 'under_review':
                statusText = 'На проверке';
                statusClass = 'badge-progress';
                break;
            case 'closed':
                statusText = 'Рассмотрено';
                statusClass = 'badge-closed';
                break;
            default:
                statusText = kusp.status || 'Не определено';
        }

        // Результат рассмотрения
        let resultText = '';
        switch (kusp.review_result) {
            case 'возбуждено_уголовное':
                resultText = 'Возбуждено уголовное дело';
                break;
            case 'отказ_в_возбуждении':
                resultText = 'Отказано в возбуждении уголовного дела';
                break;
            case 'административное':
                resultText = 'Административное правонарушение';
                break;
            case 'передано_по_подследственности':
                resultText = 'Передано по подследственности';
                break;
            case 'приобщено_к_другому':
                resultText = 'Приобщено к другому делу';
                break;
            default:
                resultText = 'На рассмотрении';
        }

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Информация по обращению</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    <div style="background: #f5f9ff; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4 style="margin:0; color: #1e3a5f;">Талон-уведомление № ${escapeHtml(kusp.ticket_number)}</h4>
                            <span class="badge ${statusClass}">${statusText}</span>
                        </div>
                        
                        <div style="border-bottom: 2px solid #dbe4ee; margin: 15px 0;"></div>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f; width: 40%;"><strong>Дата регистрации:</strong></td>
                                <td style="padding: 8px 0;">${UI.formatDate(kusp.received_datetime)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Принял:</strong></td>
                                <td style="padding: 8px 0;">${escapeHtml(kusp.received_by_name || '—')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Заявитель:</strong></td>
                                <td style="padding: 8px 0;">${escapeHtml(kusp.reporter_name || '—')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Содержание:</strong></td>
                                <td style="padding: 8px 0;">${escapeHtml(kusp.short_content || '—')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Статус рассмотрения:</strong></td>
                                <td style="padding: 8px 0;">${statusText}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Результат:</strong></td>
                                <td style="padding: 8px 0;">${resultText}</td>
                            </tr>
                            ${kusp.notes ? `
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Дополнительно:</strong></td>
                                <td style="padding: 8px 0;">${escapeHtml(kusp.notes)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 8px 0; color: #4a6f8f;"><strong>Дата обновления:</strong></td>
                                <td style="padding: 8px 0;">${UI.formatDate(kusp.updated_at || kusp.created_at)}</td>
                            </tr>
                        </table>
                        
                        <div style="border-top: 2px solid #dbe4ee; margin: 15px 0; padding-top: 15px;">
                            <p style="font-size: 0.9rem; color: #6c757d;">
                                Для получения более подробной информации обратитесь в дежурную часть УГИБДД.
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex-row" style="justify-content: flex-end;">
                        <button id="closeKuspInfoBtn" class="secondary">Закрыть</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        document.getElementById('closeKuspInfoBtn').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    function showGuestAppeals() {
        const clone = UI.loadTemplate('guestAppeals');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);

        document.getElementById('findAppealBtn').onclick = async () => {
            const number = document.getElementById('appealNumber').value.trim();
            if (!number) {
                UI.showNotification('Введите номер талона-уведомления', 'warning');
                return;
            }

            // Показываем индикатор загрузки
            const btn = document.getElementById('findAppealBtn');
            const originalText = btn.textContent;
            btn.textContent = '⏳ Поиск...';
            btn.disabled = true;

            try {
                const result = await findKuspByTicketNumber(number);

                if (result.error) {
                    UI.showNotification(result.error, 'error');
                    document.getElementById('appealResult').innerHTML = `
                        <div style="background: #fff0f0; padding: 15px; border-radius: 8px; color: #dc3545;">
                            ${result.error}
                        </div>
                    `;
                } else {
                    showKuspInfoForGuest(result.data);
                    document.getElementById('appealResult').innerHTML = `
                        <div style="background: #e8f4e8; padding: 15px; border-radius: 8px; color: #28a745;">
                            ✓ Дело найдено. Информация отображена в окне.
                        </div>
                    `;
                }
            } catch (error) {
                UI.showNotification('Ошибка при поиске', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        };

        UI.setActiveTab(elements.guestNavAppeals);
    }

    function showGuestInfo() {
        const clone = UI.loadTemplate('guestInfo');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);
        UI.setActiveTab(elements.guestNavInfo);
    }

    return {
        init
    };
})();

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => App.init());
