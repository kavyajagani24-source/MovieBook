import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Customer } from '@/types';
import { customerAPI } from '@/lib/api';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

const Profile = () => {
  const { user } = useAuth();
  const customer = user as Customer;
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    c_name: customer?.c_name || '',
    email_id: customer?.email_id || '',
    phone_no: customer?.phone_no || '',
    dob: customer?.dob || '',
  });

  const handleSave = async () => {
    try {
      await customerAPI.updateProfile(customer.c_id, formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>

          <Card className="p-6 border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{customer?.c_name}</h2>
                    <p className="text-sm text-muted-foreground">Customer ID: {customer?.c_id}</p>
                  </div>
                </div>
                
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.c_name}
                      onChange={(e) => setFormData({ ...formData, c_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email_id}
                      onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone_no}
                      onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          c_name: customer?.c_name || '',
                          email_id: customer?.email_id || '',
                          phone_no: customer?.phone_no || '',
                          dob: customer?.dob || '',
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
