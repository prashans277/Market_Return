import axios from 'axios';

const API_BASE = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only intercept true 401 Unauthorized errors from the backend API
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;

      // Prevent redirecting if already on /login to avoid page reloads
      if (currentPath !== '/login') {
        localStorage.removeItem('market_return_auth');
        localStorage.removeItem('market_return_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function getUsers(token, includeSelf = false) {
  try {
    const response = await api.get(`${API_BASE}/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params: includeSelf ? { include_self: true } : undefined,
    });
    return { success: true, users: response.data.users };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to fetch users.' };
  }
}

export async function deactivateUser(email, token) {
  try {
    await api.put(`${API_BASE}/auth/user/deactivate`, { email }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to deactivate user.' };
  }
}
