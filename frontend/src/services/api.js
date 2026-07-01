import axios from 'react';
// Fixing axios import
import axiosInstance from 'axios';
import toast from 'react-hot-toast';

const api = axiosInstance.create({
  baseURL: `http://${window.location.hostname}:8081/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('name');
      localStorage.removeItem('sessionToken');
      
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/login';
        toast.error('Session expired. Please log in again.');
      } else {
        window.dispatchEvent(new Event('auth-error'));
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.data && error.response.data.message) {
      toast.error(error.response.data.message);
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error('An unexpected error occurred.');
    }
    return Promise.reject(error);
  }
);

export default api;
