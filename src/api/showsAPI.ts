import axios from 'axios';
const API = 'http://localhost:5000/api/shows';

export const showsAPI = {
  getByMovie: (m_id: number) => axios.get(`/movies/${m_id}/shows`),
  getAll: () => axios.get(API),
  create: (data: any) => axios.post(API, data),
  update: (show_id: number, data: any) => axios.put(`${API}/${show_id}`, data),
  delete: (show_id: number) => axios.delete(`${API}/${show_id}`),
};
