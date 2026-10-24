import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { bookingAPI, ticketsAPI, checkoutAPI } from '@/lib/api';
import { routeDistributedCheckout } from '@/lib/distributedRouter';
import { CheckCircle, CreditCard, Ticket } from 'lucide-react';
import { Customer } from '@/types';

const Checkout = () => {
  const { showId } = useParams<{ showId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const { selectedSeats = [], totalAmount = 0, discountCode = null, show = null } = location.state || {};

  const handlePayment = async () => {
    if (!user) {
      toast.error('Please login to continue');
      navigate('/auth');
      return;
    }

    setIsProcessing(true);
    
    try {
      let ticketNo: number | null = null;
      let bookingCreated = false;

      // First, create a ticket for the first seat (we'll create one booking per first seat)
      // In a real system, you'd create one ticket per seat or handle this differently
      const firstSeat = selectedSeats[0];
      
      try {
        // Use the new checkout endpoint which creates tickets and bookings in a single transaction
        const storedUserRaw = localStorage.getItem('user');
        let storedUser: any = null;
        try { storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null; } catch(e) { storedUser = null; }
        const possibleUser = (user as any) ?? storedUser;
        const customerId = possibleUser?.c_id ?? possibleUser?.id ?? possibleUser?.customer_id ?? null;

        if (!customerId) {
          toast.error('Unable to determine customer ID. Please login again.');
          setIsProcessing(false);
          return;
        }

        // Build seats payload expected by the server
        const seatsPayload = selectedSeats.map((s: any) => ({ seat_no: `${s.row}${s.number}`, price: s.price }));

        const resp = await routeDistributedCheckout({
          show_id: Number(showId),
          show_date: show?.show_date || new Date().toISOString().split('T')[0],
          show_time: show?.st_time || show?.show_time || '18:00',
          seats: seatsPayload,
          hall_no: 1,
          t_id: show?.t_id || 1,
          admin_id: 1,
          c_id: customerId,
          offer_id: discountCode || null,
        });

        const { tickets, bookings } = resp.data;
        if (Array.isArray(bookings) && bookings.length > 0) {
          setBookingId(bookings[0]);
          setBookingComplete(true);
          toast.success('Booking confirmed!');
        } else {
          toast.error('Booking failed: no booking ids returned');
        }
      } catch (err: any) {
        console.error('Checkout error:', err.response?.data || err.message);
        const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Booking failed';
        toast.error(msg);
      }
    } catch (error) {
      toast.error('Booking failed. Please try again.');
      console.error('Booking error:', error);
    } finally {
      setIsProcessing(false);
    }
    };

  if (selectedSeats.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-xl text-muted-foreground mb-4">No seats selected</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 max-w-2xl">
          <Card className="p-8 text-center border-border">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Your booking has been successfully completed
            </p>

            {bookingId && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
                <p className="text-2xl font-bold text-primary">#{bookingId}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate('/bookings')}
              >
                View My Bookings
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Booking Details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Booking Summary
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Show ID</span>
                  <span className="font-medium">#{showId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-medium">
                    {selectedSeats.map((s: any) => `${s.row}${s.number}`).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of Tickets</span>
                  <span className="font-medium">{selectedSeats.length}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-primary">₹{totalAmount}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Method
              </h2>
              
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-auto p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-muted-foreground">Pay securely with your card</p>
                    </div>
                  </div>
                </Button>
              </div>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="md:col-span-1">
            <Card className="p-6 border-border sticky top-24">
              <h3 className="font-semibold mb-4">Price Breakdown</h3>
              
              <div className="space-y-3 mb-6">
                {selectedSeats.map((seat: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{seat.row}{seat.number}</span>
                    <span>₹{seat.price}</span>
                  </div>
                ))}
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{totalAmount}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm mb-2 text-green-600">
                      <span className="text-muted-foreground">Discount Applied</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Booking Fee</span>
                    <span>₹{((totalAmount - discountAmount) * 0.02).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">₹{((totalAmount - discountAmount) * 1.02).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Confirm & Pay'}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By proceeding, you agree to our terms and conditions
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
