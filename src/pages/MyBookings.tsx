import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { bookingAPI } from '@/lib/api';
import { BookingWithDetails, Customer } from '@/types';
import { Calendar, MapPin, Clock, Ticket, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Listen for visibility changes to refetch when user returns to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Page became visible, refetch bookings silently
        fetchBookings(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchBookings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const response = await bookingAPI.getByCustomer((user as Customer).c_id);
      setBookings(response.data);
      if (silent) toast.success('Bookings updated');
    } catch (error) {
      if (!silent) {
        toast.error('Failed to fetch bookings');
      }
      // Mock data for demo
      setBookings([
        {
          booking_id: 1,
          booking_date: '2024-01-15',
          ticket_no: 1001,
          c_id: 1,
          movie: {
            m_id: 1,
            m_name: 'The Dark Cinema',
            release_date: '2024-01-15',
            director: 'Christopher Nolan',
            actors: 'Christian Bale',
          },
          theatre: {
            t_id: 1,
            t_name: 'PVR Cinemas',
            location: 'Downtown Plaza',
          },
          ticket: {
            ticket_no: 1001,
            show_id: 1,
            show_date: '2024-01-20',
            show_time: '18:00',
            seat_no: 15,
            hall_no: 2,
            t_id: 1,
            price: 250,
          },
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBookings(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
              <p className="text-muted-foreground">View and manage your movie bookings</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {bookings.length > 0 ? (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card key={booking.booking_id} className="p-6 border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">
                          {booking.movie?.m_name || 'Movie Name'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Booking ID: #{booking.booking_id}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{booking.ticket?.show_date || booking.booking_date}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{booking.ticket?.show_time || 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{booking.theatre?.t_name || 'Theatre'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Ticket className="h-4 w-4" />
                          <span>Seat {booking.ticket?.seat_no || 'N/A'}, Hall {booking.ticket?.hall_no || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Amount Paid:</span>
                        <span className="text-lg font-bold text-primary">
                          ₹{booking.ticket?.price || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="min-w-32">
                        View Ticket
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-border">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-6">
                Start booking your favorite movies now!
              </p>
              <Button onClick={() => navigate('/')}>
                Browse Movies
              </Button>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MyBookings;
