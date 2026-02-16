import axios from 'axios';
const API = 'http://localhost:5000/api/admin';

export const adminAPI = {
  login: (data: any) => axios.post(`${API}/login`, data),
  getStats: () => axios.get(`${API}/stats`),
};
