const TSU = (function () {
    let tsuCache = [];

    // Типы наводок
    const TSU_TYPES = {
        FINE: 'fine',
        LICENSE: 'license',
        WANTED_PERSON: 'wanted_person',
        WANTED_CAR: 'wanted_car',
        WANTED_CAR_REMOVE: 'wanted_car_remove'
    };

    // Статусы наводок
    const TSU_STATUS = {
        ACTIVE: 'active',
        COMPLETED: 'completed',
        EXPIRED: 'expired'
    };

    // Срок действия в днях
    const EXPIRATION_DAYS = 14;

    // Функция экранирования HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Форматирование даты
    function formatDate(date) {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('ru-RU');
    }

    // Проверка прав на редактирование
    function canEditTSU(tsu) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        // РС, ВРС и Администратор могут редактировать любые
        if (user.category === 'РС' || user.category === 'ВРС' || user.category === 'Администратор') {
            return true;
        }

        // МС могут редактировать только свои
        return tsu.created_by_id === user.auth_user_id;
    }

    // Проверка прав на удаление
    function canDeleteTSU(tsu) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        // ВРС и Администратор могут удалять любые
        if (user.category === 'ВРС' || user.category === 'Администратор') {
            return true;
        }

        // РС и МС могут удалять только свои
        return tsu.created_by_id === user.auth_user_id;
    }

    // Проверка прав на отметку выполнения
    function canCompleteTSU(tsu) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        // Все сотрудники могут отмечать выполнение
        return user.category === 'Администратор' ||
            user.category === 'ВРС' ||
            user.category === 'РС' ||
            user.category === 'МС';
    }

    async function reopenTsu(id) {
        Auth.ping();

        const tsu = tsuCache.find(t => t.id == id);
        if (!tsu) return;

        if (!canCompleteTSU(tsu)) {
            UI.showNotification('У вас нет прав для изменения статуса', 'error');
            return;
        }

        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal-overlay';
        confirmModal.innerHTML = `
			<div class="modal-container" style="max-width: 400px;">
				<div class="modal-header">
					<h3>Подтверждение</h3>
					<button class="modal-close">&times;</button>
				</div>
				<div class="modal-content">
					<p>Вернуть наводку в статус "Активная"?</p>
					<p><strong>Тип:</strong> ${getTypeText(tsu.type)}</p>
					<p><strong>Цель:</strong> ${escapeHtml(tsu.target_nick || tsu.car_plate)}</p>
					<div class="flex-row" style="justify-content: flex-end;">
						<button id="cancelReopenBtn" class="secondary">Отмена</button>
						<button id="confirmReopenBtn" style="background: #ffc107;">🔄 Вернуть в работу</button>
					</div>
				</div>
			</div>
		`;

        document.body.appendChild(confirmModal);

        confirmModal.querySelector('.modal-close').onclick = () => confirmModal.remove();
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) confirmModal.remove();
        };

        document.getElementById('cancelReopenBtn').onclick = () => confirmModal.remove();
        document.getElementById('confirmReopenBtn').onclick = async () => {
            try {
                const { error } = await supabaseClient
                    .from('tsu_orders')
                    .update({
                        status: 'active',
                        completed_at: null,
                        completed_by_id: null,
                        completed_by_name: null
                    })
                    .eq('id', id);

                if (error) {
                    UI.showNotification('Ошибка: ' + error.message, 'error');
                    return;
                }

                Logger.log('tsu_reopen', {
                    tsu_id: tsu.id,
                    type: tsu.type,
                    target: tsu.target_nick || tsu.car_plate,
                    reopened_by: Auth.getCurrentUser()?.nickname
                }, 'tsu', tsu.id);

                UI.showNotification('Наводка возвращена в работу', 'success');
                confirmModal.remove();
                await loadTsuList();
                filterAndRenderTsu();
            } catch (error) {
                UI.showNotification('Ошибка: ' + error.message, 'error');
            }
        };
    }

    // Получение текста типа наводки
    function getTypeText(type) {
        const types = {
            'fine': 'Выписать штраф (/tsu)',
            'license': 'Лишение ВУ (/takecarlic)',
            'wanted_person': 'Подать в розыск (/su)',
            'wanted_car': 'Розыск машины (/addwcar)',
            'wanted_car_remove': 'Снятие розыска с машины (/delwcar)'
        };
        return types[type] || type;
    }

    // Получение текста статуса
    function getStatusText(status) {
        const statuses = {
            'active': 'Активная',
            'completed': 'Выполнена',
            'expired': 'Просрочена'
        };
        return statuses[status] || status;
    }

    // Получение класса для бейджа статуса
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'active': return 'badge-new';
            case 'completed': return 'badge-closed';
            case 'expired': return 'tsu-status-expired';
            default: return '';
        }
    }

    // Генерация команды для копирования
    function generateCommand(tsu) {
        const initiator = tsu.initiator_nick || Auth.getCurrentUser()?.nickname || 'Сотрудник';

        switch (tsu.type) {
            case 'fine':
                return `tsu ${tsu.target_nick} ${tsu.amount || ''} ${tsu.reason} by ${initiator} (УГИБДД)`;
            case 'license':
                return `takecarlic ${tsu.target_nick} ${tsu.days || '0'} ${tsu.reason} by ${initiator} (УГИБДД)`;
            case 'wanted_person':
                return `su ${tsu.target_nick} ${tsu.stars || '1'} ${tsu.reason} by ${initiator} (УГИБДД)`;
            case 'wanted_car':
                return `addwcar ${tsu.car_plate || ''} ${tsu.car_region || ''} ${tsu.reason} by ${initiator} (УГИБДД)`;
            case 'wanted_car_remove':
                return `delwcar ${tsu.car_plate || ''} ${tsu.car_region || ''} by ${initiator}`;
            default:
                return '';
        }
    }

    // Копирование команды в буфер обмена
    async function copyCommand(tsu) {
        const command = generateCommand(tsu);
        try {
            await navigator.clipboard.writeText(command);
            UI.showNotification('Команда скопирована в буфер обмена', 'success');
        } catch (err) {
            UI.showNotification('Ошибка при копировании', 'error');
        }
    }

    // Загрузка списка наводок
    async function loadTsuList() {
        try {
            Auth.ping();

            const { data, error } = await supabaseClient
                .from('tsu_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading tsu:', error);
                UI.showNotification('Ошибка загрузки наводок: ' + error.message, 'error');
                return [];
            }

            tsuCache = data || [];
            return tsuCache;
        } catch (error) {
            console.error('Error in loadTsuList:', error);
            ErrorHandler.showError(error, 'Ошибка загрузки наводок');
            return [];
        }
    }

    // Обновление статусов (проверка на истечение срока)
    async function updateExpiredStatus() {
        const now = new Date().toISOString();
        const expiredList = tsuCache.filter(t =>
            t.status === 'active' && t.expires_at && t.expires_at < now
        );

        for (const tsu of expiredList) {
            await supabaseClient
                .from('tsu_orders')
                .update({ status: 'expired' })
                .eq('id', tsu.id);
        }

        if (expiredList.length > 0) {
            await loadTsuList();
        }
    }

    // Фильтрация списка
    function filterTsuList(search, type, status) {
        return tsuCache.filter(t => {
            if (type && t.type !== type) return false;
            if (status && t.status !== status) return false;
            if (!search) return true;

            const searchLower = search.toLowerCase();
            return (
                t.target_nick?.toLowerCase().includes(searchLower) ||
                t.reason?.toLowerCase().includes(searchLower) ||
                t.initiator_nick?.toLowerCase().includes(searchLower) ||
                t.car_plate?.toLowerCase().includes(searchLower)
            );
        });
    }

    // Отметка наводки как выполненной
    async function completeTsu(id) {
        Auth.ping();

        const tsu = tsuCache.find(t => t.id == id);
        if (!tsu) return;

        if (!canCompleteTSU(tsu)) {
            UI.showNotification('У вас нет прав для отметки выполнения', 'error');
            return;
        }

        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal-overlay';
        confirmModal.innerHTML = `
            <div class="modal-container" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Подтверждение выполнения</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    <p>Вы уверены, что хотите отметить наводку как выполненную?</p>
                    <p><strong>Тип:</strong> ${getTypeText(tsu.type)}</p>
                    <p><strong>Нарушитель:</strong> ${escapeHtml(tsu.target_nick || tsu.car_plate)}</p>
                    <div class="flex-row" style="justify-content: flex-end;">
                        <button id="cancelCompleteBtn" class="secondary">Отмена</button>
                        <button id="confirmCompleteBtn" style="background: #28a745;">✅ Отметить выполненной</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        confirmModal.querySelector('.modal-close').onclick = () => confirmModal.remove();
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) confirmModal.remove();
        };

        document.getElementById('cancelCompleteBtn').onclick = () => confirmModal.remove();
        document.getElementById('confirmCompleteBtn').onclick = async () => {
            try {
                const { error } = await supabaseClient
                    .from('tsu_orders')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        completed_by_id: Auth.getCurrentUser()?.auth_user_id,
                        completed_by_name: Auth.getCurrentUser()?.nickname
                    })
                    .eq('id', id);

                if (error) {
                    UI.showNotification('Ошибка: ' + error.message, 'error');
                    return;
                }

                Logger.log('tsu_complete', {
                    tsu_id: tsu.id,
                    type: tsu.type,
                    target: tsu.target_nick || tsu.car_plate,
                    completed_by: Auth.getCurrentUser()?.nickname
                }, 'tsu', tsu.id);

                UI.showNotification('Наводка отмечена как выполненная', 'success');
                confirmModal.remove();
                await loadTsuList();
                filterAndRenderTsu();
            } catch (error) {
                UI.showNotification('Ошибка: ' + error.message, 'error');
            }
        };
    }

    // Отображение списка наводок
    // Отображение списка наводок
function renderTsuList(filteredList) {
    const container = document.getElementById('tsuList');
    if (!container) return;

    container.innerHTML = '';

    if (!filteredList.length) {
        container.innerHTML = '<div class="list-item" style="justify-content: center; color: #6b7f99;">Нет наводок</div>';
        return;
    }

    // --- СОРТИРОВКА: выполненные вниз, остальные по дате истечения ---
    const sortedList = [...filteredList].sort((a, b) => {
        // 1. Сначала сравниваем по статусу: completed всегда в конце
        if (a.status === 'completed' && b.status !== 'completed') return 1; // a после b
        if (a.status !== 'completed' && b.status === 'completed') return -1; // a перед b
        
        // 2. Если оба completed или оба не completed, сортируем по дате истечения
        const dateA = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const dateB = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return dateA - dateB; // По возрастанию (сначала ближайшие)
    });

    sortedList.forEach(t => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const canEdit = canEditTSU(t);
        const canDelete = canDeleteTSU(t);
        const canComplete = canCompleteTSU(t) && t.status === 'active';

        // Определяем цель для отображения
        let target = t.target_nick || t.car_plate || '—';
        if (t.type === 'wanted_car' || t.type === 'wanted_car_remove') {
            target = `${t.car_plate || '—'} ${t.car_region || ''}`.trim();
        }

        // Дополнительные параметры
        let params = '';
        if (t.type === 'fine' && t.amount) params = ` · Сумма: ${t.amount}`;
        if (t.type === 'license' && t.days !== null && t.days !== undefined) params = ` · Дней: ${t.days}`;
        if (t.type === 'wanted_person' && t.stars) params = ` · Звёзд: ${t.stars}`;

        const statusClass = getStatusBadgeClass(t.status);
        const statusText = getStatusText(t.status);

        div.innerHTML = `
            <div style="flex:1;">
                <div class="item-title">
                    ${getTypeText(t.type)} 
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="item-meta">
                    <strong>Нарушитель: ${escapeHtml(target)}</strong>${params}<br>
                    <small>Причина: ${escapeHtml(t.reason || '—')}</small><br>
                    <small>Инициатор: ${escapeHtml(t.initiator_nick || '—')} · 
                    Создал: ${escapeHtml(t.created_by_name || '—')} · 
                    Срок: до ${formatDate(t.expires_at)}</small>
                </div>
            </div>
            <div class="flex-row" style="gap: 4px; flex-wrap: wrap;">
                <button class="small" data-id="${t.id}" data-action="copy">📋 Копировать</button>
                ${t.status === 'active'
                    ? `<button class="small" style="background:#3498db;" data-id="${t.id}" data-action="complete">✅ Отметить выполненным</button>`
                    : `<button class="small" style="background:#ffc107;" data-id="${t.id}" data-action="reopen">🔄 Вернуть в работу</button>`
                }
                ${canEdit ? `<button class="small" data-id="${t.id}" data-action="edit">✏️</button>` : ''}
                ${canDelete ? `<button class="small secondary" data-id="${t.id}" data-action="delete">🗑️</button>` : ''}
            </div>
        `;
        container.appendChild(div);
    });

    // Обработчики для кнопок
    container.querySelectorAll('button[data-action="copy"]').forEach(btn => {
        btn.onclick = () => {
            const tsu = sortedList.find(t => t.id == btn.dataset.id);
            if (tsu) copyCommand(tsu);
        };
    });

    container.querySelectorAll('button[data-action="complete"]').forEach(btn => {
        btn.onclick = () => completeTsu(btn.dataset.id);
    });

    container.querySelectorAll('button[data-action="reopen"]').forEach(btn => {
        btn.onclick = () => reopenTsu(btn.dataset.id);
    });

    container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
        btn.onclick = () => openTsuForm(btn.dataset.id);
    });

    container.querySelectorAll('button[data-action="delete"]').forEach(btn => {
        btn.onclick = () => deleteTsu(btn.dataset.id);
    });
}
	
    // Фильтрация и отображение списка
    function filterAndRenderTsu() {
        const search = document.getElementById('tsuSearch')?.value.toLowerCase() || '';
        const type = document.getElementById('tsuFilterType')?.value || '';
        const status = document.getElementById('tsuFilterStatus')?.value || '';
        const filtered = filterTsuList(search, type, status);
        renderTsuList(filtered);
    }

    // Удаление наводки
    async function deleteTsu(id) {
        Auth.ping();

        const tsu = tsuCache.find(t => t.id == id);
        if (!tsu) return;

        if (!canDeleteTSU(tsu)) {
            UI.showNotification('У вас нет прав на удаление этой наводки', 'error');
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
                    <p>Вы уверены, что хотите удалить наводку?</p>
                    <p><strong>Тип:</strong> ${getTypeText(tsu.type)}</p>
                    <p><strong>Цель:</strong> ${escapeHtml(tsu.target_nick || tsu.car_plate)}</p>
                    <p style="color: #dc3545;">Это действие необратимо.</p>
                    <div class="flex-row" style="justify-content: flex-end;">
                        <button id="cancelDeleteBtn" class="secondary">Отмена</button>
                        <button id="confirmDeleteBtn" style="background: #dc3545;">Удалить</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        confirmModal.querySelector('.modal-close').onclick = () => confirmModal.remove();
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) confirmModal.remove();
        };

        document.getElementById('cancelDeleteBtn').onclick = () => confirmModal.remove();
        document.getElementById('confirmDeleteBtn').onclick = async () => {
            try {
                Logger.log('tsu_delete', {
                    tsu_id: tsu.id,
                    type: tsu.type,
                    target: tsu.target_nick || tsu.car_plate,
                    deleted_by: Auth.getCurrentUser()?.nickname
                }, 'tsu', tsu.id);

                const { error } = await supabaseClient
                    .from('tsu_orders')
                    .delete()
                    .eq('id', id);

                if (error) {
                    UI.showNotification('Ошибка: ' + error.message, 'error');
                    return;
                }

                UI.showNotification('Наводка удалена', 'success');
                confirmModal.remove();
                await loadTsuList();
                filterAndRenderTsu();
            } catch (error) {
                UI.showNotification('Ошибка: ' + error.message, 'error');
            }
        };
    }

    // Открытие формы создания/редактирования
    async function openTsuForm(id = null) {
        Auth.ping();

        const user = Auth.getCurrentUser();
        let tsu = null;

        if (id) {
            tsu = tsuCache.find(t => t.id == id);
            if (!tsu) return;

            if (!canEditTSU(tsu)) {
                UI.showNotification('У вас нет прав на редактирование этой наводки', 'error');
                return;
            }
        }

        const clone = UI.loadTemplate('tsuForm');
        if (!clone) {
            UI.showNotification('Ошибка загрузки шаблона', 'error');
            return;
        }

        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);

        // Устанавливаем заголовок
        const title = document.getElementById('tsuFormTitle');
        if (title) {
            title.textContent = tsu ? `Редактирование наводки` : `Новая наводка`;
        }

        // Рассчитываем дату истечения (текущая + 14 дней)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);
        document.getElementById('tsu_expires_at').value = expiresAt.toISOString().split('T')[0];

        const defaultExpiresAt = new Date();
        defaultExpiresAt.setDate(defaultExpiresAt.getDate() + EXPIRATION_DAYS);

        // Если редактируем существующую наводку, используем её дату, иначе дефолтную
        if (tsu && tsu.expires_at) {
            document.getElementById('tsu_expires_at').value = tsu.expires_at.split('T')[0];
        } else {
            document.getElementById('tsu_expires_at').value = defaultExpiresAt.toISOString().split('T')[0];
        }

        // Если редактируем, заполняем поля
        if (tsu) {
            document.getElementById('tsu_type').value = tsu.type || '';
            document.getElementById('tsu_target_nick').value = tsu.target_nick || '';
            document.getElementById('tsu_amount').value = tsu.amount || '';
            document.getElementById('tsu_days').value = tsu.days || '';
            document.getElementById('tsu_stars').value = tsu.stars || '';
            document.getElementById('tsu_car_plate').value = tsu.car_plate || '';
            document.getElementById('tsu_car_region').value = tsu.car_region || '';
            document.getElementById('tsu_reason').value = tsu.reason || '';
            document.getElementById('tsu_initiator_nick').value = tsu.initiator_nick || '';
            document.getElementById('tsu_expires_at').value = tsu.expires_at ? tsu.expires_at.split('T')[0] : expiresAt.toISOString().split('T')[0];
        }

        // Функция обновления видимости полей в зависимости от типа
        function updateFieldsVisibility() {
            const type = document.getElementById('tsu_type').value;

            document.getElementById('tsu_amount_field').style.display = 'none';
            document.getElementById('tsu_days_field').style.display = 'none';
            document.getElementById('tsu_stars_field').style.display = 'none';
            document.getElementById('tsu_plate_field').style.display = 'none';
            document.getElementById('tsu_region_field').style.display = 'none';

            if (type === 'fine') {
                document.getElementById('tsu_amount_field').style.display = 'block';
            } else if (type === 'license') {
                document.getElementById('tsu_days_field').style.display = 'block';
            } else if (type === 'wanted_person') {
                document.getElementById('tsu_stars_field').style.display = 'block';
            } else if (type === 'wanted_car' || type === 'wanted_car_remove') {
                document.getElementById('tsu_plate_field').style.display = 'block';
                document.getElementById('tsu_region_field').style.display = 'block';
            }
        }

        document.getElementById('tsu_type').addEventListener('change', updateFieldsVisibility);
        updateFieldsVisibility();

        // Обработчик формы
        document.getElementById('tsuForm').onsubmit = async (e) => {
            e.preventDefault();

            const type = document.getElementById('tsu_type').value;
            const targetNick = document.getElementById('tsu_target_nick').value.trim();
            const reason = document.getElementById('tsu_reason').value.trim();
            const initiatorNick = document.getElementById('tsu_initiator_nick').value.trim();
            const expiresAt = document.getElementById('tsu_expires_at').value;

            if (!type || !reason || !initiatorNick) {
                UI.showNotification('Заполните все обязательные поля', 'error');
                return;
            }

            // Валидация в зависимости от типа
            if (type === 'fine') {
                const amount = document.getElementById('tsu_amount').value;
                if (!amount || amount <= 0) {
                    UI.showNotification('Введите корректную сумму штрафа', 'error');
                    return;
                }
            } else if (type === 'license') {
                const days = document.getElementById('tsu_days').value;
                if (days === '' || days < 0 || days > 4) {
                    UI.showNotification('Введите количество дней от 0 до 4', 'error');
                    return;
                }
            } else if (type === 'wanted_person') {
                const stars = document.getElementById('tsu_stars').value;
                if (!stars || stars < 1 || stars > 6) {
                    UI.showNotification('Введите количество звёзд от 1 до 6', 'error');
                    return;
                }
            } else if (type === 'wanted_car' || type === 'wanted_car_remove') {
                const plate = document.getElementById('tsu_car_plate').value.trim();
                const region = document.getElementById('tsu_car_region').value.trim();
                if (!plate) {
                    UI.showNotification('Введите госномер', 'error');
                    return;
                }
                if (!region || region.length !== 2 || !/^\d+$/.test(region)) {
                    UI.showNotification('Введите корректный регион (2 цифры)', 'error');
                    return;
                }
            }

            const formData = {
                type: type,
                target_nick: targetNick || null,
                amount: type === 'fine' ? parseInt(document.getElementById('tsu_amount').value) : null,
                days: type === 'license' ? parseInt(document.getElementById('tsu_days').value) : null,
                stars: type === 'wanted_person' ? parseInt(document.getElementById('tsu_stars').value) : null,
                car_plate: (type === 'wanted_car' || type === 'wanted_car_remove') ? document.getElementById('tsu_car_plate').value.trim() : null,
                car_region: (type === 'wanted_car' || type === 'wanted_car_remove') ? document.getElementById('tsu_car_region').value.trim() : null,
                reason: reason,
                initiator_nick: initiatorNick,
                expires_at: expiresAt,
                status: 'active'
            };

            const saveBtn = document.getElementById('tsuFormSubmit');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '⏳ Сохранение...';
            saveBtn.disabled = true;

            try {
                let error;
                if (tsu) {
                    // Обновление
                    const { error: updateError } = await supabaseClient
                        .from('tsu_orders')
                        .update(formData)
                        .eq('id', tsu.id);
                    error = updateError;

                    if (!error) {
                        Logger.log('tsu_update', {
                            tsu_id: tsu.id,
                            type: type,
                            target: targetNick || formData.car_plate,
                            updated_by: user.nickname
                        }, 'tsu', tsu.id);
                    }
                } else {
                    // Создание
                    const { error: insertError } = await supabaseClient
                        .from('tsu_orders')
                        .insert([{
                            ...formData,
                            created_by_id: user.auth_user_id,
                            created_by_name: user.nickname
                        }]);
                    error = insertError;

                    if (!error) {
                        Logger.log('tsu_create', {
                            type: type,
                            target: targetNick || formData.car_plate,
                            reason: reason,
                            created_by: user.nickname
                        }, 'tsu', null);
                    }
                }

                if (error) {
                    console.error('Save error:', error);
                    UI.showNotification('Ошибка: ' + error.message, 'error');
                    return;
                }

                UI.showNotification(tsu ? 'Наводка обновлена' : 'Наводка создана', 'success');
                await loadTsuList();
                initTsuList();
            } catch (error) {
                console.error('Error saving tsu:', error);
                UI.showNotification('Ошибка при сохранении', 'error');
            } finally {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }
        };

        document.getElementById('tsuFormCancel').onclick = () => {
            initTsuList();
        };
    }

    // Инициализация списка наводок
    async function initTsuList() {
        try {
            Auth.ping();

            const clone = UI.loadTemplate('tsuList');
            if (!clone) {
                console.error('TSU template not found');
                UI.showNotification('Ошибка загрузки шаблона', 'error');
                return;
            }

            UI.clearMain();
            document.getElementById('mainApp').appendChild(clone);

            // Устанавливаем активную вкладку
            const elements = UI.getElements();
            if (elements.navTsu) {
                UI.setActiveTab(elements.navTsu);
            }

            await loadTsuList();
            await updateExpiredStatus();
            filterAndRenderTsu();

            const searchInput = document.getElementById('tsuSearch');
            const filterType = document.getElementById('tsuFilterType');
            const filterStatus = document.getElementById('tsuFilterStatus');
            const createBtn = document.getElementById('tsuCreateOpen');

            if (searchInput) {
                searchInput.addEventListener('input', filterAndRenderTsu);
            }

            if (filterType) {
                filterType.addEventListener('change', filterAndRenderTsu);
            }

            if (filterStatus) {
                filterStatus.addEventListener('change', filterAndRenderTsu);
            }

            if (createBtn) {
                createBtn.onclick = () => openTsuForm();
            }

        } catch (error) {
            console.error('Error in initTsuList:', error);
            UI.showNotification('Ошибка при загрузке раздела наводок', 'error');
        }
    }

    return {
        initTsuList,
        loadTsuList,
        canEditTSU: canEditTSU,
        canDeleteTSU: canDeleteTSU,
        canCompleteTSU: canCompleteTSU,
        generateCommand,
        copyCommand,
        reopenTsu,
        TSU_TYPES,
        TSU_STATUS,
        EXPIRATION_DAYS
    };
})();

window.TSU = TSU;