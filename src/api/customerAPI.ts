
import axios from 'axios';
const API = 'http://localhost:5000/api/customers';

export const customerAPI = {
  getProfile: (id) => axios.get(`${API}/${id}`),
  updateProfile: (id, data) => axios.put(`${API}/${id}`, data),
};
