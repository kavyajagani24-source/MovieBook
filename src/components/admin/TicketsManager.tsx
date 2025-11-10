import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ticketsAPI } from '@/lib/api';
import { Ticket } from '@/types';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TicketsManager = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await ticketsAPI.getAll();
      setTickets(response.data);
    } catch (error) {
      toast.error('Failed to fetch tickets');
    }
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Tickets Management</h2>
        <Button onClick={fetchTickets}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Ticket No</TableHead><TableHead>Show</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Seat</TableHead><TableHead>Price</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.ticket_no}>
              <TableCell>{t.ticket_no}</TableCell>
              <TableCell>{t.show_id}</TableCell>
              <TableCell>{t.show_date}</TableCell>
              <TableCell>{t.show_time}</TableCell>
              <TableCell>{t.seat_no}</TableCell>
              <TableCell>₹{t.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default TicketsManager;
