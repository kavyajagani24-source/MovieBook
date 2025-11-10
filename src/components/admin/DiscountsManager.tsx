import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { discountAPI } from '@/lib/api';
import { Discount } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DiscountsManager = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ m_name: '', price: 0 });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await discountAPI.getAll();
      setDiscounts(response.data);
    } catch (error) {
      toast.error('Failed to fetch discounts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await discountAPI.create(formData);
      toast.success('Discount created');
      setIsDialogOpen(false);
      setFormData({ m_name: '', price: 0 });
      fetchDiscounts();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Discounts Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Discount</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Discount</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Movie Name</Label><Input value={formData.m_name} onChange={(e) => setFormData({ ...formData, m_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Discounted Price</Label><Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>ID</TableHead><TableHead>Movie</TableHead><TableHead>Price</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {discounts.map((d) => (
            <TableRow key={d.offer_id}>
              <TableCell>{d.offer_id}</TableCell>
              <TableCell>{d.m_name}</TableCell>
              <TableCell>₹{d.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default DiscountsManager;
