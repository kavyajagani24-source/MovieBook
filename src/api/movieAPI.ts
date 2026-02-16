import axios from 'axios';
const API = 'http://localhost:5000/api/movies';

export const movieAPI = {
  getAll: (params?: any) => axios.get(API, { params }),
  getById: (m_id: number) => axios.get(`${API}/${m_id}`),
  create: (data: any) => axios.post(API, data),
  update: (m_id: number, data: any) =>
    axios.put(`${API}/${m_id}`, data),
  delete: (m_id: number) => axios.delete(`${API}/${m_id}`),
};
