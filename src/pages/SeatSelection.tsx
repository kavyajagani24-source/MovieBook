import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Seat {
  row: string;
  number: number;
  isOccupied: boolean;
  isSelected: boolean;
  price: number;
}

const SeatSelection = () => {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);

  useEffect(() => {
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/auth');
      return;
    }
    initializeSeats();
  }, []);

  const initializeSeats = () => {
    // Generate mock seats (8 rows, 12 seats each)
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 12;
    const generatedSeats: Seat[] = [];

    rows.forEach((row, rowIndex) => {
      for (let i = 1; i <= seatsPerRow; i++) {
        generatedSeats.push({
          row,
          number: i,
          isOccupied: Math.random() > 0.7, // Random occupied seats
          isSelected: false,
          price: rowIndex < 3 ? 250 : rowIndex < 6 ? 200 : 150, // Premium, Standard, Economy
        });
      }
    });

    setSeats(generatedSeats);
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.isOccupied) {
      toast.error('This seat is already occupied');
      return;
    }

    const seatIndex = seats.findIndex(s => s.row === seat.row && s.number === seat.number);
    const newSeats = [...seats];
    newSeats[seatIndex].isSelected = !newSeats[seatIndex].isSelected;
    setSeats(newSeats);

    const selected = newSeats.filter(s => s.isSelected);
    setSelectedSeats(selected);
  };

  const handleConfirmBooking = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    // Navigate to checkout with selected seats data
    navigate(`/checkout/${showId}`, { 
      state: { 
        selectedSeats,
        totalAmount: selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
      } 
    });
  };

  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Select Your Seats</h1>
          <p className="text-muted-foreground">Click on available seats to select</p>
        </div>

        {/* Screen */}
        <div className="mb-12">
          <div className="h-2 bg-gradient-to-r from-transparent via-primary to-transparent mb-2 rounded" />
          <p className="text-center text-sm text-muted-foreground">SCREEN</p>
        </div>

        {/* Seat Grid */}
        <div className="mb-8 overflow-x-auto">
          <div className="inline-block min-w-full">
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((row) => (
              <div key={row} className="flex items-center gap-2 mb-2 justify-center">
                <span className="w-8 text-center font-semibold text-muted-foreground">{row}</span>
                <div className="flex gap-2">
                  {seats
                    .filter(seat => seat.row === row)
                    .map((seat) => (
                      <button
                        key={`${seat.row}${seat.number}`}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.isOccupied}
                        className={cn(
                          'w-8 h-8 rounded-t-lg transition-all duration-200 text-xs font-medium',
                          seat.isOccupied && 'bg-seat-occupied cursor-not-allowed',
                          !seat.isOccupied && !seat.isSelected && 'bg-seat-available hover:bg-seat-available/80',
                          seat.isSelected && 'bg-seat-selected hover:bg-seat-selected/90'
                        )}
                        title={`${seat.row}${seat.number} - ₹${seat.price}`}
                      >
                        {seat.number}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t-lg bg-seat-available" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t-lg bg-seat-selected" />
            <span className="text-sm text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t-lg bg-seat-occupied" />
            <span className="text-sm text-muted-foreground">Occupied</span>
          </div>
        </div>

        {/* Booking Summary */}
        <Card className="p-6 border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Selected Seats</p>
              <p className="font-semibold text-lg">
                {selectedSeats.length > 0
                  ? selectedSeats.map(s => `${s.row}${s.number}`).join(', ')
                  : 'No seats selected'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">₹{totalAmount}</p>
              </div>
              
              <Button
                size="lg"
                onClick={handleConfirmBooking}
                disabled={selectedSeats.length === 0}
                className="min-w-32"
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default SeatSelection;
