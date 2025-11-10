import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { theatreAPI } from '@/lib/api';
import { Theatre } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TheatresManager = () => {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTheatre, setEditingTheatre] = useState<Theatre | null>(null);
  const [formData, setFormData] = useState({ t_name: '', location: '' });

  useEffect(() => {
    fetchTheatres();
  }, []);

  const fetchTheatres = async () => {
    try {
      const response = await theatreAPI.getAll();
      setTheatres(response.data);
    } catch (error) {
      toast.error('Failed to fetch theatres');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTheatre) {
        await theatreAPI.update(editingTheatre.t_id, formData);
        toast.success('Theatre updated');
      } else {
        await theatreAPI.create(formData);
        toast.success('Theatre created');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchTheatres();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this theatre?')) return;
    try {
      await theatreAPI.delete(id);
      toast.success('Theatre deleted');
      fetchTheatres();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setEditingTheatre(null);
    setFormData({ t_name: '', location: '' });
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Theatres Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Add Theatre</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingTheatre ? 'Edit' : 'Add'} Theatre</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Theatre Name</Label>
                <Input value={formData.t_name} onChange={(e) => setFormData({ ...formData, t_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingTheatre ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {theatres.map((t) => (
            <TableRow key={t.t_id}>
              <TableCell>{t.t_id}</TableCell>
              <TableCell>{t.t_name}</TableCell>
              <TableCell>{t.location}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingTheatre(t); setFormData({ t_name: t.t_name, location: t.location }); setIsDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(t.t_id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default TheatresManager;
