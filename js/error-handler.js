const ErrorHandler = (function() {
    const errorMessages = {
        // Ошибки аутентификации
        'Invalid login credentials': 'Неверный логин или пароль',
        'Email not confirmed': 'Email не подтверждён',
        'User already registered': 'Пользователь с таким логином уже существует',
        'Password should be at least 6 characters': 'Пароль должен содержать не менее 6 символов',
        'Password should be at least 6 characters long': 'Пароль должен содержать не менее 6 символов',
        
        // Ошибки базы данных
        'duplicate key value violates unique constraint': 'Запись с такими данными уже существует',
        'violates foreign key constraint': 'Нарушение целостности данных',
        'could not find user': 'Пользователь не найден',
        'JWT expired': 'Сессия истекла, выполните вход заново',
        'Invalid JWT': 'Сессия недействительна, выполните вход заново',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/email-already-in-use': 'Пользователь с таким логином уже существует',
        'auth/weak-password': 'Пароль слишком простой',
        
        // Сетевые ошибки
        'Failed to fetch': 'Ошибка соединения с сервером',
        'Network request failed': 'Ошибка сети',
        'timeout': 'Превышено время ожидания ответа от сервера',
        
        // Специфичные для приложения
        'Session not found': 'Сессия не найдена, выполните вход заново',
        'Admin session not found': 'Сессия администратора не найдена',
        'Not authorized': 'Нет прав для выполнения операции'
    };

    // Функция для извлечения чистого текста ошибки из объектов ошибок
    function extractErrorMessage(error) {
        if (!error) return 'Неизвестная ошибка';
        
        if (typeof error === 'string') return error;
        
        // Если это объект с message
        if (error.message) return error.message;
        
        // Если это объект с error
        if (error.error) return error.error;
        
        // Если это объект с description
        if (error.description) return error.description;
        
        // Если это объект с ошибкой от Supabase
        if (error.error_description) return error.error_description;
        
        return 'Неизвестная ошибка';
    }

    // Основная функция русификации
    function localizeError(error, defaultMessage = 'Произошла ошибка') {
        const errorText = extractErrorMessage(error);
        
        // Ищем точное соответствие
        for (const [eng, rus] of Object.entries(errorMessages)) {
            if (errorText.toLowerCase().includes(eng.toLowerCase())) {
                return rus;
            }
        }
        
        // Если не нашли, возвращаем оригинал или сообщение по умолчанию
        return errorText || defaultMessage;
    }

    // Функция для отображения ошибки через UI
    function showError(error, defaultMessage = 'Произошла ошибка') {
        const localizedMessage = localizeError(error, defaultMessage);
        UI.showNotification(localizedMessage, 'error');
        return localizedMessage;
    }

    return {
        localizeError,
        showError,
        extractErrorMessage
    };
})();

window.ErrorHandler = ErrorHandler;