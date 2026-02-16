import axios from 'axios';
const API = 'http://localhost:5000/api/tickets';

export const ticketsAPI = {
  create: (data: any) => axios.post(`${API}/create`, data),
  getById: (ticket_no: number) => axios.get(`${API}/${ticket_no}`),
  getAll: () => axios.get(API),
  update: (ticket_no: number, data: any) => axios.put(`${API}/${ticket_no}`, data),
  delete: (ticket_no: number) => axios.delete(`${API}/${ticket_no}`),
};
