import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { bookingAPI } from '@/lib/api';
import { Booking } from '@/types';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const BookingsManager = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingAPI.getAll();
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    }
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Bookings Management</h2>
        <Button onClick={fetchBookings}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Ticket No</TableHead><TableHead>Customer</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.booking_id}>
              <TableCell>{b.booking_id}</TableCell>
              <TableCell>{b.booking_date}</TableCell>
              <TableCell>{b.ticket_no}</TableCell>
              <TableCell>{b.c_id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default BookingsManager;
