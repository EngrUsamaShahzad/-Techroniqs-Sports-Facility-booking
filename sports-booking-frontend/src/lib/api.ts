import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/login', { email, password }),
  
  getCurrentUser: () => apiClient.get('/me'),
};

// Facilities API
export const facilitiesApi = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) =>
    apiClient.get('/facilities', { params }),
  
  getById: (id: number) => apiClient.get(`/facilities/${id}`),
  
  create: (data: { name: string; type: string; open_from: string; open_to: string }) =>
    apiClient.post('/facilities', data),
  
  update: (id: number, data: Partial<{ name: string; type: string; open_from: string; open_to: string }>) =>
    apiClient.put(`/facilities/${id}`, data),
  
  delete: (id: number) => apiClient.delete(`/facilities/${id}`),
};

// Bookings API
export const bookingsApi = {
  getAll: (params?: { page?: number; per_page?: number; facility_id?: number; my_bookings?: boolean }) =>
    apiClient.get('/bookings', { params }),
  
  getFacilitySlots: (facilityId: number, date: string) =>
    apiClient.get(`/bookings/facility/${facilityId}/slots`, { params: { date } }),
  
  create: (data: { facility_id: number; start_utc: string; end_utc: string; note?: string }) =>
    apiClient.post('/bookings', data),
  
  cancel: (id: number) => apiClient.delete(`/bookings/${id}`),
};

// Users API
export const usersApi = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) =>
    apiClient.get('/users', { params }),
  
  updateRole: (id: number, role: string) =>
    apiClient.put(`/users/${id}/role`, { role }),
};