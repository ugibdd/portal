// Модуль аутентификации
const Auth = (function() {
    let currentUser = null;
    let inactivityTimer = null;
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
    const LAST_ACTIVITY_KEY = 'lastActivityTime';

    // Обновление времени последней активности
    function updateLastActivity() {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }

    // Проверка, не истекло ли время бездействия
    function checkInactivityOnLoad() {
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivity) return false;
        
        const elapsed = Date.now() - parseInt(lastActivity);
        if (elapsed > INACTIVITY_TIMEOUT) {
            return true;
        }
        return false;
    }

    // Сброс таймера бездействия
    function resetInactivityTimer() {
        updateLastActivity();
        
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
        
        if (currentUser) {
            inactivityTimer = setTimeout(() => {
                handleInactivityLogout();
            }, INACTIVITY_TIMEOUT);
        }
    }

    // Обработка выхода по бездействию
    function handleInactivityLogout() {
        if (!currentUser) return;
        
        UI.showNotification('Сессия завершена из-за длительного бездействия', 'warning');
        logout();
        UI.showAuthMode();
        
        const elements = UI.getElements();
        if (elements.loginInput) elements.loginInput.value = '';
        if (elements.passwordInput) elements.passwordInput.value = '';
        
        window.location.hash = '';
    }

    // Установка слушателей событий для отслеживания активности
    function setupActivityListeners() {
        const events = [
            'mousedown', 'mousemove', 'keydown', 
            'scroll', 'touchstart', 'click', 'wheel'
        ];
        
        const resetTimer = () => resetInactivityTimer();
        
        events.forEach(event => {
            document.removeEventListener(event, resetTimer);
            document.addEventListener(event, resetTimer);
        });
    }

    // Очистка слушателей событий
    function removeActivityListeners() {
        const events = [
            'mousedown', 'mousemove', 'keydown', 
            'scroll', 'touchstart', 'click', 'wheel'
        ];
        
        const resetTimer = () => resetInactivityTimer();
        
        events.forEach(event => {
            document.removeEventListener(event, resetTimer);
        });
    }

    // Восстановление сессии из localStorage
    function restoreSession() {
        const saved = localStorage.getItem('user');
        if (!saved) {
            return null;
        }
        
        if (checkInactivityOnLoad()) {
            logout();
            return null;
        }
        
        try {
            const user = JSON.parse(saved);
            currentUser = user;
            
            if (currentUser) {
                setupActivityListeners();
                resetInactivityTimer();
            }
            
            return currentUser;
        } catch (e) {
            return null;
        }
    }

    // Сохранение сессии
    function saveSession(user) {
        currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        updateLastActivity();
        
        setupActivityListeners();
        resetInactivityTimer();
    }

    // Вход в систему
    async function login(nickname, password) {
        const { data, error } = await supabaseClient
            .from('employees')
            .select('*')
            .eq('nickname', nickname)
            .eq('password', password)
            .maybeSingle();

        if (error || !data) {
            throw new Error('Неверные данные для входа');
        }

        saveSession(data);
        return data;
    }

    // Выход из системы
    function logout() {
        currentUser = null;
        localStorage.removeItem('user');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        
        removeActivityListeners();
    }

    // Получение текущего пользователя
    function getCurrentUser() {
        return currentUser;
    }

    // Проверка прав администратора
    function isAdmin() {
        return currentUser?.category === 'Администратор';
    }

    // Продление сессии при действиях
    function ping() {
        resetInactivityTimer();
    }

    return {
        restoreSession,
        login,
        logout,
        getCurrentUser,
        isAdmin,
        ping
    };
})();

window.Auth = Auth;