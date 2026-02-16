# Cinema Booking Web App (Frontend)

Complete cinema booking system built with React, TypeScript, TailwindCSS, and Axios. This is a frontend-only implementation with clear API integration points for a Node.js + MySQL backend.

## 🎬 Features

### Customer Features
- Browse movies with search and filters
- View movie details and available shows
- Interactive seat selection
- Secure booking and checkout flow
- View booking history
- Profile management
- User authentication (signup/login)

### Admin Features
- Complete admin dashboard
- CRUD operations for:
  - Movies
  - Theatres
  - Shows
  - Seats
  - Tickets
  - Bookings
  - Discounts
- System statistics and analytics
- Admin authentication

## 🗂️ Database Schema

The frontend is designed to work with these MySQL tables:

```sql
Theatre (t_id, t_name, location)
Seats (seat_id, seat_name, no_of_seats, t_id)
Admin (admin_id, password, salary)
Discount (offer_id, m_name, price)
Movie (m_id, m_name, release_date, director, actors)
Shows (show_id, st_time, end_time, language, duration_weeks, t_id)
Tickets (ticket_no, show_id, show_date, show_time, seat_no, hall_no, t_id, price, admin_id)
Customer (c_id, c_name, email_id, phone_no, password, dob)
Booking (booking_id, booking_date, ticket_no, c_id)
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── admin/              # Admin dashboard components
│   ├── MovieCard.tsx       # Movie card component
│   ├── Navbar.tsx          # Navigation bar
│   └── ProtectedRoute.tsx  # Route protection wrapper
├── pages/
│   ├── Home.tsx            # Movie listing page
│   ├── Auth.tsx            # Login/Signup/Admin login
│   ├── MovieDetails.tsx    # Movie details and shows
│   ├── SeatSelection.tsx   # Interactive seat selection
│   ├── Checkout.tsx        # Booking checkout
│   ├── MyBookings.tsx      # User booking history
│   ├── Profile.tsx         # User profile management
│   └── AdminDashboard.tsx  # Admin management panel
├── contexts/
│   └── AuthContext.tsx     # Authentication context
├── lib/
│   └── api.ts              # Axios API configuration
├── types/
│   └── index.ts            # TypeScript interfaces
└── App.tsx                 # Main app with routing
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd <project-name>
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

The app will run on `http://localhost:8080`

### Build for Production
```bash
npm run build
```

## 🔌 Backend API Integration

The frontend expects a Node.js + MySQL backend running at `http://localhost:5000/api`. All API calls are configured in `src/lib/api.ts`.

### Authentication

**Customer Signup**
```
POST /api/customer/signup
Body: {
  c_name: string,
  email_id: string,
  phone_no: string,
  password: string,
  dob: string (YYYY-MM-DD)
}
Response: {
  token: string,
  user: Customer
}
```

**Customer Login**
```
POST /api/customer/login
Body: {
  email_id: string,
  password: string
}
Response: {
  token: string,
  user: Customer
}
```

**Admin Login**
```
POST /api/admin/login
Body: {
  admin_id: number,
  password: string
}
Response: {
  token: string,
  user: Admin
}
```

### Movies

**Get All Movies**
```
GET /api/movies
Query params: search, genre (optional)
Response: Movie[]
```

**Get Movie by ID**
```
GET /api/movies/:m_id
Response: Movie
```

**Create Movie (Admin)**
```
POST /api/movies
Headers: Authorization: Bearer <token>
Body: {
  m_name: string,
  release_date: string,
  director: string,
  actors: string,
  genre: string,
  rating: string,
  description: string
}
Response: Movie
```

**Update Movie (Admin)**
```
PUT /api/movies/:m_id
Headers: Authorization: Bearer <token>
Body: Partial<Movie>
Response: Movie
```

**Delete Movie (Admin)**
```
DELETE /api/movies/:m_id
Headers: Authorization: Bearer <token>
Response: { success: boolean }
```

### Theatres

**Get All Theatres**
```
GET /api/theatres
Response: Theatre[]
```

**Get Theatre by ID**
```
GET /api/theatres/:t_id
Response: Theatre
```

**Create Theatre (Admin)**
```
POST /api/theatres
Body: {
  t_name: string,
  location: string
}
Response: Theatre
```

**Update Theatre (Admin)**
```
PUT /api/theatres/:t_id
Body: Partial<Theatre>
Response: Theatre
```

**Delete Theatre (Admin)**
```
DELETE /api/theatres/:t_id
Response: { success: boolean }
```

### Seats

**Get Seats by Theatre**
```
GET /api/theatres/:t_id/seats
Response: Seats[]
```

**Create Seats (Admin)**
```
POST /api/seats
Body: {
  seat_name: string,
  no_of_seats: number,
  t_id: number
}
Response: Seats
```

**Update Seats (Admin)**
```
PUT /api/seats/:seat_id
Body: Partial<Seats>
Response: Seats
```

**Delete Seats (Admin)**
```
DELETE /api/seats/:seat_id
Response: { success: boolean }
```

### Shows

**Get Shows by Movie**
```
GET /api/movies/:m_id/shows
Response: Show[]
```

**Get All Shows**
```
GET /api/shows
Response: Show[]
```

**Create Show (Admin)**
```
POST /api/shows
Body: {
  st_time: string (HH:MM),
  end_time: string (HH:MM),
  language: string,
  duration_weeks: number,
  t_id: number
}
Response: Show
```

**Update Show (Admin)**
```
PUT /api/shows/:show_id
Body: Partial<Show>
Response: Show
```

**Delete Show (Admin)**
```
DELETE /api/shows/:show_id
Response: { success: boolean }
```

### Tickets

**Create Ticket**
```
POST /api/tickets/create
Body: {
  show_id: number,
  show_date: string (YYYY-MM-DD),
  show_time: string (HH:MM),
  seat_no: number,
  hall_no: number,
  t_id: number,
  price: number
}
Response: Ticket
```

**Get Ticket by ID**
```
GET /api/tickets/:ticket_no
Response: Ticket
```

**Get All Tickets (Admin)**
```
GET /api/tickets
Response: Ticket[]
```

### Bookings

**Create Booking**
```
POST /api/bookings
Headers: Authorization: Bearer <token>
Body: {
  ticket_no: number,
  c_id: number
}
Response: Booking
```

**Get Customer Bookings**
```
GET /api/bookings/customer/:c_id
Headers: Authorization: Bearer <token>
Response: BookingWithDetails[]
```

**Get All Bookings (Admin)**
```
GET /api/bookings/all
Headers: Authorization: Bearer <token>
Response: Booking[]
```

**Delete Booking (Admin)**
```
DELETE /api/bookings/:booking_id
Headers: Authorization: Bearer <token>
Response: { success: boolean }
```

### Discounts

**Get All Discounts**
```
GET /api/discounts
Response: Discount[]
```

**Create Discount (Admin)**
```
POST /api/discounts
Body: {
  m_name: string,
  price: number
}
Response: Discount
```

**Update Discount (Admin)**
```
PUT /api/discounts/:offer_id
Body: Partial<Discount>
Response: Discount
```

**Delete Discount (Admin)**
```
DELETE /api/discounts/:offer_id
Response: { success: boolean }
```

### Admin Stats

**Get Statistics**
```
GET /api/admin/stats
Headers: Authorization: Bearer <token>
Response: {
  totalRevenue: number,
  totalBookings: number,
  totalMovies: number,
  totalCustomers: number
}
```

## 🔐 Authentication Flow

1. User logs in via `/auth` page
2. Backend returns JWT token and user data
3. Token stored in `localStorage` as `auth_token`
4. Axios interceptor adds token to all requests
5. Protected routes check for valid token
6. 401 responses trigger automatic logout

## 📊 Sample Seed Data

### Theatres
```json
[
  { "t_name": "PVR Cinemas", "location": "Downtown Plaza, Main Street" },
  { "t_name": "INOX Megaplex", "location": "Mall Road, City Center" },
  { "t_name": "Cinepolis", "location": "Garden City Mall" }
]
```

### Movies
```json
[
  {
    "m_name": "The Dark Cinema",
    "release_date": "2024-01-15",
    "director": "Christopher Nolan",
    "actors": "Christian Bale, Heath Ledger, Aaron Eckhart",
    "genre": "Action",
    "rating": "9.0",
    "description": "Epic superhero thriller"
  },
  {
    "m_name": "Romance in Paris",
    "release_date": "2024-02-20",
    "director": "Sofia Coppola",
    "actors": "Emma Stone, Ryan Gosling",
    "genre": "Romance",
    "rating": "8.5",
    "description": "Beautiful love story in Paris"
  }
]
```

### Shows
```json
[
  {
    "st_time": "10:00",
    "end_time": "12:30",
    "language": "English",
    "duration_weeks": 4,
    "t_id": 1
  },
  {
    "st_time": "14:00",
    "end_time": "16:30",
    "language": "English",
    "duration_weeks": 4,
    "t_id": 1
  }
]
```

### Seats
```json
[
  {
    "seat_name": "Premium",
    "no_of_seats": 50,
    "t_id": 1
  },
  {
    "seat_name": "Standard",
    "no_of_seats": 100,
    "t_id": 1
  }
]
```

### Admin Credentials
```json
{
  "admin_id": 1,
  "password": "admin123",
  "salary": 50000
}
```

## 🛠️ Backend Setup Guide

### Required Node.js Packages
```bash
npm install express mysql2 bcrypt jsonwebtoken cors dotenv
```

### MySQL Connection Example
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'cinema_booking',
  waitForConnections: true,
  connectionLimit: 10,
});
```

### JWT Middleware Example
```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

### Sample Backend Route
```javascript
// Get all movies
app.get('/api/movies', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Movie');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create booking
app.post('/api/book', authenticateToken, async (req, res) => {
  const { ticket_no, c_id } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO Booking (booking_date, ticket_no, c_id) VALUES (NOW(), ?, ?)',
      [ticket_no, c_id]
    );
    res.json({ booking_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Booking failed' });
  }
});
```

## 🎨 Frontend Features

- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Dark Theme**: Cinema-inspired dark theme with red/gold accents
- **Form Validation**: Client-side validation for all forms
- **Error Handling**: Toast notifications for all operations
- **Loading States**: Spinners and loading indicators
- **Protected Routes**: Authentication-based route protection
- **Admin Dashboard**: Complete CRUD interface for all entities

## 🔄 State Management

- **React Context**: Used for authentication state
- **React Query**: For server state management (installed, ready to use)
- **Local Storage**: For persisting auth tokens

## 📱 Routes

```
/                    - Home (Movie listing)
/auth                - Login/Signup/Admin login
/movie/:id           - Movie details and shows
/book/:showId        - Seat selection
/checkout/:showId    - Checkout and payment
/bookings            - User booking history
/profile             - User profile management
/admin               - Admin dashboard
```

## 🧪 Testing the Frontend

1. Start the app: `npm run dev`
2. The app will show mock data initially
3. To connect to backend: Update `baseURL` in `src/lib/api.ts`
4. Test customer flow: Browse → Select movie → Choose seats → Checkout
5. Test admin flow: Login as admin → Manage all entities

## 📝 Next Steps

1. **Set up MySQL database** with provided schema
2. **Create Node.js backend** using Express
3. **Implement API endpoints** as documented above
4. **Update API base URL** in `src/lib/api.ts`
5. **Seed database** with sample data
6. **Test integration** between frontend and backend

## 🤝 Contributing

This is a complete frontend implementation ready to connect to any Node.js + MySQL backend that follows the documented API structure.

## 📄 License

MIT License - Feel free to use this project for learning or commercial purposes.

---

Built with ❤️ using React, TypeScript, and TailwindCSS
