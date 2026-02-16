import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { customerAPI } from '@/lib/api';
import { Customer } from '@/types';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CustomersManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Since there's no getAll endpoint for customers, we'll fetch via a direct API call
      const response = await fetch('http://localhost:5000/api/customers/all');
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to fetch customers');
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to fetch customers');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (c_id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await fetch(`http://localhost:5000/api/customers/${c_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      toast.success('Customer deleted successfully');
      setCustomers(customers.filter(c => c.c_id !== c_id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  return (
    <Card className="p-6 border-border">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Customers Management</h2>
        <p className="text-sm text-muted-foreground mt-1">View and manage registered customers</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No customers found</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.c_id}>
                  <TableCell>{customer.c_id}</TableCell>
                  <TableCell>{customer.c_name}</TableCell>
                  <TableCell>{customer.email_id}</TableCell>
                  <TableCell>{customer.phone_no}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(customer.c_id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};

export { CustomersManager };
export default CustomersManager;
