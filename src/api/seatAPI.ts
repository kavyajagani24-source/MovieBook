
import axios from 'axios';
const API = 'http://localhost:5000/api/seats';

export const seatAPI = {
  availability: (train_id, date) => 
    axios.get(`${API}/availability`, { params: { train_id, date } })
};
