import axios from 'axios';
const API = 'http://localhost:5000/api/discounts';

export const discountAPI = {
  getAll: () => axios.get(API),
  create: (data: any) => axios.post(API, data),
  update: (offer_id: number, data: any) => axios.put(`${API}/${offer_id}`, data),
  delete: (offer_id: number) => axios.delete(`${API}/${offer_id}`),
};
