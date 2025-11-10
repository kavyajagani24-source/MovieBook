import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showsAPI } from '@/lib/api';
import { Show } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ShowsManager = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [formData, setFormData] = useState({ st_time: '', end_time: '', language: '', duration_weeks: 0, t_id: 0 });

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    try {
      const response = await showsAPI.getAll();
      setShows(response.data);
    } catch (error) {
      toast.error('Failed to fetch shows');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShow) {
        await showsAPI.update(editingShow.show_id, formData);
        toast.success('Show updated');
      } else {
        await showsAPI.create(formData);
        toast.success('Show created');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchShows();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this show?')) return;
    try {
      await showsAPI.delete(id);
      toast.success('Show deleted');
      fetchShows();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setEditingShow(null);
    setFormData({ st_time: '', end_time: '', language: '', duration_weeks: 0, t_id: 0 });
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Shows Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Add Show</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingShow ? 'Edit' : 'Add'} Show</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={formData.st_time} onChange={(e) => setFormData({ ...formData, st_time: e.target.value })} required /></div>
              <div className="space-y-2"><Label>End Time</Label><Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Language</Label><Input value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Duration (weeks)</Label><Input type="number" value={formData.duration_weeks} onChange={(e) => setFormData({ ...formData, duration_weeks: Number(e.target.value) })} required /></div>
              <div className="space-y-2"><Label>Theatre ID</Label><Input type="number" value={formData.t_id} onChange={(e) => setFormData({ ...formData, t_id: Number(e.target.value) })} required /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingShow ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow><TableHead>ID</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Language</TableHead><TableHead>Theatre</TableHead><TableHead>Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {shows.map((s) => (
            <TableRow key={s.show_id}>
              <TableCell>{s.show_id}</TableCell>
              <TableCell>{s.st_time}</TableCell>
              <TableCell>{s.end_time}</TableCell>
              <TableCell>{s.language}</TableCell>
              <TableCell>{s.t_id}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingShow(s); setFormData({ st_time: s.st_time, end_time: s.end_time, language: s.language, duration_weeks: s.duration_weeks, t_id: s.t_id }); setIsDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(s.show_id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default ShowsManager;
