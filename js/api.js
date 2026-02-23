const API = (function() {
    const API_URL = CONFIG.API_URL;

    async function request(endpoint, options = {}) {
        const user = Auth.getCurrentUser();
        const token = user ? localStorage.getItem('token') : null;
        
        const response = await fetch(`${API_URL}/${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    function get(endpoint) {
        return request(endpoint, { method: 'GET' });
    }

    function post(endpoint, data) {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    function put(endpoint, data) {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    function del(endpoint, id) {
        return request(`${endpoint}?id=${id}`, { method: 'DELETE' });
    }

    return {
        get,
        post,
        put,
        delete: del
    };
})();

window.API = API;