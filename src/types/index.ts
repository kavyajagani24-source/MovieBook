// Database entity types matching the MySQL schema

export interface Theatre {
  t_id: number;
  t_name: string;
  location: string;
}

export interface Seats {
  seat_id: number;
  seat_name: string;
  no_of_seats: number;
  t_id: number;
}

export interface Admin {
  admin_id: number;
  password: string;
  salary: number;
}

export interface Discount {
  offer_id: number;
  m_name: string;
  price: number;
}

export interface Movie {
  m_id: number;
  m_name: string;
  release_date: string;
  director: string;
  actors: string;
  poster_url?: string;
  description?: string;
  rating?: string;
  genre?: string;
}

export interface Show {
  show_id: number;
  st_time: string;
  end_time: string;
  language: string;
  duration_weeks: number;
  t_id: number;
  m_id?: number;
  show_date?: string;
}

export interface Ticket {
  ticket_no: number;
  show_id: number;
  show_date: string;
  show_time: string;
  seat_no: number;
  hall_no: number;
  t_id: number;
  price: number;
  admin_id?: number;
}

export interface Customer {
  c_id: number;
  c_name: string;
  email_id: string;
  phone_no: string;
  password: string;
  dob: string;
}

export interface Booking {
  booking_id: number;
  booking_date: string;
  ticket_no: number;
  c_id: number;
}

// Auth types
export interface LoginResponse {
  token: string;
  user: Customer | Admin;
}

export interface SignupData {
  c_name: string;
  email_id: string;
  phone_no: string;
  password: string;
  dob: string;
}

// Extended types for UI
export interface MovieWithShows extends Movie {
  shows?: Show[];
}

export interface BookingWithDetails extends Booking {
  ticket?: Ticket;
  movie?: Movie;
  theatre?: Theatre;
}

export interface ShowWithDetails extends Show {
  movie?: Movie;
  theatre?: Theatre;
}
