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
    // Build a fixed seating layout that matches the requested map.
    // Rows: C, D, F, H, I, J, K, L, M
    // Use `null` in the seat arrays to indicate a gap (no seat), so spacing matches the photo.
    const layoutRows: { row: string; numbers: (number | null)[]; price: number }[] = [
      { row: 'C', numbers: Array.from({ length: 17 }, (_, i) => i + 1), price: 250 },
      { row: 'D', numbers: Array.from({ length: 17 }, (_, i) => i + 1), price: 250 },
      // F is centered smaller row to mimic photo
      { row: 'F', numbers: [null, 3,4,5,6,7,8,9,10,11,12,13, null], price: 250 },
      // Premium divider will be rendered between F and H
      { row: 'H', numbers: [null,1,2,3,4,5,6,7, null], price: 200 },
      { row: 'I', numbers: [null,1,2,3,4,5,6,7, null], price: 200 },
      { row: 'J', numbers: [null,1,2,3,4,5,6,7, null], price: 200 },
      { row: 'K', numbers: [null,1,2,3,4,5,6,7, null], price: 150 },
      { row: 'L', numbers: [null,1,2,3,4,5,6,7, null], price: 150 },
      { row: 'M', numbers: [null,1,2,3,4,5,6,7, null], price: 150 },
    ];

    const generatedSeats: Seat[] = [];

    // deterministic occupied pattern: pick a few positions to show as booked (grey)
    const occupiedSet = new Set<string>([
      'C5','C6','D10','F6','J2','J3','L4'
    ]);

    layoutRows.forEach((r) => {
      r.numbers.forEach((num) => {
        if (num === null) return; // gap

        const key = `${r.row}${num}`;
        generatedSeats.push({
          row: r.row,
          number: num,
          isOccupied: occupiedSet.has(key),
          isSelected: false,
          price: r.price,
        });
      });
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

  // Seating layout used for rendering (matches the initializeSeats layout)
  const seatingLayout: { row: string; numbers: (number | null)[] }[] = [
    { row: 'C', numbers: Array.from({ length: 17 }, (_, i) => i + 1) },
    { row: 'D', numbers: Array.from({ length: 17 }, (_, i) => i + 1) },
    { row: 'F', numbers: [null, 3,4,5,6,7,8,9,10,11,12,13, null] },
    { row: 'H', numbers: [null,1,2,3,4,5,6,7, null] },
    { row: 'I', numbers: [null,1,2,3,4,5,6,7, null] },
    { row: 'J', numbers: [null,1,2,3,4,5,6,7, null] },
    { row: 'K', numbers: [null,1,2,3,4,5,6,7, null] },
    { row: 'L', numbers: [null,1,2,3,4,5,6,7, null] },
    { row: 'M', numbers: [null,1,2,3,4,5,6,7, null] },
  ];

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
          {/* Use a muted gradient for the screen bar instead of the primary (red) color */}
          <div className="h-2 bg-gradient-to-r from-transparent via-muted to-transparent mb-2 rounded" />
          <p className="text-center text-sm text-muted-foreground">SCREEN</p>
        </div>

        {/* Seat Grid */}
        <div className="mb-8 overflow-x-auto">
          <div className="inline-block min-w-full">
            {seatingLayout.map(({ row, numbers }) => (
              <>
                <div key={row} className="flex items-center gap-2 mb-2 justify-center">
                  <span className="w-8 text-center font-semibold text-muted-foreground">{row}</span>
                  <div className="flex gap-2 items-center">
                    {numbers.map((num, idx) => {
                      if (num === null) {
                        // spacer to preserve layout
                        return <div key={`gap-${row}-${idx}`} style={{ width: '2.25rem', height: '2.25rem' }} />;
                      }

                      const seat = seats.find(s => s.row === row && s.number === num);
                      if (!seat) {
                        return <div key={`empty-${row}-${num}`} style={{ width: '2.25rem', height: '2.25rem' }} />;
                      }

                      return (
                        <button
                          key={`${seat.row}${seat.number}`}
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.isOccupied}
                          className={cn('seat', seat.isOccupied ? 'occupied' : seat.isSelected ? 'selected' : 'available')}
                          title={`${seat.row}${seat.number} - ₹${seat.price}`}
                          aria-pressed={seat.isSelected}
                          aria-label={`Seat ${seat.row}${seat.number} ${seat.isOccupied ? 'occupied' : seat.isSelected ? 'selected' : 'available'}`}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Render premium label as a sibling (after the F row) so it doesn't disturb row alignment */}
                {row === 'F' && (
                  <div key="premium-label" className="w-full flex justify-end pr-12 mb-4">
                    <p className="inline-block text-sm font-semibold text-muted-foreground">₹250 PREMIUM</p>
                  </div>
                )}
              </>
            ))}

            {/* Blue callout button pointing to screen (centered) */}
            <div className="w-full flex justify-center mt-4">
              <div className="inline-flex items-center gap-3 bg-blue-500 text-white px-6 py-2 rounded-full shadow-md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="-rotate-90">
                  <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-medium">All eyes this way please</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="seat legend available" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="seat legend selected" />
            <span className="text-sm text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="seat legend occupied" />
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
