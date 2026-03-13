// Модуль Протоколы
const Protocol = (function () {
    let protocolsCache = [];

    // Статусы протоколов
    const PROTOCOL_STATUS = {
        ACTIVE: 'active',
        ARCHIVED: 'archived',
    };

    // Хранилище для множественных нарушений при создании протоколов
    let multipleOffensesList = [];

    function getMonthGenitive(monthIndex) {
        const monthsGenitive = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        return monthsGenitive[monthIndex] || '';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Функция для получения текущей даты и времени в МСК (UTC+3)
    function getCurrentMskDateTime() {
        const now = new Date();
        const localOffset = now.getTimezoneOffset();
        const mskOffset = -180;
        const diffMinutes = mskOffset - localOffset;
        const mskDate = new Date(now.getTime() + diffMinutes * 60000);
        return mskDate;
    }

    function getCurrentMskDate() {
        const mskDate = getCurrentMskDateTime();
        const year = mskDate.getFullYear();
        const month = String(mskDate.getMonth() + 1).padStart(2, '0');
        const day = String(mskDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getCurrentMskTime() {
        const mskDate = getCurrentMskDateTime();
        const hours = String(mskDate.getHours()).padStart(2, '0');
        const minutes = String(mskDate.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function getCurrentMskDateTimeLocal() {
        return `${getCurrentMskDate()}T${getCurrentMskTime()}`;
    }

    // Функция для обновления счетчика нарушений и кнопки сохранения
    function updateOffensesCounter() {
        const counter = document.getElementById('offensesCounter');
        const saveBtn = document.getElementById('saveProtocolBtn');

        if (counter) {
            counter.textContent = multipleOffensesList.length;
        }

        if (saveBtn && document.getElementById('protocolModal')) {
            const mode = document.getElementById('protocolModal')?.dataset?.mode;

            if (mode === 'create') {
                if (multipleOffensesList.length === 0) {
                    saveBtn.textContent = '➕ Создать протокол (нет нарушений)';
                    saveBtn.disabled = true;
                } else {
                    saveBtn.textContent = `📋 Создать ${multipleOffensesList.length} протокол${multipleOffensesList.length > 1 ? 'ов' : ''}`;
                    saveBtn.disabled = false;
                }
            }
        }
    }

    // Функция для отображения списка добавленных нарушений
    function renderOffensesList() {
        const container = document.getElementById('offensesListContainer');
        if (!container) return;

        if (multipleOffensesList.length === 0) {
            container.innerHTML = '<div style="padding: 12px; background: #f0f5ff; border-radius: 8px; color: #6b7f99; text-align: center;">Нарушения не добавлены</div>';
        } else {
            let html = '';
            multipleOffensesList.forEach((offense, index) => {
                html += `
                    <div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 4px solid #1e3a5f; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">
                                Нарушение #${index + 1}: п. ${escapeHtml(offense.offense_violation_point || '')}
                            </div>
                            <div style="font-size: 0.9rem; color: #4a6f8f;">
                                ст. ${escapeHtml(offense.offense_article_number || '')} ч. ${escapeHtml(offense.offense_article_part || '')} · 
                                ${escapeHtml(offense.offense_description || '').substring(0, 50)}${offense.offense_description && offense.offense_description.length > 50 ? '...' : ''}
                            </div>
                            ${offense.offense_special_equipment ? `
                                <div style="font-size: 0.8rem; color: #28a745; margin-top: 4px;">
                                    🔧 ${escapeHtml(offense.offense_special_equipment)}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; margin-left: 12px;">
                            <button type="button" class="small" onclick="Protocol.editOffense(${index})" style="padding: 4px 8px;">✏️</button>
                            <button type="button" class="small secondary" onclick="Protocol.removeOffense(${index})" style="padding: 4px 8px;">🗑️</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
        updateOffensesCounter();
    }

    // Функция для добавления нарушения в список
    function addOffenseToList() {
        const violationPoint = document.getElementById('offense_violation_point')?.value?.trim();
        const description = document.getElementById('offense_description')?.value?.trim();
        const specialEquipment = document.getElementById('offense_special_equipment')?.value?.trim();
        const articleNumber = document.getElementById('offense_article_number')?.value?.trim();
        const articlePart = document.getElementById('offense_article_part')?.value?.trim();

        if (!violationPoint) {
            UI.showNotification('Заполните пункт нормативного акта', 'warning');
            document.getElementById('offense_violation_point')?.focus();
            return false;
        }

        if (!description) {
            UI.showNotification('Заполните описание правонарушения', 'warning');
            document.getElementById('offense_description')?.focus();
            return false;
        }

        if (!articleNumber) {
            UI.showNotification('Заполните статью КоАП', 'warning');
            document.getElementById('offense_article_number')?.focus();
            return false;
        }

        if (!articlePart) {
            UI.showNotification('Заполните часть статьи', 'warning');
            document.getElementById('offense_article_part')?.focus();
            return false;
        }

        const offense = {
            offense_violation_point: violationPoint,
            offense_description: description,
            offense_special_equipment: specialEquipment || null,
            offense_article_number: articleNumber,
            offense_article_part: articlePart
        };

        multipleOffensesList.push(offense);

        document.getElementById('offense_violation_point').value = '';
        document.getElementById('offense_description').value = '';
        document.getElementById('offense_special_equipment').value = '';
        document.getElementById('offense_article_number').value = '';
        document.getElementById('offense_article_part').value = '';

        renderOffensesList();
        UI.showNotification('Нарушение добавлено в список', 'success');
        return true;
    }

    function editOffense(index) {
        if (index < 0 || index >= multipleOffensesList.length) return;

        const offense = multipleOffensesList[index];

        document.getElementById('offense_violation_point').value = offense.offense_violation_point || '';
        document.getElementById('offense_description').value = offense.offense_description || '';
        document.getElementById('offense_special_equipment').value = offense.offense_special_equipment || '';
        document.getElementById('offense_article_number').value = offense.offense_article_number || '';
        document.getElementById('offense_article_part').value = offense.offense_article_part || '';

        multipleOffensesList.splice(index, 1);
        renderOffensesList();

        const tabs = document.querySelectorAll('.tab-content');
        const stepIndicators = document.querySelectorAll('.step-indicator');
        const stepLabels = document.querySelectorAll('.step-label');
        const prevBtn = document.getElementById('prevTabBtn');
        const nextBtn = document.getElementById('nextTabBtn');
        const currentTabIndex = 3;

        tabs.forEach(content => content.classList.add('hidden'));
        tabs[currentTabIndex].classList.remove('hidden');

        stepIndicators.forEach((indicator, i) => {
            if (i < currentTabIndex) {
                indicator.style.background = '#1e3a5f';
                indicator.style.color = 'white';
                indicator.style.borderColor = '#1e3a5f';
                indicator.innerHTML = '✓';
            } else if (i === currentTabIndex) {
                indicator.style.background = '#1e3a5f';
                indicator.style.color = 'white';
                indicator.style.borderColor = '#1e3a5f';
                indicator.innerHTML = i + 1;
            } else {
                indicator.style.background = '#eef3fa';
                indicator.style.color = '#6b7f99';
                indicator.style.borderColor = '#d8e2ed';
                indicator.innerHTML = i + 1;
            }
        });

        stepLabels.forEach((label, i) => {
            label.style.color = i <= currentTabIndex ? '#1e3a5f' : '#6b7f99';
            label.style.fontWeight = i <= currentTabIndex ? '600' : '400';
        });

        if (prevBtn) prevBtn.style.display = currentTabIndex === 0 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = currentTabIndex === tabs.length - 1 ? 'none' : 'inline-flex';

        UI.showNotification('Редактирование нарушения', 'info');
    }

    function removeOffense(index) {
        if (index < 0 || index >= multipleOffensesList.length) return;
        multipleOffensesList.splice(index, 1);
        renderOffensesList();
        UI.showNotification('Нарушение удалено из списка', 'success');
    }

    function clearOffensesList() {
        multipleOffensesList = [];
        renderOffensesList();
    }

    // Загрузка списка протоколов из БД
    async function loadProtocolsList() {
        try {
            Auth.ping();

            const { data, error } = await supabaseClient
                .from('protocols')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading protocols:', error);
                UI.showNotification('Ошибка загрузки протоколов: ' + error.message, 'error');
                return [];
            }

            protocolsCache = data || [];
            return protocolsCache;
        } catch (error) {
            console.error('Error in loadProtocolsList:', error);
            ErrorHandler.showError(error, 'Ошибка загрузки протоколов');
            return [];
        }
    }

    // Генерация номера протокола
    async function generateProtocolNumber() {
        const prefix = '77AA';

        const { data } = await supabaseClient
            .from('protocols')
            .select('protocol_number');

        let maxNumber = 0;
        if (data && data.length > 0) {
            data.forEach(item => {
                if (item.protocol_number && item.protocol_number.startsWith(prefix)) {
                    const numPart = item.protocol_number.substring(prefix.length);
                    const num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNumber) {
                        maxNumber = num;
                    }
                }
            });
        }

        const nextNumber = maxNumber + 1;
        const formattedNumber = nextNumber.toString().padStart(6, '0');
        return `${prefix}${formattedNumber}`;
    }

    function canEditProtocol(protocol) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        if (user.category === 'Администратор' || user.category === 'ВРС') {
            return true;
        }

        if (user.category === 'РС' || user.category === 'МС') {
            return protocol.created_by_id === user.auth_user_id;
        }

        return false;
    }

    function canDeleteProtocol() {
        const user = Auth.getCurrentUser();
        if (!user) return false;
        return user.category === 'Администратор' || user.category === 'ВРС';
    }

    function getStatusText(status) {
        switch (status) {
            case 'active': return 'Действующий';
            case 'archived': return 'Архивный';
            default: return 'Неизвестно';
        }
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'active': return 'badge-new';
            case 'archived': return 'badge-closed';
            default: return '';
        }
    }

    function filterProtocolsList(search, status) {
        return protocolsCache.filter(p => {
            if (status && p.status !== status) return false;
            if (!search) return true;

            const searchLower = search.toLowerCase();
            const searchDigits = searchLower.replace(/[^0-9]/g, '');
            const fullName = `${p.violator_lastname} ${p.violator_firstname} ${p.violator_patronymic || ''}`.toLowerCase();

            return (
                p.protocol_number?.toLowerCase().includes(searchLower) ||
                fullName.includes(searchLower) ||
                p.offense_description?.toLowerCase().includes(searchLower) ||
                p.vehicle_license_plate?.toLowerCase().includes(searchLower) ||
                (searchDigits && p.violator_driver_license_number?.includes(searchDigits)) ||
                p.violator_driver_license?.toLowerCase().includes(searchLower)
            );
        });
    }

    function renderProtocolsList(filteredList) {
        const container = document.getElementById('protocolList');
        if (!container) return;

        container.innerHTML = '';

        if (!filteredList.length) {
            container.innerHTML = '<div class="list-item" style="justify-content: center; color: #6b7f99;">Нет протоколов</div>';
            return;
        }

        filteredList.forEach(p => {
            const div = document.createElement('div');
            div.className = 'list-item';

            const canEdit = canEditProtocol(p);
            const canDelete = canDeleteProtocol();

            const violatorName = [p.violator_lastname, p.violator_firstname, p.violator_patronymic]
                .filter(Boolean)
                .join(' ');

            const driverLicenseDigits = p.violator_driver_license_number || '—';
            const statusClass = getStatusBadgeClass(p.status);
            const statusText = getStatusText(p.status);

            div.innerHTML = `
                <div style="flex:1;">
                    <div class="item-title">
                        Протокол №${escapeHtml(p.protocol_number || 'б/н')} 
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="item-meta">
                        <strong>${escapeHtml(violatorName)}</strong> · 
                        ${escapeHtml(p.vehicle_make_model || '—')} (${escapeHtml(p.vehicle_license_plate || '—')})<br>
                        <small>ВУ: ${escapeHtml(driverLicenseDigits)} · 
                        Ст. ${escapeHtml(p.offense_article_number || '')} ч.${escapeHtml(p.offense_article_part || '')} · 
                        ${p.offense_datetime ? p.offense_datetime.replace('T', ' ').substring(0, 16) : ''}</small>
                    </div>
                </div>
                <div class="flex-row" style="gap: 8px;">
                    <button class="small" data-id="${p.id}" data-action="view">👁️ Просмотр</button>
                    ${canEdit ? `<button class="small" data-id="${p.id}" data-action="edit">✏️ Редактировать</button>` : ''}
                    ${canDelete ? `<button class="small secondary" data-id="${p.id}" data-action="delete">🗑️ Удалить</button>` : ''}
                </div>
            `;
            container.appendChild(div);
        });

        container.querySelectorAll('button[data-action="view"]').forEach(btn => {
            btn.onclick = () => openProtocolModal(btn.dataset.id, 'view');
        });

        container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
            btn.onclick = () => openProtocolModal(btn.dataset.id, 'edit');
        });

        container.querySelectorAll('button[data-action="delete"]').forEach(btn => {
            btn.onclick = () => deleteProtocol(btn.dataset.id);
        });
    }

    function filterAndRenderProtocols() {
        const search = document.getElementById('protocolSearch')?.value.toLowerCase() || '';
        const status = document.getElementById('protocolFilterStatus')?.value || '';
        const filtered = filterProtocolsList(search, status);
        renderProtocolsList(filtered);
    }

    async function initProtocolsList() {
        try {
            Auth.ping();

            const clone = UI.loadTemplate('protocolList');
            if (!clone) {
                console.error('Protocol template not found');
                UI.showNotification('Ошибка загрузки шаблона', 'error');
                return;
            }

            UI.clearMain();
            document.getElementById('mainApp').appendChild(clone);

            const elements = UI.getElements();
            if (elements.navProtocols) {
                UI.setActiveTab(elements.navProtocols);
            }

            await loadProtocolsList();
            filterAndRenderProtocols();

            const searchInput = document.getElementById('protocolSearch');
            const filterSelect = document.getElementById('protocolFilterStatus');
            const createBtn = document.getElementById('protocolCreateOpen');

            if (searchInput) {
                searchInput.addEventListener('input', filterAndRenderProtocols);
            }

            if (filterSelect) {
                filterSelect.addEventListener('change', filterAndRenderProtocols);
            }

            if (createBtn) {
                createBtn.onclick = () => openProtocolModal(null, 'create');
            }

        } catch (error) {
            console.error('Error in initProtocolsList:', error);
            UI.showNotification('Ошибка при загрузке раздела протоколов', 'error');
        }
    }

    // СОЗДАНИЕ МНОЖЕСТВЕННЫХ ПРОТОКОЛОВ
    async function createMultipleProtocols() {
        Auth.ping();

        const user = Auth.getCurrentUser();
        if (!user) {
            UI.showNotification('Не авторизован', 'error');
            return false;
        }

        if (multipleOffensesList.length === 0) {
            UI.showNotification('Добавьте хотя бы одно нарушение', 'error');
            return false;
        }

        const commonData = {
            protocol_date: document.getElementById('protocol_date')?.value,
            protocol_time: document.getElementById('protocol_time')?.value,
            protocol_place: document.getElementById('protocol_place')?.value?.trim(),
            official_name: document.getElementById('official_name')?.value?.trim(),

            violator_lastname: document.getElementById('violator_lastname')?.value?.trim(),
            violator_firstname: document.getElementById('violator_firstname')?.value?.trim(),
            violator_patronymic: document.getElementById('violator_patronymic')?.value?.trim() || null,
            violator_birth_date: document.getElementById('violator_birth_date')?.value || null,
            violator_birth_place: document.getElementById('violator_birth_place')?.value?.trim() || null,
            violator_russian_language_skill: document.getElementById('violator_russian_language_skill')?.value || null,

            violator_driver_license: document.getElementById('violator_driver_license')?.value?.trim() || null,

            vehicle_make_model: document.getElementById('vehicle_make_model')?.value?.trim() || null,
            vehicle_license_plate: document.getElementById('vehicle_license_plate')?.value?.trim() || null,
            vehicle_owner: document.getElementById('vehicle_owner')?.value?.trim() || null,
            vehicle_registered_info: document.getElementById('vehicle_registered_info')?.value?.trim() || null,

            offense_datetime: document.getElementById('offense_datetime')?.value,
            offense_place: document.getElementById('offense_place')?.value?.trim(),

            explanatory_note: document.getElementById('explanatory_note')?.value?.trim() || null,
            signature_data: document.getElementById('signature_data')?.value || null,

            status: document.getElementById('status')?.value || 'active',

            created_by_id: user.auth_user_id,
            created_by_name: user.nickname,
            updated_by_id: user.auth_user_id,
            updated_by_name: user.nickname
        };

        const requiredFields = [
            'protocol_date', 'protocol_time', 'protocol_place',
            'official_name',
            'violator_lastname', 'violator_firstname', 'violator_driver_license',
            'vehicle_make_model', 'vehicle_license_plate',
        ];

        for (const field of requiredFields) {
            if (!commonData[field]) {
                const fieldNames = {
                    'protocol_date': 'Дата составления',
                    'protocol_time': 'Время составления',
                    'protocol_place': 'Место составления',
                    'official_name': 'Данные должностного лица',
                    'violator_lastname': 'Фамилия нарушителя',
                    'violator_firstname': 'Имя нарушителя',
                    'violator_driver_license': 'Водительское удостоверение',
                    'vehicle_make_model': 'Марка и модель ТС',
                    'vehicle_license_plate': 'Государственный номер'
                };
                UI.showNotification(`Заполните обязательное поле: ${fieldNames[field] || field}`, 'error');
                return false;
            }
        }

        if (!document.getElementById('offense_datetime')?.value) {
            UI.showNotification('Заполните дату и время правонарушения', 'error');
            return false;
        }

        if (!document.getElementById('offense_place')?.value?.trim()) {
            UI.showNotification('Заполните место совершения правонарушения', 'error');
            return false;
        }

        const saveBtn = document.getElementById('saveProtocolBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = `⏳ Создание ${multipleOffensesList.length} протоколов...`;
        saveBtn.disabled = true;

        let successCount = 0;
        let errorCount = 0;

        try {
            for (let i = 0; i < multipleOffensesList.length; i++) {
                const offense = multipleOffensesList[i];
                const protocolNumber = await generateProtocolNumber();

                const protocolData = {
                    ...commonData,
                    protocol_number: protocolNumber,
                    offense_violation_point: offense.offense_violation_point,
                    offense_description: offense.offense_description,
                    offense_special_equipment: offense.offense_special_equipment,
                    offense_article_number: offense.offense_article_number,
                    offense_article_part: offense.offense_article_part
                };

                const { error } = await supabaseClient
                    .from('protocols')
                    .insert([protocolData]);

                if (error) {
                    console.error(`Error creating protocol #${i + 1}:`, error);
                    errorCount++;
                } else {
                    successCount++;
                }
            }

            if (Logger && Logger.ACTION_TYPES) {
                Logger.log('protocols_bulk_create', {
                    count: successCount,
                    errors: errorCount,
                    violator: `${commonData.violator_lastname} ${commonData.violator_firstname}`,
                    created_by: user.nickname
                }, 'protocol', null);
            }

            if (successCount > 0) {
                UI.showNotification(`Создано ${successCount} протоколов${errorCount > 0 ? `, ошибок: ${errorCount}` : ''}`,
                    errorCount > 0 ? 'warning' : 'success');

                clearOffensesList();
                await loadProtocolsList();
                filterAndRenderProtocols();
                return true;
            } else {
                UI.showNotification('Не удалось создать ни одного протокола', 'error');
                return false;
            }

        } catch (error) {
            console.error('Error in createMultipleProtocols:', error);
            UI.showNotification('Ошибка при создании протоколов: ' + error.message, 'error');
            return false;
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            updateOffensesCounter();
        }
    }

    // СОЗДАНИЕ ОДИНОЧНОГО ПРОТОКОЛА
    async function createProtocol() {
        Auth.ping();

        const user = Auth.getCurrentUser();
        if (!user) {
            UI.showNotification('Не авторизован', 'error');
            return false;
        }

        const formData = {
            protocol_number: document.getElementById('protocol_number')?.value,
            protocol_date: document.getElementById('protocol_date')?.value,
            protocol_time: document.getElementById('protocol_time')?.value,
            protocol_place: document.getElementById('protocol_place')?.value?.trim(),
            official_name: document.getElementById('official_name')?.value?.trim(),

            violator_lastname: document.getElementById('violator_lastname')?.value?.trim(),
            violator_firstname: document.getElementById('violator_firstname')?.value?.trim(),
            violator_patronymic: document.getElementById('violator_patronymic')?.value?.trim() || null,
            violator_birth_date: document.getElementById('violator_birth_date')?.value || null,
            violator_birth_place: document.getElementById('violator_birth_place')?.value?.trim() || null,
            violator_russian_language_skill: document.getElementById('violator_russian_language_skill')?.value || null,

            violator_driver_license: document.getElementById('violator_driver_license')?.value?.trim() || null,

            vehicle_make_model: document.getElementById('vehicle_make_model')?.value?.trim() || null,
            vehicle_license_plate: document.getElementById('vehicle_license_plate')?.value?.trim() || null,
            vehicle_owner: document.getElementById('vehicle_owner')?.value?.trim() || null,
            vehicle_registered_info: document.getElementById('vehicle_registered_info')?.value?.trim() || null,

            offense_datetime: document.getElementById('offense_datetime')?.value,
            offense_place: document.getElementById('offense_place')?.value?.trim(),
            offense_description: document.getElementById('offense_description')?.value?.trim(),
            offense_violation_point: document.getElementById('offense_violation_point')?.value?.trim() || null,
            offense_special_equipment: document.getElementById('offense_special_equipment')?.value?.trim() || null,
            offense_article_number: document.getElementById('offense_article_number')?.value?.trim(),
            offense_article_part: document.getElementById('offense_article_part')?.value?.trim(),

            explanatory_note: document.getElementById('explanatory_note')?.value?.trim() || null,
            signature_data: document.getElementById('signature_data')?.value || null,

            status: document.getElementById('status')?.value || 'active',

            created_by_id: user.auth_user_id,
            created_by_name: user.nickname,
            updated_by_id: user.auth_user_id,
            updated_by_name: user.nickname
        };

        const requiredFields = [
            'protocol_date', 'protocol_time', 'protocol_place',
            'official_name',
            'violator_lastname', 'violator_firstname', 'violator_driver_license',
            'vehicle_make_model', 'vehicle_license_plate',
            'offense_datetime', 'offense_place',
            'offense_description', 'offense_violation_point',
            'offense_article_number', 'offense_article_part'
        ];

        for (const field of requiredFields) {
            if (!formData[field]) {
                const fieldNames = {
                    'protocol_date': 'Дата составления',
                    'protocol_time': 'Время составления',
                    'protocol_place': 'Место составления',
                    'official_name': 'Данные должностного лица',
                    'violator_lastname': 'Фамилия нарушителя',
                    'violator_firstname': 'Имя нарушителя',
                    'violator_driver_license': 'Водительское удостоверение',
                    'vehicle_make_model': 'Марка и модель ТС',
                    'vehicle_license_plate': 'Государственный номер',
                    'offense_datetime': 'Дата и время правонарушения',
                    'offense_place': 'Место правонарушения',
                    'offense_description': 'Описание правонарушения',
                    'offense_violation_point': 'Пункт нормативного акта',
                    'offense_article_number': 'Статья КоАП',
                    'offense_article_part': 'Часть статьи'
                };
                UI.showNotification(`Заполните обязательное поле: ${fieldNames[field] || field}`, 'error');
                return false;
            }
        }

        try {
            const saveBtn = document.getElementById('saveProtocolBtn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '⏳ Сохранение...';
            saveBtn.disabled = true;

            const { error } = await supabaseClient
                .from('protocols')
                .insert([formData]);

            if (error) {
                console.error('Insert error:', error);
                if (error.code === '42501') {
                    UI.showNotification('Ошибка прав доступа: вы не можете создавать протоколы', 'error');
                } else if (error.code === '23505') {
                    UI.showNotification('Протокол с таким номером уже существует', 'error');
                } else {
                    UI.showNotification('Ошибка при создании протокола: ' + error.message, 'error');
                }
                return false;
            }

            if (Logger && Logger.ACTION_TYPES) {
                Logger.log('protocol_create', {
                    protocol_number: formData.protocol_number,
                    violator: `${formData.violator_lastname} ${formData.violator_firstname}`,
                    article: `ст.${formData.offense_article_number} ч.${formData.offense_article_part}`,
                    created_by: user.nickname
                }, 'protocol', formData.protocol_number);
            }

            UI.showNotification('Протокол успешно создан', 'success');

            await loadProtocolsList();
            filterAndRenderProtocols();

            return true;

        } catch (error) {
            console.error('Error in createProtocol:', error);
            UI.showNotification('Ошибка при создании протокола: ' + error.message, 'error');
            return false;
        } finally {
            const saveBtn = document.getElementById('saveProtocolBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        }
    }

    // ОБНОВЛЕНИЕ ПРОТОКОЛА
    async function updateProtocol(id) {
        Auth.ping();

        const user = Auth.getCurrentUser();
        if (!user) {
            UI.showNotification('Не авторизован', 'error');
            return false;
        }

        const oldProtocol = protocolsCache.find(p => p.id == id);
        if (!oldProtocol) {
            UI.showNotification('Протокол не найден', 'error');
            return false;
        }

        const formData = {
            protocol_date: document.getElementById('protocol_date')?.value,
            protocol_time: document.getElementById('protocol_time')?.value,
            protocol_place: document.getElementById('protocol_place')?.value?.trim(),
            official_name: document.getElementById('official_name')?.value?.trim(),

            violator_lastname: document.getElementById('violator_lastname')?.value?.trim(),
            violator_firstname: document.getElementById('violator_firstname')?.value?.trim(),
            violator_patronymic: document.getElementById('violator_patronymic')?.value?.trim() || null,
            violator_birth_date: document.getElementById('violator_birth_date')?.value || null,
            violator_birth_place: document.getElementById('violator_birth_place')?.value?.trim() || null,
            violator_russian_language_skill: document.getElementById('violator_russian_language_skill')?.value || null,

            violator_driver_license: document.getElementById('violator_driver_license')?.value?.trim() || null,

            vehicle_make_model: document.getElementById('vehicle_make_model')?.value?.trim() || null,
            vehicle_license_plate: document.getElementById('vehicle_license_plate')?.value?.trim() || null,
            vehicle_owner: document.getElementById('vehicle_owner')?.value?.trim() || null,
            vehicle_registered_info: document.getElementById('vehicle_registered_info')?.value?.trim() || null,

            offense_datetime: document.getElementById('offense_datetime')?.value,
            offense_place: document.getElementById('offense_place')?.value?.trim(),
            offense_description: document.getElementById('offense_description')?.value?.trim(),
            offense_violation_point: document.getElementById('offense_violation_point')?.value?.trim() || null,
            offense_special_equipment: document.getElementById('offense_special_equipment')?.value?.trim() || null,
            offense_article_number: document.getElementById('offense_article_number')?.value?.trim(),
            offense_article_part: document.getElementById('offense_article_part')?.value?.trim(),

            explanatory_note: document.getElementById('explanatory_note')?.value?.trim() || null,
            signature_data: document.getElementById('signature_data')?.value || null,

            status: document.getElementById('status')?.value || 'active',

            updated_by_id: user.auth_user_id,
            updated_by_name: user.nickname
        };

        const requiredFields = [
            'protocol_date', 'protocol_time', 'protocol_place',
            'official_name',
            'violator_lastname', 'violator_firstname', 'violator_driver_license',
            'vehicle_make_model', 'vehicle_license_plate',
            'offense_datetime', 'offense_place',
            'offense_description', 'offense_violation_point',
            'offense_article_number', 'offense_article_part'
        ];

        for (const field of requiredFields) {
            if (!formData[field]) {
                const fieldNames = {
                    'protocol_date': 'Дата составления',
                    'protocol_time': 'Время составления',
                    'protocol_place': 'Место составления',
                    'official_name': 'Данные должностного лица',
                    'violator_lastname': 'Фамилия нарушителя',
                    'violator_firstname': 'Имя нарушителя',
                    'violator_driver_license': 'Водительское удостоверение',
                    'vehicle_make_model': 'Марка и модель ТС',
                    'vehicle_license_plate': 'Государственный номер',
                    'offense_datetime': 'Дата и время правонарушения',
                    'offense_place': 'Место правонарушения',
                    'offense_description': 'Описание правонарушения',
                    'offense_violation_point': 'Пункт нормативного акта',
                    'offense_article_number': 'Статья КоАП',
                    'offense_article_part': 'Часть статьи'
                };
                UI.showNotification(`Заполните обязательное поле: ${fieldNames[field] || field}`, 'error');
                return false;
            }
        }

        try {
            const saveBtn = document.getElementById('saveProtocolBtn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '⏳ Сохранение...';
            saveBtn.disabled = true;

            const { error } = await supabaseClient
                .from('protocols')
                .update(formData)
                .eq('id', id);

            if (error) {
                console.error('Update error:', error);
                if (error.code === '42501') {
                    UI.showNotification('Ошибка прав доступа: вы не можете редактировать этот протокол', 'error');
                } else {
                    UI.showNotification('Ошибка при обновлении протокола: ' + error.message, 'error');
                }
                return false;
            }

            if (Logger && Logger.ACTION_TYPES) {
                Logger.log('protocol_update', {
                    protocol_number: oldProtocol.protocol_number,
                    updated_by: user.nickname
                }, 'protocol', oldProtocol.protocol_number);
            }

            UI.showNotification('Протокол обновлен', 'success');

            await loadProtocolsList();
            filterAndRenderProtocols();

            return true;

        } catch (error) {
            console.error('Error in updateProtocol:', error);
            UI.showNotification('Ошибка при обновлении протокола: ' + error.message, 'error');
            return false;
        } finally {
            const saveBtn = document.getElementById('saveProtocolBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        }
    }

    // ОТКРЫТИЕ МОДАЛЬНОГО ОКНА
    async function openProtocolModal(id = null, mode = 'create') {
        Auth.ping();

        const user = Auth.getCurrentUser();
        let protocol = null;

        if (id) {
            protocol = protocolsCache.find(p => p.id == id);
            if (!protocol) {
                UI.showNotification('Протокол не найден', 'error');
                return;
            }

            if (mode === 'edit' && !canEditProtocol(protocol)) {
                UI.showNotification('У вас нет прав на редактирование этого протокола', 'error');
                return;
            }
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'protocolModal';
        modal.dataset.mode = mode;

        const title = mode === 'create' ? 'Новый протокол об АП' :
            (mode === 'edit' ? `Редактирование протокола №${protocol?.protocol_number}` :
                `Просмотр протокола №${protocol?.protocol_number}`);

        const isReadOnly = mode === 'view';
        const protocolNumber = protocol ? protocol.protocol_number : await generateProtocolNumber();

        let formChanged = false;

        function checkFormChanges() {
            if (mode === 'create' || mode === 'edit') {
                formChanged = true;
            }
        }

        function safeClose() {
            if ((mode === 'create' || mode === 'edit') && formChanged) {
                const confirmCloseModal = document.createElement('div');
                confirmCloseModal.className = 'modal-overlay';
                confirmCloseModal.innerHTML = `
                    <div class="modal-container" style="max-width: 400px;">
                        <div class="modal-header">
                            <h3>Подтверждение закрытия</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-content">
                            <p>У вас есть несохранённые изменения. Вы действительно хотите закрыть окно?</p>
                            <div class="flex-row" style="justify-content: flex-end; margin-top: 20px;">
                                <button id="cancelCloseBtn" class="secondary">Остаться</button>
                                <button id="confirmCloseBtn" style="background: #dc3545;">Закрыть без сохранения</button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(confirmCloseModal);

                confirmCloseModal.querySelector('.modal-close').onclick = () => confirmCloseModal.remove();
                confirmCloseModal.onclick = (e) => {
                    if (e.target === confirmCloseModal) confirmCloseModal.remove();
                };

                document.getElementById('cancelCloseBtn').onclick = () => confirmCloseModal.remove();
                document.getElementById('confirmCloseBtn').onclick = () => {
                    confirmCloseModal.remove();
                    modal.remove();
                };
            } else {
                modal.remove();
            }
        }

        if (mode === 'create') {
            // РЕЖИМ СОЗДАНИЯ (МНОЖЕСТВЕННЫЙ)
            multipleOffensesList = [];

            modal.innerHTML = `
                <div class="modal-container modal-large" style="max-width: 900px; width: 95%;">
                    <div class="modal-header">
                        <h3>${escapeHtml(title)}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
                        <form id="protocolForm">
                            <input type="hidden" id="protocol_number" value="${escapeHtml(protocolNumber)}">
                            
                            <div class="protocol-wizard">
                                <div class="wizard-steps" style="display: flex; justify-content: space-between; margin-bottom: 20px; padding: 0 10px;">
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="main">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #1e3a5f; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">1</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Основное</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="violator">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">2</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Нарушитель</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="vehicle">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">3</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Транспорт</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="offense">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">4</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Правонарушения</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="additional">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">5</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Дополнительно</div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 1: Основное -->
                                <div class="tab-content" data-tab="main">
                                    <h4>Основная информация</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group">
                                            <label>Дата составления <span class="required">*</span></label>
                                            <input type="date" id="protocol_date" required value="${getCurrentMskDate()}">
                                        </div>
                                        <div class="form-group">
                                            <label>Время составления <span class="required">*</span></label>
                                            <input type="time" id="protocol_time" required value="${getCurrentMskTime()}">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Место составления <span class="required">*</span></label>
                                            <input type="text" id="protocol_place" required value="" placeholder="г. Мирный, ул. Ленина">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Должностное лицо <span class="required">*</span></label>
                                            <input type="text" id="official_name" required value="" placeholder="Инспектор ОБ УГИБДД, старшина полиции Косяк П.А.">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 2: Нарушитель -->
                                <div class="tab-content hidden" data-tab="violator">
                                    <h4>Данные нарушителя</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group">
                                            <label>Фамилия <span class="required">*</span></label>
                                            <input type="text" id="violator_lastname" required value="">
                                        </div>
                                        <div class="form-group">
                                            <label>Имя <span class="required">*</span></label>
                                            <input type="text" id="violator_firstname" required value="">
                                        </div>
                                        <div class="form-group">
                                            <label>Отчество</label>
                                            <input type="text" id="violator_patronymic" value="">
                                        </div>
                                        <div class="form-group">
                                            <label>Дата рождения</label>
                                            <input type="date" id="violator_birth_date" value="">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Место рождения</label>
                                            <input type="text" id="violator_birth_place" value="" placeholder="г. Мирный">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Владение русским языком</label>
                                            <select id="violator_russian_language_skill">
                                                <option value="">Не указано</option>
                                                <option value="владеет">Владеет</option>
                                                <option value="не владеет">Не владеет</option>
                                            </select>
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Водительское удостоверение <span class="required">*</span></label>
                                            <input type="text" id="violator_driver_license" required value="" placeholder="№ 123456, выдано МРЭО УГИБДД МВД по г. Мирный">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 3: Транспорт -->
								<div class="tab-content hidden" data-tab="vehicle">
									<h4>Данные транспортного средства</h4>
									<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
										<div class="form-group" style="grid-column: span 2;">
											<label>Марка и модель ТС <span class="required">*</span></label>
											<input type="text" id="vehicle_make_model" required value="" 
												   placeholder="Начните вводить или выберите из списка"
												   class="vehicle-searchable" autocomplete="off">
										</div>
										<div class="form-group">
											<label>Госномер <span class="required">*</span></label>
											<input type="text" id="vehicle_license_plate" required value="" placeholder="А123ВС 77">
										</div>
										<div class="form-group">
											<label>Владелец ТС (фамилия, имя, отчество, организация)</label>
											<input type="text" id="vehicle_owner" value="" placeholder="Иванов И.И.">
										</div>
										<div class="form-group" style="grid-column: span 2;">
											<label>ТС состоит на учете</label>
											<input type="text" id="vehicle_registered_info" value="" placeholder="МРЭО УГИБДД МВД по г. Мирный">
										</div>
									</div>
								</div>
                                
                                <!-- Вкладка 4: Правонарушения -->
                                <div class="tab-content hidden" data-tab="offense">
                                    <h4>Данные о правонарушении</h4>
                                    
                                    <div style="margin-bottom: 20px; background: #f8fafd; border-radius: 12px; padding: 15px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                            <h5 style="margin: 0; color: #1e3a5f;">Добавленные нарушения 
                                                <span id="offensesCounter" style="background: #1e3a5f; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; margin-left: 8px;">0</span>
                                            </h5>
                                        </div>
                                        <div id="offensesListContainer"></div>
                                    </div>
                                    
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Дата и время правонарушения <span class="required">*</span></label>
                                            <input type="datetime-local" id="offense_datetime" required value="${getCurrentMskDateTimeLocal()}">
                                            <small class="field-hint">Общая дата для всех протоколов</small>
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Место совершения <span class="required">*</span></label>
                                            <input type="text" id="offense_place" required value="" placeholder="г. Мирный, ул. Ленина">
                                        </div>
                                        
                                        <div style="grid-column: span 2; border-top: 2px dashed #d8e2ed; margin: 10px 0;"></div>
                                        
                                        <div style="grid-column: span 2;">
                                            <h5 style="color: #1e3a5f; margin-bottom: 15px;">Добавить новое нарушение</h5>
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Пункт нормативного акта <span class="required">*</span></label>
                                            <input type="text" id="offense_violation_point" value="" placeholder="п. 6.1 ПДД">
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Описание <span class="required">*</span></label>
                                            <textarea id="offense_description" rows="2" placeholder="Проезд на запрещающий сигнал светофора"></textarea>
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Спецсредства</label>
                                            <input type="text" id="offense_special_equipment" value="" placeholder="Тоник, 23%">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>Статья КоАП <span class="required">*</span></label>
                                            <input type="text" id="offense_article_number" value="" placeholder="6">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>Часть статьи <span class="required">*</span></label>
                                            <input type="text" id="offense_article_part" value="" placeholder="1">
                                        </div>
                                        
                                        <div style="grid-column: span 2; display: flex; gap: 10px; margin-top: 10px;">
                                            <button type="button" id="addOffenseBtn" class="secondary" style="flex: 1; background: #28a745; color: white; border: none;">
                                                ➕ Добавить нарушение
                                            </button>
                                            <button type="button" id="clearOffensesBtn" class="secondary" style="flex: 0.3;">
                                                🧹 Очистить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 5: Дополнительно -->
                                <div class="tab-content hidden" data-tab="additional">
                                    <h4>Дополнительная информация</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Объяснения</label>
                                            <textarea id="explanatory_note" rows="3" placeholder="Объяснения нарушителя"></textarea>
                                        </div>
                                        
                                        <div class="form-group signature-section" style="grid-column: span 2; margin-top: 10px; border-top: 1px solid #d8e2ed; padding-top: 20px;">
                                            <h4 style="margin-bottom: 15px;">Подпись должностного лица</h4>
                                            
                                            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px; align-items: start;">
                                                <div>
                                                    <label>Нарисуйте подпись:</label>
                                                    <div style="border: 2px dashed #1e3a5f; border-radius: 8px; padding: 5px; background: #fff; margin-top: 5px;">
                                                        <canvas id="signatureCanvas" width="250" height="120" style="width: 100%; height: auto; background: white; border: 1px solid #d8e2ed; border-radius: 4px; cursor: crosshair;"></canvas>
                                                    </div>
                                                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                                                        <button type="button" id="clearSignatureBtn" class="small secondary">🧹 Очистить</button>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label>Предпросмотр:</label>
                                                    <div style="border: 1px solid #d8e2ed; border-radius: 8px; padding: 15px; background: #f8fafd; margin-top: 5px; min-height: 120px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                                        <canvas id="signaturePreviewCanvas" width="200" height="80" style="width: 100%; height: auto; background: white; border: 1px solid #d8e2ed; border-radius: 4px; display: none;"></canvas>
                                                        <div id="noSignatureMessage" style="color: #6b7f99; text-align: center;">
                                                            ⚠️ Подпись не добавлена
                                                        </div>
                                                    </div>
                                                    <input type="hidden" id="signature_data" value="">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2; margin-top: 10px;">
                                            <label>Статус</label>
                                            <select id="status">
                                                <option value="active" selected>Действующий</option>
                                                <option value="archived">Архивный</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="flex-row" style="justify-content: space-between; align-items: center; margin-top: 20px;">
                                    <button type="button" id="cancelProtocolBtn" class="secondary">Отмена</button>
                                    <div class="flex-row" style="gap: 8px;">
                                        <button type="button" id="prevTabBtn" class="secondary" style="display: none;">← Назад</button>
                                        <button type="button" id="nextTabBtn" class="secondary">Далее →</button>
                                        <button type="submit" id="saveProtocolBtn" class="primary" disabled>
                                            ➕ Создать протокол (нет нарушений)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
			if (window.initVehicleSearchableFields) {
				setTimeout(() => {
					initVehicleSearchableFields();
				}, 100);
			}

			const user = Auth.getCurrentUser();
				
				// Если у пользователя есть данные в профиле, подставляем их в формате:
				// (должность), (звание с маленькой буквы) (фамилия инициалы)
				if (user.position && user.fullname) {
					setTimeout(() => {
						const officialNameField = document.getElementById('official_name');
						if (officialNameField && !officialNameField.value) {
							// Преобразуем звание в нижний регистр
							const rankLowerCase = user.rank ? user.rank.toLowerCase() : '';
							// Формируем строку должностного лица в нужном формате
							officialNameField.value = `${user.position}, ${rankLowerCase} ${user.fullname}`;
						}
					}, 100);
				} else if (user.fullname) {
					// Если должность не указана, подставляем только звание и фамилию
					setTimeout(() => {
						const officialNameField = document.getElementById('official_name');
						if (officialNameField && !officialNameField.value) {
							// Преобразуем звание в нижний регистр
							const rankLowerCase = user.rank ? user.rank.toLowerCase() : '';
							officialNameField.value = `${rankLowerCase} ${user.fullname}`;
						}
					}, 100);
				}
				
				// Если у пользователя есть подпись, добавляем её
				if (user.signature_data) {
					setTimeout(() => {
						const signatureInput = document.getElementById('signature_data');
						if (signatureInput) {
							signatureInput.value = user.signature_data;
							
							// Также отображаем подпись на canvas
							const canvas = document.getElementById('signatureCanvas');
							if (canvas) {
								const ctx = canvas.getContext('2d');
								const img = new Image();
								img.onload = () => {
									ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
									// Обновляем предпросмотр
									const previewCanvas = document.getElementById('signaturePreviewCanvas');
									const noSignatureMessage = document.getElementById('noSignatureMessage');
									if (previewCanvas) {
										previewCanvas.width = 200;
										previewCanvas.height = 80;
										const previewCtx = previewCanvas.getContext('2d');
										previewCtx.drawImage(canvas, 0, 0, 200, 80);
										previewCanvas.style.display = 'block';
										if (noSignatureMessage) noSignatureMessage.style.display = 'none';
									}
								};
								img.src = user.signature_data;
							}
						}
					}, 100);
				}			
            // Настройка навигации по вкладкам
            const tabs = ['main', 'violator', 'vehicle', 'offense', 'additional'];
            let currentTabIndex = 0;
            const tabContents = modal.querySelectorAll('.tab-content');
            const stepIndicators = modal.querySelectorAll('.step-indicator');
            const stepLabels = modal.querySelectorAll('.step-label');
            const stepElements = modal.querySelectorAll('.step');
            const prevBtn = document.getElementById('prevTabBtn');
            const nextBtn = document.getElementById('nextTabBtn');
            const saveBtn = document.getElementById('saveProtocolBtn');

            function updateTabDisplay() {
                tabContents.forEach(content => content.classList.add('hidden'));
                tabContents[currentTabIndex].classList.remove('hidden');

                stepIndicators.forEach((indicator, index) => {
                    if (index < currentTabIndex) {
                        indicator.style.background = '#1e3a5f';
                        indicator.style.color = 'white';
                        indicator.style.borderColor = '#1e3a5f';
                        indicator.innerHTML = '✓';
                    } else if (index === currentTabIndex) {
                        indicator.style.background = '#1e3a5f';
                        indicator.style.color = 'white';
                        indicator.style.borderColor = '#1e3a5f';
                        indicator.innerHTML = index + 1;
                    } else {
                        indicator.style.background = '#eef3fa';
                        indicator.style.color = '#6b7f99';
                        indicator.style.borderColor = '#d8e2ed';
                        indicator.innerHTML = index + 1;
                    }
                });

                stepLabels.forEach((label, index) => {
                    label.style.color = index <= currentTabIndex ? '#1e3a5f' : '#6b7f99';
                    label.style.fontWeight = index <= currentTabIndex ? '600' : '400';
                });

                if (prevBtn) {
                    prevBtn.style.display = currentTabIndex === 0 ? 'none' : 'inline-flex';
                }

                if (nextBtn) {
                    if (currentTabIndex === tabs.length - 1) {
                        nextBtn.style.display = 'none';
                    } else {
                        nextBtn.style.display = 'inline-flex';
                    }
                }

                // На последней вкладке показываем кнопку создания
                if (saveBtn) {
                    if (currentTabIndex === tabs.length - 1) {
                        saveBtn.style.display = 'inline-flex';
                    } else {
                        saveBtn.style.display = 'none';
                    }
                }
            }

            function switchToTab(tabName) {
                const index = tabs.indexOf(tabName);
                if (index !== -1 && index !== currentTabIndex) {
                    currentTabIndex = index;
                    updateTabDisplay();
                }
            }

            stepElements.forEach(step => {
                const tabName = step.dataset.tab;
                step.addEventListener('click', () => switchToTab(tabName));
            });

            function validateCurrentTab(index) {
                const tabName = tabs[index];
                let isValid = true;
                let errorMessage = '';

                switch (tabName) {
                    case 'main':
                        if (!document.getElementById('protocol_date')?.value) {
                            errorMessage = 'Заполните дату составления';
                            isValid = false;
                        } else if (!document.getElementById('protocol_time')?.value) {
                            errorMessage = 'Заполните время составления';
                            isValid = false;
                        } else if (!document.getElementById('protocol_place')?.value?.trim()) {
                            errorMessage = 'Заполните место составления';
                            isValid = false;
                        } else if (!document.getElementById('official_name')?.value?.trim()) {
                            errorMessage = 'Заполните данные должностного лица';
                            isValid = false;
                        }
                        break;

                    case 'violator':
                        if (!document.getElementById('violator_lastname')?.value?.trim()) {
                            errorMessage = 'Заполните фамилию нарушителя';
                            isValid = false;
                        } else if (!document.getElementById('violator_firstname')?.value?.trim()) {
                            errorMessage = 'Заполните имя нарушителя';
                            isValid = false;
                        } else if (!document.getElementById('violator_driver_license')?.value?.trim()) {
                            errorMessage = 'Заполните водительское удостоверение';
                            isValid = false;
                        }
                        break;

                    case 'vehicle':
                        if (!document.getElementById('vehicle_make_model')?.value?.trim()) {
                            errorMessage = 'Заполните марку и модель ТС';
                            isValid = false;
                        } else if (!document.getElementById('vehicle_license_plate')?.value?.trim()) {
                            errorMessage = 'Заполните госномер';
                            isValid = false;
                        }
                        break;

                    case 'offense':
                        if (!document.getElementById('offense_datetime')?.value) {
                            errorMessage = 'Заполните дату и время правонарушения';
                            isValid = false;
                        } else if (!document.getElementById('offense_place')?.value?.trim()) {
                            errorMessage = 'Заполните место правонарушения';
                            isValid = false;
                        } else if (multipleOffensesList.length === 0) {
                            errorMessage = 'Добавьте хотя бы одно нарушение';
                            isValid = false;
                        }
                        break;
                }

                if (!isValid) {
                    UI.showNotification(errorMessage, 'warning');
                }

                return isValid;
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (validateCurrentTab(currentTabIndex)) {
                        if (currentTabIndex < tabs.length - 1) {
                            currentTabIndex++;
                            updateTabDisplay();
                        }
                    }
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentTabIndex > 0) {
                        currentTabIndex--;
                        updateTabDisplay();
                    }
                });
            }

            updateTabDisplay();

            // Инициализация подписи
            initSignatureCanvas();

            // Обработчики для нарушений
            const addOffenseBtn = document.getElementById('addOffenseBtn');
            if (addOffenseBtn) {
                addOffenseBtn.onclick = (e) => {
                    e.preventDefault();
                    addOffenseToList();
                };
            }

            const clearOffensesBtn = document.getElementById('clearOffensesBtn');
            if (clearOffensesBtn) {
                clearOffensesBtn.onclick = (e) => {
                    e.preventDefault();
                    if (multipleOffensesList.length > 0 && confirm('Очистить список нарушений?')) {
                        clearOffensesList();
                    }
                };
            }

            // Отслеживание изменений
            const form = document.getElementById('protocolForm');
            const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', checkFormChanges);
                input.addEventListener('change', checkFormChanges);
            });

            // Обработчики закрытия
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.onclick = (e) => {
                e.preventDefault();
                safeClose();
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    e.preventDefault();
                    safeClose();
                }
            };

            const cancelBtn = document.getElementById('cancelProtocolBtn');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.preventDefault();
                    safeClose();
                };
            }

            // Отправка формы
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();

                    if (!validateCurrentTab(currentTabIndex)) {
                        return;
                    }

                    const success = await createMultipleProtocols();

                    if (success) {
                        modal.remove();
                    }
                };
            }

        } else if (mode === 'edit' && protocol) {
            // РЕЖИМ РЕДАКТИРОВАНИЯ (ОДИНОЧНЫЙ)
            modal.innerHTML = `
                <div class="modal-container modal-large" style="max-width: 900px; width: 95%;">
                    <div class="modal-header">
                        <h3>${escapeHtml(title)}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
                        <form id="protocolForm">
                            <input type="hidden" id="protocol_number" value="${escapeHtml(protocolNumber)}">
                            
                            <div class="protocol-wizard">
                                <div class="wizard-steps" style="display: flex; justify-content: space-between; margin-bottom: 20px; padding: 0 10px;">
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="main">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #1e3a5f; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">1</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Основное</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="violator">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">2</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Нарушитель</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="vehicle">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">3</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Транспорт</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="offense">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">4</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Правонарушение</div>
                                    </div>
                                    <div class="step" style="text-align: center; flex: 1; cursor: pointer;" data-tab="additional">
                                        <div class="step-indicator" style="width: 30px; height: 30px; border-radius: 50%; background: #eef3fa; color: #6b7f99; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">5</div>
                                        <div class="step-label" style="font-size: 0.9rem;">Дополнительно</div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 1: Основное -->
                                <div class="tab-content" data-tab="main">
                                    <h4>Основная информация</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group">
                                            <label>Дата составления <span class="required">*</span></label>
                                            <input type="date" id="protocol_date" required value="${protocol?.protocol_date ? protocol.protocol_date.slice(0, 10) : ''}">
                                        </div>
                                        <div class="form-group">
                                            <label>Время составления <span class="required">*</span></label>
                                            <input type="time" id="protocol_time" required value="${protocol?.protocol_time ? protocol.protocol_time.slice(0, 5) : ''}">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Место составления <span class="required">*</span></label>
                                            <input type="text" id="protocol_place" required value="${escapeHtml(protocol?.protocol_place || '')}">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Должностное лицо <span class="required">*</span></label>
                                            <input type="text" id="official_name" required value="${escapeHtml(protocol?.official_name || '')}">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 2: Нарушитель -->
                                <div class="tab-content hidden" data-tab="violator">
                                    <h4>Данные нарушителя</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group">
                                            <label>Фамилия <span class="required">*</span></label>
                                            <input type="text" id="violator_lastname" required value="${escapeHtml(protocol?.violator_lastname || '')}">
                                        </div>
                                        <div class="form-group">
                                            <label>Имя <span class="required">*</span></label>
                                            <input type="text" id="violator_firstname" required value="${escapeHtml(protocol?.violator_firstname || '')}">
                                        </div>
                                        <div class="form-group">
                                            <label>Отчество</label>
                                            <input type="text" id="violator_patronymic" value="${escapeHtml(protocol?.violator_patronymic || '')}">
                                        </div>
                                        <div class="form-group">
                                            <label>Дата рождения</label>
                                            <input type="date" id="violator_birth_date" value="${protocol?.violator_birth_date || ''}">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Место рождения</label>
                                            <input type="text" id="violator_birth_place" value="${escapeHtml(protocol?.violator_birth_place || '')}">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Владение русским языком</label>
                                            <select id="violator_russian_language_skill">
                                                <option value="">Не указано</option>
                                                <option value="владеет" ${protocol?.violator_russian_language_skill === 'владеет' ? 'selected' : ''}>Владеет</option>
                                                <option value="не владеет" ${protocol?.violator_russian_language_skill === 'не владеет' ? 'selected' : ''}>Не владеет</option>
                                            </select>
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Водительское удостоверение <span class="required">*</span></label>
                                            <input type="text" id="violator_driver_license" required value="${escapeHtml(protocol?.violator_driver_license || '')}">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 3: Транспорт -->
								<div class="tab-content hidden" data-tab="vehicle">
									<h4>Данные транспортного средства</h4>
									<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
										<div class="form-group" style="grid-column: span 2;">
											<label>Марка и модель ТС <span class="required">*</span></label>
											<input type="text" id="vehicle_make_model" required value="${escapeHtml(protocol?.vehicle_make_model || '')}" 
												   placeholder="Начните вводить или выберите из списка"
												   class="vehicle-searchable" autocomplete="off">
										</div>
										<div class="form-group">
											<label>Госномер <span class="required">*</span></label>
											<input type="text" id="vehicle_license_plate" required value="${escapeHtml(protocol?.vehicle_license_plate || '')}" placeholder="А123ВС 77">
										</div>
										<div class="form-group">
											<label>Владелец ТС (фамилия, имя, отчество, организация)</label>
											<input type="text" id="vehicle_owner" value="${escapeHtml(protocol?.vehicle_owner || '')}" placeholder="Иванов И.И.">
										</div>
										<div class="form-group" style="grid-column: span 2;">
											<label>ТС состоит на учете</label>
											<input type="text" id="vehicle_registered_info" value="${escapeHtml(protocol?.vehicle_registered_info || '')}" placeholder="МРЭО УГИБДД МВД по г. Мирный">
										</div>
									</div>
								</div>
                                
                                <!-- Вкладка 4: Правонарушение -->
                                <div class="tab-content hidden" data-tab="offense">
                                    <h4>Данные о правонарушении</h4>
                                    
                                    
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Дата и время правонарушения <span class="required">*</span></label>
                                            <input type="datetime-local" id="offense_datetime" required value="${protocol?.offense_datetime ? protocol.offense_datetime.slice(0, 16) : ''}">
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Место совершения <span class="required">*</span></label>
                                            <input type="text" id="offense_place" required value="${escapeHtml(protocol?.offense_place || '')}">
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Пункт нормативного акта <span class="required">*</span></label>
                                            <input type="text" id="offense_violation_point" required value="${escapeHtml(protocol?.offense_violation_point || '')}">
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Описание <span class="required">*</span></label>
                                            <textarea id="offense_description" rows="2" required>${escapeHtml(protocol?.offense_description || '')}</textarea>
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Спецсредства</label>
                                            <input type="text" id="offense_special_equipment" value="${escapeHtml(protocol?.offense_special_equipment || '')}">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>Статья КоАП <span class="required">*</span></label>
                                            <input type="text" id="offense_article_number" required value="${escapeHtml(protocol?.offense_article_number || '')}">
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>Часть статьи <span class="required">*</span></label>
                                            <input type="text" id="offense_article_part" required value="${escapeHtml(protocol?.offense_article_part || '')}">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Вкладка 5: Дополнительно -->
                                <div class="tab-content hidden" data-tab="additional">
                                    <h4>Дополнительная информация</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Объяснения</label>
                                            <textarea id="explanatory_note" rows="3">${escapeHtml(protocol?.explanatory_note || '')}</textarea>
                                        </div>
                                        
                                        <div class="form-group signature-section" style="grid-column: span 2; margin-top: 10px; border-top: 1px solid #d8e2ed; padding-top: 20px;">
                                            <h4 style="margin-bottom: 15px;">Подпись должностного лица</h4>
                                            
                                            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px; align-items: start;">
                                                <div>
                                                    <label>Нарисуйте подпись:</label>
                                                    <div style="border: 2px dashed #1e3a5f; border-radius: 8px; padding: 5px; background: #fff; margin-top: 5px;">
                                                        <canvas id="signatureCanvas" width="250" height="120" style="width: 100%; height: auto; background: white; border: 1px solid #d8e2ed; border-radius: 4px; cursor: crosshair;"></canvas>
                                                    </div>
                                                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                                                        <button type="button" id="clearSignatureBtn" class="small secondary">🧹 Очистить</button>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label>Предпросмотр:</label>
                                                    <div style="border: 1px solid #d8e2ed; border-radius: 8px; padding: 15px; background: #f8fafd; margin-top: 5px; min-height: 120px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                                        <canvas id="signaturePreviewCanvas" width="200" height="80" style="width: 100%; height: auto; background: white; border: 1px solid #d8e2ed; border-radius: 4px; display: none;"></canvas>
                                                        <div id="noSignatureMessage" style="color: #6b7f99; text-align: center;">
                                                            ⚠️ Подпись не добавлена
                                                        </div>
                                                    </div>
                                                    <input type="hidden" id="signature_data" value="${escapeHtml(protocol?.signature_data || '')}">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="form-group" style="grid-column: span 2; margin-top: 10px;">
                                            <label>Статус</label>
                                            <select id="status">
                                                <option value="active" ${protocol?.status === 'active' ? 'selected' : ''}>Действующий</option>
                                                <option value="archived" ${protocol?.status === 'archived' ? 'selected' : ''}>Архивный</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="flex-row" style="justify-content: space-between; align-items: center; margin-top: 20px;">
                                    <button type="button" id="cancelProtocolBtn" class="secondary">Отмена</button>
                                    <div class="flex-row" style="gap: 8px;">
                                        <button type="button" id="prevTabBtn" class="secondary" style="display: none;">← Назад</button>
                                        <button type="button" id="nextTabBtn" class="secondary">Далее →</button>
                                        <button type="submit" id="saveProtocolBtn" class="primary">
                                            💾 Сохранить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
			if (window.initVehicleSearchableFields) {
				setTimeout(() => {
					initVehicleSearchableFields();
				}, 100);
			}

            // Инициализация подписи с загрузкой существующей
            initSignatureCanvas(protocol?.signature_data);

            // Настройка навигации по вкладкам
            const tabs = ['main', 'violator', 'vehicle', 'offense', 'additional'];
            let currentTabIndex = 0;
            const tabContents = modal.querySelectorAll('.tab-content');
            const stepIndicators = modal.querySelectorAll('.step-indicator');
            const stepLabels = modal.querySelectorAll('.step-label');
            const stepElements = modal.querySelectorAll('.step');
            const prevBtn = document.getElementById('prevTabBtn');
            const nextBtn = document.getElementById('nextTabBtn');

            function updateTabDisplay() {
                tabContents.forEach(content => content.classList.add('hidden'));
                tabContents[currentTabIndex].classList.remove('hidden');

                stepIndicators.forEach((indicator, index) => {
                    if (index < currentTabIndex) {
                        indicator.style.background = '#1e3a5f';
                        indicator.style.color = 'white';
                        indicator.style.borderColor = '#1e3a5f';
                        indicator.innerHTML = '✓';
                    } else if (index === currentTabIndex) {
                        indicator.style.background = '#1e3a5f';
                        indicator.style.color = 'white';
                        indicator.style.borderColor = '#1e3a5f';
                        indicator.innerHTML = index + 1;
                    } else {
                        indicator.style.background = '#eef3fa';
                        indicator.style.color = '#6b7f99';
                        indicator.style.borderColor = '#d8e2ed';
                        indicator.innerHTML = index + 1;
                    }
                });

                stepLabels.forEach((label, index) => {
                    label.style.color = index <= currentTabIndex ? '#1e3a5f' : '#6b7f99';
                    label.style.fontWeight = index <= currentTabIndex ? '600' : '400';
                });

                if (prevBtn) {
                    prevBtn.style.display = currentTabIndex === 0 ? 'none' : 'inline-flex';
                }

                if (nextBtn) {
                    if (currentTabIndex === tabs.length - 1) {
                        nextBtn.style.display = 'none';
                    } else {
                        nextBtn.style.display = 'inline-flex';
                    }
                }
            }

            function switchToTab(tabName) {
                const index = tabs.indexOf(tabName);
                if (index !== -1 && index !== currentTabIndex) {
                    currentTabIndex = index;
                    updateTabDisplay();
                }
            }

            stepElements.forEach(step => {
                const tabName = step.dataset.tab;
                step.addEventListener('click', () => switchToTab(tabName));
            });

            function validateCurrentTab(index) {
                const tabName = tabs[index];
                let isValid = true;
                let errorMessage = '';

                switch (tabName) {
                    case 'main':
                        if (!document.getElementById('protocol_date')?.value) {
                            errorMessage = 'Заполните дату составления';
                            isValid = false;
                        } else if (!document.getElementById('protocol_time')?.value) {
                            errorMessage = 'Заполните время составления';
                            isValid = false;
                        } else if (!document.getElementById('protocol_place')?.value?.trim()) {
                            errorMessage = 'Заполните место составления';
                            isValid = false;
                        } else if (!document.getElementById('official_name')?.value?.trim()) {
                            errorMessage = 'Заполните данные должностного лица';
                            isValid = false;
                        }
                        break;

                    case 'violator':
                        if (!document.getElementById('violator_lastname')?.value?.trim()) {
                            errorMessage = 'Заполните фамилию нарушителя';
                            isValid = false;
                        } else if (!document.getElementById('violator_firstname')?.value?.trim()) {
                            errorMessage = 'Заполните имя нарушителя';
                            isValid = false;
                        } else if (!document.getElementById('violator_driver_license')?.value?.trim()) {
                            errorMessage = 'Заполните водительское удостоверение';
                            isValid = false;
                        }
                        break;

                    case 'vehicle':
                        if (!document.getElementById('vehicle_make_model')?.value?.trim()) {
                            errorMessage = 'Заполните марку и модель ТС';
                            isValid = false;
                        } else if (!document.getElementById('vehicle_license_plate')?.value?.trim()) {
                            errorMessage = 'Заполните госномер';
                            isValid = false;
                        }
                        break;

                    case 'offense':
                        if (!document.getElementById('offense_datetime')?.value) {
                            errorMessage = 'Заполните дату и время правонарушения';
                            isValid = false;
                        } else if (!document.getElementById('offense_place')?.value?.trim()) {
                            errorMessage = 'Заполните место правонарушения';
                            isValid = false;
                        } else if (!document.getElementById('offense_violation_point')?.value?.trim()) {
                            errorMessage = 'Заполните пункт нормативного акта';
                            isValid = false;
                        } else if (!document.getElementById('offense_description')?.value?.trim()) {
                            errorMessage = 'Заполните описание';
                            isValid = false;
                        } else if (!document.getElementById('offense_article_number')?.value?.trim()) {
                            errorMessage = 'Заполните статью';
                            isValid = false;
                        } else if (!document.getElementById('offense_article_part')?.value?.trim()) {
                            errorMessage = 'Заполните часть статьи';
                            isValid = false;
                        }
                        break;
                }

                if (!isValid) {
                    UI.showNotification(errorMessage, 'warning');
                }

                return isValid;
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (validateCurrentTab(currentTabIndex)) {
                        if (currentTabIndex < tabs.length - 1) {
                            currentTabIndex++;
                            updateTabDisplay();
                        }
                    }
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentTabIndex > 0) {
                        currentTabIndex--;
                        updateTabDisplay();
                    }
                });
            }

            updateTabDisplay();

            // Отслеживание изменений
            const form = document.getElementById('protocolForm');
            const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', checkFormChanges);
                input.addEventListener('change', checkFormChanges);
            });

            // Обработчики закрытия
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.onclick = (e) => {
                e.preventDefault();
                safeClose();
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    e.preventDefault();
                    safeClose();
                }
            };

            const cancelBtn = document.getElementById('cancelProtocolBtn');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.preventDefault();
                    safeClose();
                };
            }

            // Отправка формы
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();

                    if (!validateCurrentTab(currentTabIndex)) {
                        return;
                    }

                    const success = await updateProtocol(id);

                    if (success) {
                        modal.remove();
                    }
                };
            }

        } else if (mode === 'view' && protocol) {
            // РЕЖИМ ПРОСМОТРА
            modal.innerHTML = `
                <div class="modal-container protocol-document-modal" style="max-width: 950px; width: 90%;">
                    <div class="modal-header">
                        <h3>${escapeHtml(title)}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-content protocol-document-content">
                        ${renderProtocolDocument(protocol)}
                        
                        <div class="protocol-view-buttons" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" id="exportPngBtn" class="secondary">📸 Сохранить как PNG</button>
                            <button type="button" id="closeProtocolBtn" class="secondary">Закрыть</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.onclick = () => modal.remove();

            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };

            const closeViewBtn = document.getElementById('closeProtocolBtn');
            if (closeViewBtn) closeViewBtn.onclick = () => modal.remove();

            const exportPngBtn = document.getElementById('exportPngBtn');
            if (exportPngBtn) {
                exportPngBtn.onclick = () => {
                    exportProtocol(id, 'png');
                };
            }
        }
    
	}

    // Функция рендеринга документа протокола для просмотра
    function renderProtocolDocument(protocol) {
        const violatorName = [protocol.violator_lastname || '', protocol.violator_firstname || '', protocol.violator_patronymic || ''].join(' ').trim();
        const offenseDateTime = protocol.offense_datetime || '';
        let offenseDay = '', offenseMonth = '', offenseYear = '', offenseHour = '', offenseMinute = '';

        if (offenseDateTime) {
            const [datePart, timePart] = offenseDateTime.split('T');
            if (datePart) {
                const [year, month, day] = datePart.split('-');
                offenseDay = day || '';
                offenseMonth = month ? getMonthGenitive(parseInt(month) - 1) : '';
                offenseYear = year ? year.slice(-2) : '';
            }
            if (timePart) {
                const [hour, minute] = timePart.split(':');
                offenseHour = hour || '';
                offenseMinute = minute || '';
            }
        }

        const protocolDate = protocol.protocol_date ? new Date(protocol.protocol_date) : new Date();
        const protocolDay = protocolDate.getDate().toString().padStart(2, '0');
        const protocolMonth = getMonthGenitive(protocolDate.getMonth());
        const protocolYear = protocolDate.getFullYear().toString().slice(-2);

        const combinedText = [
            protocol.offense_violation_point,
            protocol.offense_description,
            protocol.offense_special_equipment
        ].filter(Boolean).join(', ');

        return `
            <div class="protocol-document">
                <div class="center title">
                    <div>ПРОТОКОЛ</div>
                    <div>об административном правонарушении</div>
                    <div class="title-line handwritten" style="font-size: 24px;">№ ${escapeHtml(protocol.protocol_number || '_______________')}</div>
                    <div class="note note-center">(регистрационный номер)</div>
                </div>
                
                <div class="date-container">
                    <div class="date-item date-left">
                        <div class="date-field">
                            <div class="date-row">
                                <span>"</span>
                                <span class="line handwritten" style="width: 26px;">${protocolDay}</span>
                                <span>"</span>
                                <span class="line handwritten" style="width: 81px;">${protocolMonth}</span>
                                <span>20</span>
                                <span class="line handwritten" style="width: 26px;">${protocolYear}</span>
                                <span>г.</span>
                            </div>
                            <div class="note">(дата составления)</div>
                        </div>
                    </div>
                    
                    <div class="date-item date-center">
                        <div class="date-field">
                            <div class="date-row">
                                <span class="line handwritten" style="width: 26px;">${protocol.protocol_time ? protocol.protocol_time.split(':')[0] : ''}</span>
                                <span>час.</span>
                                <span class="line handwritten" style="width: 26px;">${protocol.protocol_time ? protocol.protocol_time.split(':')[1] : ''}</span>
                                <span>мин.</span>
                            </div>
                            <div class="note">(время составления)</div>
                        </div>
                    </div>
                    
                    <div class="date-item date-right">
                        <div class="date-field" style="width: 100%;">
                            <div class="date-row" style="justify-content: flex-end;">
                                <span class="line handwritten" style="width: 100%; text-align: right;">${escapeHtml(protocol.protocol_place || '')}</span>
                            </div>
                            <div class="note" style="text-align: right;">(место составления)</div>
                        </div>
                    </div>
                </div>
                
                <div class="block block-narrow">
                    <div class="line-row">
                        <span>Я,</span>
                        <span class="line handwritten">${escapeHtml(protocol.official_name || '')}</span>
                    </div>
                    <div class="note note-center">
                        (должность, специальное звание, подразделение, фамилия, инициалы<br>
                        должностного лица, составившего протокол)
                    </div>
                </div>
                
                <div class="block">
                    в соответствии со статьей 58 Административный регламент ГИБДД составил настоящий протокол о том, что гражданин(ка)
                </div>
                
                <div class="name-grid">
                    <div class="grid">
                        <table>
                            <tr>
                                ${Array(35).fill('').map((_, i) => `<td class="handwritten">${escapeHtml(violatorName[i] || '')}</td>`).join('')}
                            </tr>
                        </table>
                        <div class="note note-center">фамилия имя отчество</div>
                    </div>
                </div>
                
                <div class="block">
                    <div class="flex-row" style="flex-wrap: wrap; gap: 5px;">
                        <span class="line handwritten" style="flex: 2;">
                            ${protocol.violator_birth_date ? new Date(protocol.violator_birth_date).toLocaleDateString('ru-RU') + ', ' : ''}${escapeHtml(protocol.violator_birth_place || '')}
                        </span>
                        <span class="nowrap">, русским языком</span>
                        <span class="line handwritten" style="flex: 1;">${protocol.violator_russian_language_skill || ''}</span>
                    </div>
                    <div class="note flex-space-between">
                        <span>(дата и место рождения)</span>
                        <span>(владеет/не владеет)</span>
                    </div>
                </div>
                
              <div class="block">
				<div class="flex-row" style="align-items: baseline;">
					<span class="nowrap">водительское удостоверение (документ, удостоверяющий личность)</span>
					<span class="line handwritten" style="flex: 3;">${escapeHtml(protocol.violator_driver_license || '').substring(0, 19)}</span>
				</div>
				
				<div class="line handwritten" style="width: 100%; min-height: 1.2em;">
					${escapeHtml(protocol.violator_driver_license || '').length > 19
                ? escapeHtml(protocol.violator_driver_license || '').substring(19)
                : '&nbsp;'}
				</div>
				
				<div class="note note-center" style="margin-top: 2px;">(серия, номер, кем выдан)</div>
                    
                    <div style="margin-top: 0px;">
                        <div class="flex-row">
                            <span class="nowrap">управляя транспортным средством</span>
                            <span class="line handwritten" style="flex: 2;">
                                ${escapeHtml(protocol.vehicle_make_model || '')} 
                                ${protocol.vehicle_license_plate ? '(' + escapeHtml(protocol.vehicle_license_plate) + ')' : ''}
                            </span>
                        </div>
                        <div class="note note-center">(марка, гос. регистрационный знак)</div>
                    </div>
                    
                    <div style="margin-top: 0px;">
    <div class="flex-row" style="align-items: baseline;">
        <span class="nowrap">принадлежащим</span>
        <span class="line handwritten" style="flex: 3;">${escapeHtml(protocol.vehicle_owner || '').substring(0, 66)}</span>
    </div>
    
    <div class="line handwritten" style="width: 100%; min-height: 1.2em;">
        ${escapeHtml(protocol.vehicle_owner || '').length > 66
                ? escapeHtml(protocol.vehicle_owner || '').substring(66)
                : '&nbsp;'}
    </div>
    
    <div class="note note-center" style="margin-top: 2px;">(фамилия, имя, отчество, организация)</div>
</div>
					
					
                    
                    <div style="margin-top: 0px;"></div>
                    
                    <div class="flex-row" style="margin-top:0px;">
                        <span class="nowrap">состоящим на учете</span>
                        <span class="line handwritten" style="flex: 2;">${escapeHtml(protocol.vehicle_registered_info || '')}</span>
                    </div>
                </div>
                
                <div class="block" style="width: 100%; margin: 10px 0;">
                    <div class="flex-row" style="gap: 10px;">
                        <div class="flex-row" style="flex: 1.7; flex-wrap: wrap;">
                            <span>"</span>
                            <span class="line handwritten" style="width: 26px;">${offenseDay}</span>
                            <span>"</span>
                            <span class="line handwritten" style="width: 81px;">${offenseMonth}</span>
                            <span>20</span>
                            <span class="line handwritten" style="width: 26px;">${offenseYear}</span>
                            <span> г. в "</span>
                            <span class="line handwritten" style="width: 26px;">${offenseHour}</span>
                            <span>" час. "</span>
                            <span class="line handwritten" style="width: 26px;">${offenseMinute}</span>
                            <span>" мин.</span>
                        </div>
                        
                        <div class="flex-row" style="flex: 1;">
                            <span>на</span>
                            <span class="line handwritten" style="flex: 1;">${escapeHtml(protocol.offense_place || '')}</span>
                        </div>
                    </div>
                    
                    <div class="offense-note-row">
                        <div class="offense-note-left">(дата, время совершения административного правонарушения)</div>
                        <div class="offense-note-right">(место совершения правонарушения)</div>
                    </div>
                </div>
                
               <div class="flex-row" style="align-items: baseline;">
    <span class="nowrap">совершил(а) нарушение</span>
    <span class="line handwritten" style="flex: 3;">${escapeHtml(combinedText).substring(0, 57)}</span>
</div>
<div class="note note-center" style="margin: 0;">
    (пункт нормативного правового акта, существо нарушения,
</div>
<div class="line handwritten" style="width: 100%; min-height: 1.2em; margin-top: 0px;">
    ${escapeHtml(combinedText).length > 57
                ? escapeHtml(combinedText).substring(57)
                : '&nbsp;'}
</div>

<div class="note note-center">
    при применении спец. тех. средств указываются их показания, наименование, номер)
</div>
                
                <div class="flex-row" style="gap: 5px; flex-wrap: wrap; width: 100%; margin-top: 10px;">
                    <span>ответственность за которое предусмотрена частью</span>
                    <span class="line handwritten" style="width: 50px; text-align:center;">${escapeHtml(protocol.offense_article_part || '')}</span>
                    <span>статьи</span>
                    <span class="line handwritten" style="width: 50px; text-align:center;">${escapeHtml(protocol.offense_article_number || '')}</span>
                    <span>Кодекса</span>
					<span>Республики Провинция об административных правонарушениях.</span>
                </div>
                
                <div class="block" style = "margin-top: 20px;"">
                    Лицу, в отношении которого возбуждено дело об административном правонарушении, разъясненыправа, предусмотренные статьей 30 Конституции Республики Провинция.
                </div>
                
                <div class="block" style = "margin-top: 20px;"">
                    Лицо, в отношении которого возбуждено дело об административном правонарушении, ознакомлено с протоколом.
                </div>
                
                <div class="flex-row" style="align-items: baseline; margin-top: 10px;">
    <span class="nowrap">Объяснения и замечания по содержанию протокола</span>
    <span class="line handwritten" style="flex: 3;">${escapeHtml(protocol.explanatory_note || '').substring(0, 34)}</span>
</div>

<!-- Первая дополнительная строка (символы 57-114) -->
<div class="line handwritten" style="width: 100%; min-height: 1.2em; margin-top: 0px;">
    ${escapeHtml(protocol.explanatory_note || '').length > 34
                ? escapeHtml(protocol.explanatory_note || '').substring(34, 113)
                : '&nbsp;'}
</div>

<!-- Вторая дополнительная строка (символы 114-171) -->
<div class="line handwritten" style="width: 100%; min-height: 1.2em; margin-top: 0px;">
    ${escapeHtml(protocol.explanatory_note || '').length > 113
                ? escapeHtml(protocol.explanatory_note || '').substring(113, 192)
                : '&nbsp;'}
</div>
                

                
                <div class="block" style="margin: 15px 0; text-align: center;">
                    Подпись лица, в отношении которого возбуждено дело об административном правонарушении
                </div>
                
                <div class="flex-row" style="justify-content: flex-end; margin-top: 40px;">
                    <span class="line handwritten" style="width: 250px;"></span>
                </div>
                
                <div class="block" style="margin: 15px 0; margin-top: 40px;">
                    <div style="display: flex; align-items: baseline; justify-content: flex-end; flex-wrap: wrap; gap: 10px;">
                        <span style="white-space: nowrap;">Подпись должностного лица, составившего протокол</span>
                        <div style="position: relative; width: 250px; height: 40px; border-bottom: 1px solid #000;">
                            ${protocol?.signature_data ? `
                            <img src="${escapeHtml(protocol.signature_data)}" 
                                 style="position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); max-width: 250px; max-height: 70px;">
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="block" style="margin: 15px 0; margin-top: 40px; text-align: right;">
                    <div class="flex-row" style="justify-content: flex-end;">
                        <span>Копию протокола получил(а)</span>
                        <span class="line handwritten" style="width: 300px; margin-left: 10px;"></span>
                    </div>
                    <div class="note" style="text-align: right;">
                        (подпись лица, в отношении которого<br>
						возбуждено дело об адм. правонарушении)
                    </div>
                </div>
            </div>
        `;
    }

    // Инициализация canvas для подписи
    function initSignatureCanvas(existingSignature = null) {
        const canvas = document.getElementById('signatureCanvas');
        const previewCanvas = document.getElementById('signaturePreviewCanvas');
        const noSignatureMessage = document.getElementById('noSignatureMessage');
        const signatureDataInput = document.getElementById('signature_data');

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
            };
            img.src = existingSignature;
        }

        const clearBtn = document.getElementById('clearSignatureBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                updatePreview();
                if (noSignatureMessage) noSignatureMessage.style.display = 'block';
                if (previewCanvas) previewCanvas.style.display = 'none';
            });
        }
    }

    async function deleteProtocol(id) {
        Auth.ping();

        if (!canDeleteProtocol()) {
            UI.showNotification('У вас нет прав на удаление протоколов', 'error');
            return;
        }

        const protocol = protocolsCache.find(p => p.id == id);
        if (!protocol) {
            UI.showNotification('Протокол не найден', 'error');
            return;
        }

        if (!confirm(`Удалить протокол №${protocol.protocol_number}? Это действие необратимо.`)) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('protocols')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Delete error:', error);
                if (error.code === '42501') {
                    UI.showNotification('Ошибка прав доступа: вы не можете удалять протоколы', 'error');
                } else {
                    UI.showNotification('Ошибка при удалении: ' + error.message, 'error');
                }
                return;
            }

            if (Logger && Logger.ACTION_TYPES) {
                Logger.log('protocol_delete', {
                    protocol_number: protocol.protocol_number,
                    deleted_by: Auth.getCurrentUser()?.nickname
                }, 'protocol', protocol.protocol_number);
            }

            UI.showNotification('Протокол удален', 'success');

            await loadProtocolsList();
            filterAndRenderProtocols();

        } catch (error) {
            console.error('Error in deleteProtocol:', error);
            UI.showNotification('Ошибка при удалении: ' + error.message, 'error');
        }
    }

    async function exportProtocol(id, format = 'png') {
        Auth.ping();

        const protocol = protocolsCache.find(p => p.id == id);
        if (!protocol) {
            UI.showNotification('Протокол не найден', 'error');
            return;
        }

        const exportContainer = document.createElement('div');
        exportContainer.style.position = 'fixed';
        exportContainer.style.left = '-9999px';
        exportContainer.style.top = '0';
        exportContainer.style.width = '800px';
        exportContainer.style.backgroundColor = 'white';
        exportContainer.style.padding = '40px';
        exportContainer.style.zIndex = '9999';
        exportContainer.style.fontFamily = '"Courier New", monospace';
        exportContainer.style.fontSize = '14px';
        exportContainer.style.lineHeight = '1.35';

        exportContainer.innerHTML = renderProtocolDocument(protocol);
        document.body.appendChild(exportContainer);

        try {
            if (format === 'png') {
                await new Promise(resolve => setTimeout(resolve, 300));

                const canvas = await html2canvas(exportContainer, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: false,
                    useCORS: true,
                    windowWidth: 800
                });

                const link = document.createElement('a');
                link.download = `protocol-${protocol.protocol_number}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

                UI.showNotification('Протокол сохранён как PNG', 'success');

                if (Logger && Logger.ACTION_TYPES) {
                    Logger.log('protocol_export', {
                        protocol_number: protocol.protocol_number,
                        format: format,
                        exported_by: Auth.getCurrentUser()?.nickname
                    }, 'protocol', protocol.protocol_number);
                }
            }
        } catch (error) {
            console.error('Error exporting protocol:', error);
            UI.showNotification('Ошибка при экспорте: ' + error.message, 'error');
        } finally {
            document.body.removeChild(exportContainer);
        }
    }

    function getTodayCount() {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        return protocolsCache.filter(p => {
            if (!p.protocol_date) return false;
            const protocolDate = new Date(p.protocol_date);
            return protocolDate >= startOfDay && protocolDate <= endOfDay;
        }).length;
    }

    function getMonthCount() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        return protocolsCache.filter(p => {
            if (!p.protocol_date) return false;
            const protocolDate = new Date(p.protocol_date);
            return protocolDate.getFullYear() === currentYear &&
                protocolDate.getMonth() === currentMonth;
        }).length;
    }

    async function updateDashboardStats() {
        const todayCountSpan = document.getElementById('statsTodayCount');
        const monthCountSpan = document.getElementById('statsMonthCount');

        if (!todayCountSpan || !monthCountSpan) return;

        todayCountSpan.innerHTML = '<span class="loading-spinner-small"></span>';
        monthCountSpan.innerHTML = '<span class="loading-spinner-small"></span>';

        try {
            if (protocolsCache.length === 0) {
                await loadProtocolsList();
            }

            todayCountSpan.textContent = getTodayCount();
            monthCountSpan.textContent = getMonthCount();
        } catch (error) {
            console.error("Error updating dashboard stats:", error);
            todayCountSpan.textContent = 'Ошибка';
            monthCountSpan.textContent = 'Ошибка';
        }
    }

    return {
        initProtocolsList,
        loadProtocolsList,
        generateProtocolNumber,
        canEditProtocol,
        canDeleteProtocol,
        filterProtocolsList,
        renderProtocolsList,
        filterAndRenderProtocols,
        openProtocolModal,
        deleteProtocol,
        exportProtocol,
        PROTOCOL_STATUS,
        addOffenseToList,
        editOffense,
        removeOffense,
        clearOffensesList,
        createMultipleProtocols,
        getTodayCount,
        getMonthCount,
        updateDashboardStats
    };
})();

window.Protocol = Protocol;