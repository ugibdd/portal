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
        
        // Администратор может удалять всех
        if (currentUser.category === 'Администратор') return true;
        
        // ВРС может удалять всех, кроме администраторов
        if (currentUser.category === 'ВРС' && targetUser.category !== 'Администратор') return true;
        
        return false;
    }
    
    // Проверка, может ли пользователь редактировать целевого пользователя
    function canEditUser(currentUser, targetUser) {
        if (!currentUser || !targetUser) return false;
        
        // Администратор может редактировать всех
        if (currentUser.category === 'Администратор') return true;
        
        // ВРС может редактировать всех, кроме администраторов
        if (currentUser.category === 'ВРС' && targetUser.category !== 'Администратор') return true;
        
        // Пользователь может редактировать сам себя
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
        canManageUsers,
        canDeleteUser,
        canEditUser,
        canAccessAdminPanel,
        canCreateUsers,
        canDeleteKusp,
        canEditAnyKusp,
        getPermissionLevel,
        hasHigherOrEqualPermission
    };
})();

window.Permissions = Permissions;