
import axios from 'axios';
const API = 'http://localhost:5000/api/bookings';

export const bookingAPI = {
  create: (data) => axios.post(API, data),
  getByCustomer: (id) => axios.get(`${API}/customer/${id}`),
  cancel: (id) => axios.post(`${API}/${id}/cancel`)
};
