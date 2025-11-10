# Cinema Booking App - Frontend Architecture

## 🏗️ Architecture Overview

This document explains the frontend architecture and how to connect it to a Node.js + MySQL backend.

## 📊 Component Hierarchy

```
App (AuthProvider, Router)
├── Navbar (Global navigation)
├── Home
│   └── MovieCard (Repeating)
├── MovieDetails
│   └── Show cards
├── SeatSelection
│   └── Seat grid
├── Checkout
│   └── Booking summary
├── MyBookings
│   └── Booking cards
├── Profile
│   └── User info form
└── AdminDashboard
    ├── AdminStats
    ├── MoviesManager
    ├── TheatresManager
    ├── ShowsManager
    ├── SeatsManager
    ├── TicketsManager
    ├── BookingsManager
    └── DiscountsManager
```

## 🔄 Data Flow

### Authentication Flow
```
User Input → AuthContext → API Call → Backend
                ↓
        Token Storage (localStorage)
                ↓
        Axios Interceptor (adds token to requests)
                ↓
        Protected Routes
```

### Booking Flow
```
Browse Movies → Select Movie → Choose Show → Select Seats → Checkout → Confirmation
      ↓              ↓              ↓              ↓            ↓            ↓
  GET /movies   GET /shows   Seat validation   Create ticket  Create booking  GET /bookings
```

## 🔌 API Integration Points

### File: `src/lib/api.ts`

All API calls are centralized here. Update `baseURL` to point to your backend:

```typescript
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Change this to your backend URL
});
```

### Request Flow
1. Component calls API function (e.g., `movieAPI.getAll()`)
2. Axios interceptor adds auth token from localStorage
3. Request sent to backend
4. Response handled (success/error)
5. UI updated with data or error message

### Error Handling
- 401 Unauthorized → Auto logout, redirect to `/auth`
- Other errors → Toast notification
- Network errors → Handled gracefully with fallback UI

## 🗄️ State Management

### Global State (React Context)
- **AuthContext**: User authentication, login/logout, token management

### Server State (React Query)
- Ready to use but not currently implemented
- Can be added for caching, optimistic updates, etc.

### Local State (useState)
- Component-level state for forms, UI toggles, etc.

### Persistent State (localStorage)
- `auth_token`: JWT token
- `user`: User object
- `is_admin`: Admin flag

## 🛡️ Security Features

### Client-Side Security
1. **Protected Routes**: Routes wrapped with `<ProtectedRoute>`
2. **Token Validation**: Automatic logout on 401
3. **Input Validation**: Form validation before API calls
4. **XSS Prevention**: No `dangerouslySetInnerHTML`, sanitized inputs

### Backend Requirements
1. **Password Hashing**: Use bcrypt for passwords
2. **JWT Tokens**: Sign with secret key
3. **SQL Injection Prevention**: Use parameterized queries
4. **CORS Configuration**: Allow only trusted origins
5. **Rate Limiting**: Prevent brute force attacks

## 📝 TypeScript Types

All database entities have TypeScript interfaces in `src/types/index.ts`:

```typescript
Movie, Theatre, Show, Seats, Ticket, Booking, Customer, Admin, Discount
```

These match the MySQL schema exactly, ensuring type safety.

## 🎨 Design System

### Colors (HSL)
- Background: `hsl(0 0% 4%)`
- Primary: `hsl(0 84% 60%)` (Cinema Red)
- Secondary: `hsl(45 93% 58%)` (Gold)
- Seat Available: `hsl(142 71% 45%)` (Green)
- Seat Selected: `hsl(0 84% 60%)` (Red)

### Components
- All UI components from Shadcn UI
- Customized with cinema theme
- Responsive and accessible

## 🔧 Backend Implementation Guide

### 1. Database Setup
```sql
CREATE DATABASE cinema_booking;
USE cinema_booking;

-- Create all tables as per schema
-- See README.md for full schema
```

### 2. Express Server Structure
```
backend/
├── server.js          # Main server file
├── config/
│   └── db.js          # MySQL connection
├── routes/
│   ├── auth.js        # Auth routes
│   ├── movies.js      # Movie routes
│   ├── theatres.js    # Theatre routes
│   ├── shows.js       # Show routes
│   └── bookings.js    # Booking routes
├── middleware/
│   ├── auth.js        # JWT verification
│   └── validation.js  # Input validation
└── .env               # Environment variables
```

### 3. Required Endpoints

See `README.md` for complete API documentation with request/response formats.

### 4. Database Queries Examples

**Get Movies**
```javascript
app.get('/api/movies', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Movie');
  res.json(rows);
});
```

**Create Booking**
```javascript
app.post('/api/book', authenticateToken, async (req, res) => {
  const { ticket_no, c_id } = req.body;
  const booking_date = new Date().toISOString().split('T')[0];
  
  const [result] = await pool.query(
    'INSERT INTO Booking (booking_date, ticket_no, c_id) VALUES (?, ?, ?)',
    [booking_date, ticket_no, c_id]
  );
  
  res.json({ booking_id: result.insertId });
});
```

**Get Booking with Details (JOIN)**
```javascript
app.get('/api/bookings/customer/:c_id', authenticateToken, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      b.*,
      t.show_date, t.show_time, t.seat_no, t.price,
      m.m_name,
      th.t_name, th.location
    FROM Booking b
    LEFT JOIN Tickets t ON b.ticket_no = t.ticket_no
    LEFT JOIN Shows s ON t.show_id = s.show_id
    LEFT JOIN Movie m ON s.m_id = m.m_id
    LEFT JOIN Theatre th ON t.t_id = th.t_id
    WHERE b.c_id = ?
  `, [req.params.c_id]);
  
  res.json(rows);
});
```

## 🧪 Testing Guide

### Frontend Testing (Without Backend)
1. App shows mock data automatically
2. All UI flows work with mock data
3. Error handling can be tested by checking Network tab

### Integration Testing (With Backend)
1. Start backend: `node server.js`
2. Start frontend: `npm run dev`
3. Test flows:
   - Customer signup/login
   - Browse movies
   - Book tickets
   - View bookings
   - Admin CRUD operations

## 🚀 Deployment

### Frontend Deployment
- Build: `npm run build`
- Deploy `dist/` folder to any static hosting (Vercel, Netlify, etc.)

### Backend Deployment
- Deploy to Heroku, Railway, DigitalOcean, etc.
- Update frontend `baseURL` to production backend URL
- Set environment variables (JWT_SECRET, DB_HOST, etc.)

## 📊 Database Relationships

```
Customer 1:N Booking
Booking N:1 Ticket
Ticket N:1 Show
Show N:1 Theatre
Show N:1 Movie
Theatre 1:N Seats
Admin 1:N Ticket (optional, for tracking)
Discount 1:1 Movie (by name)
```

## 🔐 Environment Variables Needed

### Backend (.env)
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cinema_booking
JWT_SECRET=your_secret_key
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [Axios Documentation](https://axios-http.com)
- [Express.js Documentation](https://expressjs.com)
- [MySQL Documentation](https://dev.mysql.com/doc)

---

This architecture ensures clean separation of concerns, type safety, and easy integration with any MySQL backend.
