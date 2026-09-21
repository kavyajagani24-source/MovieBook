import axios from 'axios';
import { routeDistributedCheckout } from './distributedRouter';

// Configure axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend base (used by UI to build absolute URLs for assets)
export const BACKEND_BASE = 'http://localhost:5000';

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;

// API endpoints grouped by resource

// Customer Auth
export const customerAPI = {
  // server routes are mounted at /api/customers (note plural)
  signup: (data: any) => api.post('/customers/signup', data),
  login: (data: any) => api.post('/customers/login', data),
  getProfile: (c_id: number) => api.get(`/customers/${c_id}`),
  updateProfile: (c_id: number, data: any) => api.put(`/customers/${c_id}`, data),
};

// Admin Auth
export const adminAPI = {
  login: (data: any) => api.post('/admin/login', data),
  getStats: () => api.get('/admin/stats'),
  getPublicStats: () => api.get('/admin/stats/public'),
};

// Movies
export const movieAPI = {
  getAll: (params?: any) => api.get('/movies', { params }),
  getById: (m_id: number) => api.get(`/movies/${m_id}`),
  create: (data: any) => api.post('/movies', data),
  update: (m_id: number, data: any) => api.put(`/movies/${m_id}`, data),
  delete: (m_id: number) => api.delete(`/movies/${m_id}`),
};

// Theatres
export const theatreAPI = {
  getAll: () => api.get('/theatres'),
  getById: (t_id: number) => api.get(`/theatres/${t_id}`),
  create: (data: any) => api.post('/theatres', data),
  update: (t_id: number, data: any) => api.put(`/theatres/${t_id}`, data),
  delete: (t_id: number) => api.delete(`/theatres/${t_id}`),
};

// Seats
export const seatsAPI = {
  getByTheatre: (t_id: number) => api.get(`/theatres/${t_id}/seats`),
  create: (data: any) => api.post('/seats', data),
  update: (seat_id: number, data: any) => api.put(`/seats/${seat_id}`, data),
  delete: (seat_id: number) => api.delete(`/seats/${seat_id}`),
};

// Shows
export const showsAPI = {
  getByMovie: (m_id: number) => api.get(`/movies/${m_id}/shows`),
  getAll: () => api.get('/shows'),
  create: (data: any) => api.post('/shows', data),
  update: (show_id: number, data: any) => api.put(`/shows/${show_id}`, data),
  delete: (show_id: number) => api.delete(`/shows/${show_id}`),
};

// Tickets
export const ticketsAPI = {
  create: (data: any) => api.post('/tickets/create', data),
  getById: (ticket_no: number) => api.get(`/tickets/${ticket_no}`),
  getAll: () => api.get('/tickets'),
  update: (ticket_no: number, data: any) => api.put(`/tickets/${ticket_no}`, data),
  delete: (ticket_no: number) => api.delete(`/tickets/${ticket_no}`),
};

// Bookings
export const bookingAPI = {
  create: (data: any) => api.post('/bookings', data),
  getByCustomer: (c_id: number) => api.get(`/bookings/customer/${c_id}`),
  getAll: () => api.get('/bookings/all'),
  delete: (booking_id: number) => api.delete(`/bookings/${booking_id}`),
};

// Checkout (routed through healthy distributed application servers with automatic failover)
export const checkoutAPI = {
  create: (data: any, preferredNodeId?: number) => routeDistributedCheckout(data, preferredNodeId),
};

// Discounts
export const discountAPI = {
  getAll: () => api.get('/discounts'),
  create: (data: any) => api.post('/discounts', data),
  update: (offer_id: number, data: any) => api.put(`/discounts/${offer_id}`, data),
  delete: (offer_id: number) => api.delete(`/discounts/${offer_id}`),
};

// Distributed Systems APIs
export const distributedAPI = {
  getNodes: () => api.get('/distributed/nodes'),
  getStatus: () => api.get('/distributed/status'),
  getClocks: () => api.get('/distributed/clocks'),
  getRpcLogs: () => api.get('/distributed/rpc/logs'),
  sendRpc: (method: string, params: any) => api.post('/distributed/rpc', { method, params }),
  runConcurrencyTest: (data: any) => api.post('/distributed/concurrency-test', data),
  syncBerkeleyClocks: () => api.post('/distributed/berkeley/sync'),
  runBullyElection: () => api.post('/distributed/election/bully'),
  runRingElection: () => api.post('/distributed/election/ring'),
  getReplicationStatus: () => api.get('/distributed/replication/status'),
  simulateFailure: (nodeId?: number, offline?: boolean) => api.post('/distributed/simulate-failure', { nodeId, offline }),
  promoteBackup: (nodeId?: number) => api.post(`/distributed/promote-backup`, nodeId ? { nodeId } : {}),
};
