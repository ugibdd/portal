// Главный модуль приложения
const App = (function() {
    const elements = UI.getElements();

    // Инициализация приложения
    function init() {
        // Проверка сессии
        const user = Auth.restoreSession();
        
        if (user) {
            UI.showAppMode(user);
            handleRouting();
        } else {
            UI.showAuthMode();
        }

        // Привязка обработчиков
        bindEvents();
        
        // Слушаем изменения hash
        window.addEventListener('hashchange', handleRouting);
    }

    // Обработка роутинга
    function handleRouting() {
        if (!Auth.getCurrentUser()) {
            window.location.hash = '';
            return;
        }

        Auth.ping(); // Сбрасываем таймер при смене страницы

        const hash = window.location.hash.slice(1) || 'home';
        
        switch(hash) {
            case 'home':
                showHome();
                break;
            case 'profile':
                showProfile();
                break;
            case 'kusp':
                KUSP.initKuspList();
                break;
            case 'admin':
                if (Auth.isAdmin()) {
                    Admin.initAdminPanel();
                } else {
                    window.location.hash = 'home';
                }
                break;
            default:
                window.location.hash = 'home';
        }
    }

    // Привязка событий
    function bindEvents() {
        elements.loginBtn.onclick = handleLogin;
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
        
        elements.navAdmin.onclick = (e) => {
            e.preventDefault();
            if (Auth.isAdmin()) {
                window.location.hash = 'admin';
            }
        };
    }

    // Обработка входа
    async function handleLogin() {
        const login = elements.loginInput.value.trim();
        const pass = elements.passwordInput.value.trim();

        if (!login || !pass) {
            UI.showNotification('Введите логин и пароль', 'warning');
            return;
        }

        try {
            const user = await Auth.login(login, pass);
            UI.showAppMode(user);
            window.location.hash = 'home';
            UI.showNotification('Добро пожаловать, ' + user.nickname, 'success');
        } catch (error) {
            UI.showNotification(error.message, 'error');
        }
    }

    // Обработка выхода
    function handleLogout() {
        Auth.logout();
        UI.showAuthMode();
        elements.loginInput.value = '';
        elements.passwordInput.value = '';
        window.location.hash = '';
    }

    // Показать главную
    function showHome() {
        const clone = UI.loadTemplate('home');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);
        
        const user = Auth.getCurrentUser();
        document.getElementById('greetingMessage').innerText = `👤 ${user.nickname} (${user.rank})`;
        
        UI.setActiveTab(elements.navHome);
    }

    // Показать профиль
    function showProfile() {
        const clone = UI.loadTemplate('profile');
        UI.clearMain();
        document.getElementById('mainApp').appendChild(clone);
        
        const user = Auth.getCurrentUser();
        document.getElementById('profileNickname').textContent = user.nickname;
        document.getElementById('profileRank').textContent = user.rank;
        document.getElementById('profileDepartment').textContent = user.department;
        document.getElementById('profileCategory').textContent = user.category;
        
        UI.setActiveTab(elements.navProfile);
    }

    return {
        init
    };
})();

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => App.init());