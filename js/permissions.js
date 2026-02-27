// Модуль управления правами доступа
const Permissions = (function() {
    
    // Проверка, может ли пользователь управлять учётными записями
    function canManageUsers(user) {
        if (!user) return false;
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // Проверка, может ли пользователь удалить целевого пользователя
    function canDeleteUser(currentUser, targetUser) {
        if (!currentUser || !targetUser) return false;
        
        if (currentUser.category === 'Администратор') return true;
        
        if (currentUser.category === 'ВРС' && targetUser.category !== 'Администратор') return true;
        
        return false;
    }
    
    // Проверка, может ли пользователь редактировать целевого пользователя
    function canEditUser(currentUser, targetUser) {
        if (!currentUser || !targetUser) return false;
        
        if (currentUser.category === 'Администратор') return true;
        
        if (currentUser.category === 'ВРС' && targetUser.category !== 'Администратор') return true;
        
        if (currentUser.id === targetUser.id) return true;
        
        return false;
    }
    
    // Проверка доступа к админ-панели
    function canAccessAdminPanel(user) {
        if (!user) return false;
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // Проверка, может ли пользователь создавать учётные записи
    function canCreateUsers(user) {
        if (!user) return false;
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // ----- НОВЫЕ ФУНКЦИИ ДЛЯ ПРОТОКОЛОВ -----
    
    // Проверка, может ли пользователь создавать протоколы
    function canCreateProtocol(user) {
        if (!user) return false;
        // Все сотрудники могут создавать протоколы
        return ['Администратор', 'ВРС', 'РС', 'МС'].includes(user.category);
    }
    
    // Проверка, может ли пользователь редактировать протокол
    function canEditProtocol(user, protocol) {
		if (!user || !protocol) return false;
		
		// Администратор, ВРС и РС могут редактировать любые протоколы
		if (user.category === 'Администратор' || user.category === 'ВРС' || user.category === 'РС') {
			return true;
		}
		
		// МС могут редактировать только свои протоколы
		if (user.category === 'МС') {
			return protocol.created_by_id === user.auth_user_id;
		}
		
		// Остальные (если появятся) не могут редактировать
		return false;
	}
    
    // Проверка, может ли пользователь удалять протоколы
    function canDeleteProtocol(user) {
        if (!user) return false;
        // Только Администраторы и ВРС могут удалять протоколы
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // Проверка, может ли пользователь просматривать любые протоколы
    function canViewAnyProtocol(user) {
        if (!user) return false;
        // Администратор и ВРС могут просматривать любые протоколы
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // Проверка, может ли пользователь экспортировать протоколы
    function canExportProtocol(user) {
        if (!user) return false;
        // Все сотрудники могут экспортировать протоколы
        return ['Администратор', 'ВРС', 'РС', 'МС'].includes(user.category);
    }
    
    // Проверка, может ли пользователь менять статус протокола (например, отправлять в суд)
    function canChangeProtocolStatus(user) {
        if (!user) return false;
        // Только руководящий состав может менять статус
        return user.category === 'Администратор' || user.category === 'ВРС' || user.category === 'РС';
    }
    
    // ----------------------------------------
    
    // Проверка, может ли пользователь удалять записи КУСП
    function canDeleteKusp(user) {
        if (!user) return false;
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // Проверка, может ли пользователь редактировать любые записи КУСП
    function canEditAnyKusp(user) {
        if (!user) return false;
        return user.category === 'Администратор' || user.category === 'ВРС';
    }
    
    // Получение иерархии прав
    function getPermissionLevel(user) {
        if (!user) return 0;
        switch(user.category) {
            case 'Администратор': return 100;
            case 'ВРС': return 80;
            case 'РС': return 50;
            case 'МС': return 20;
            default: return 0;
        }
    }
    
    // Сравнение уровней прав
    function hasHigherOrEqualPermission(currentUser, targetUser) {
        return getPermissionLevel(currentUser) >= getPermissionLevel(targetUser);
    }

    return {
        // Существующие функции
        canManageUsers,
        canDeleteUser,
        canEditUser,
        canAccessAdminPanel,
        canCreateUsers,
        canDeleteKusp,
        canEditAnyKusp,
        getPermissionLevel,
        hasHigherOrEqualPermission,
        
        // Новые функции для протоколов
        canCreateProtocol,
        canEditProtocol,
        canDeleteProtocol,
        canViewAnyProtocol,
        canExportProtocol,
        canChangeProtocolStatus
    };
})();

window.Permissions = Permissions;