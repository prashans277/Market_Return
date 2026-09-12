import axios from 'axios';

const API_BASE = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
});

// Guard flag to prevent rapid concurrent 401 redirect loops
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;

      // Only execute redirect if not already on /login AND not already in a redirect flow
      if (currentPath !== '/login' && !isRedirecting) {
        isRedirecting = true;
        
        console.warn('[AUTH INTERCEPTOR] 401 Session Expired. Wiping auth and redirecting...');
        
        // Wiping local storage
        localStorage.removeItem('market_return_auth');
        localStorage.removeItem('market_return_user');

        // Execute hard redirect safely
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export async function getClients(token, params = {}) {
  try {
    const response = await api.get('/clients', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to fetch clients.' };
  }
}

export async function createClient(token, payload) {
  try {
    const response = await api.post('/clients', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, client: response.data.client };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to create client.' };
  }
}

export async function getClient(token, clientId) {
  try {
    const response = await api.get(`/clients/${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, client: response.data.client };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to fetch client details.' };
  }
}

export async function updateClient(token, clientId, payload) {
  try {
    const response = await api.put(`/clients/${clientId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, client: response.data.client };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to update client.' };
  }
}

export async function addClientCall(token, clientId, payload) {
  try {
    const response = await api.post(`/clients/${clientId}/calls`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, call: response.data.call };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to save call details.' };
  }
}

export async function updateClientCall(token, clientId, callId, payload) {
  try {
    const response = await api.put(`/clients/${clientId}/calls/${callId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, call: response.data.call };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to update call details.' };
  }
}

export async function getClientAudits(token, clientId) {
  try {
    const response = await api.get(`/clients/${clientId}/audits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, audits: response.data.audits || [] };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to fetch client audits.' };
  }
}

export async function getMonitoringAudits(token, params = {}) {
  try {
    const response = await api.get('/monitoring/audits', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: error?.response?.data?.error || 'Failed to fetch monitoring audits.' };
  }
}