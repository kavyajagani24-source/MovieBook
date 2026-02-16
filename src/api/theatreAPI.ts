import axios from 'axios';
const API = 'http://localhost:5000/api/theatres';

export const theatreAPI = {
  getAll: () => axios.get(API),
  getById: (t_id: number) => axios.get(`${API}/${t_id}`),
  create: (data: any) => axios.post(API, data),
  update: (t_id: number, data: any) => axios.put(`${API}/${t_id}`, data),
  delete: (t_id: number) => axios.delete(`${API}/${t_id}`),
};
