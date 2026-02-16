
import axios from 'axios';
const API = 'http://localhost:5000/api/auth';

export const authAPI = {
  login: (data) => axios.post(`${API}/login`, data),
  signup: (data) => axios.post(`${API}/signup`, data),
  logout: () => axios.post(`${API}/logout`)
};
