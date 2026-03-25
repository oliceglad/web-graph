import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api'
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (data: any) => {
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);
      return apiClient.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
  },
  register: (data: any) => apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
  updateMe: (data: any) => apiClient.put('/auth/me', data),
};

export const projectsApi = {
  getAll: () => apiClient.get('/projects/'),
  getById: (id: string | number) => apiClient.get(`/projects/${id}`),
  create: (data: any) => apiClient.post('/projects/', data),
  update: (id: string | number, data: any) => apiClient.put(`/projects/${id}`, data),
  updateGraph: (id: string | number, data: any) => apiClient.put(`/projects/${id}/graph`, data),
  updateShare: (id: string | number, data: any) => apiClient.put(`/projects/${id}/share`, data),
  importBoard: (data: any) => apiClient.post('/projects/import', data),
  delete: (id: string | number) => apiClient.delete(`/projects/${id}`),
};
