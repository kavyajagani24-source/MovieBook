import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { seatsAPI } from '@/lib/api';
import { Seats } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SeatsManager = () => {
  const [seats, setSeats] = useState<Seats[]>([]);
  const [theatreId, setTheatreId] = useState<number>(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ seat_name: '', no_of_seats: 0, t_id: 1 });

  const fetchSeats = async (t_id = theatreId) => {
    setIsLoading(true);
    try {
      const response = await seatsAPI.getByTheatre(t_id);
      // Normalize response - ensure it's an array
      setSeats(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch seats:', error);
      setSeats([]);
      toast.error('Failed to fetch seats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats(theatreId);
  }, [theatreId]);

  const handleTheatreChange = (t_id: number) => {
    setTheatreId(t_id);
    setFormData({ ...formData, t_id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await seatsAPI.create(formData);
      toast.success('Seats created');
      setIsDialogOpen(false);
      setFormData({ seat_name: '', no_of_seats: 0, t_id: theatreId });
      fetchSeats(theatreId);
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Seats Management</h2>
        <div className="flex gap-2 items-center">
          <Label htmlFor="theatre-select" className="text-sm">Theatre:</Label>
          <Input
            id="theatre-select"
            type="number"
            min="1"
            max="10"
            value={theatreId}
            onChange={(e) => handleTheatreChange(Number(e.target.value))}
            className="w-20 px-2 py-1"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Seats</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Seats</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Seat Name</Label><Input value={formData.seat_name} onChange={(e) => setFormData({ ...formData, seat_name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Number of Seats</Label><Input type="number" value={formData.no_of_seats} onChange={(e) => setFormData({ ...formData, no_of_seats: Number(e.target.value) })} required /></div>
                <div className="space-y-2"><Label>Theatre ID</Label><Input type="number" value={formData.t_id} onChange={(e) => setFormData({ ...formData, t_id: Number(e.target.value) })} required /></div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : seats.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No seats found for this theatre</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Count</TableHead><TableHead>Theatre</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {seats.map((s) => (
              <TableRow key={s.seat_id}>
                <TableCell>{s.seat_id}</TableCell>
                <TableCell>{s.seat_name}</TableCell>
                <TableCell>{s.no_of_seats}</TableCell>
                <TableCell>{s.t_id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};

export default SeatsManager;
