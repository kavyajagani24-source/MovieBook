import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Film, MapPin, Calendar, Ticket, Users, Tag, BarChart3 } from 'lucide-react';
import MoviesManager from '@/components/admin/MoviesManager';
import TheatresManager from '@/components/admin/TheatresManager';
import ShowsManager from '@/components/admin/ShowsManager';
import SeatsManager from '@/components/admin/SeatsManager';
import TicketsManager from '@/components/admin/TicketsManager';
import BookingsManager from '@/components/admin/BookingsManager';
import DiscountsManager from '@/components/admin/DiscountsManager';
import AdminStats from '@/components/admin/AdminStats';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <ProtectedRoute adminOnly>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your cinema booking system</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2">
              <TabsTrigger value="stats" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="movies" className="gap-2">
                <Film className="h-4 w-4" />
                <span className="hidden sm:inline">Movies</span>
              </TabsTrigger>
              <TabsTrigger value="theatres" className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Theatres</span>
              </TabsTrigger>
              <TabsTrigger value="shows" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Shows</span>
              </TabsTrigger>
              <TabsTrigger value="seats" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Seats</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-2">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="discounts" className="gap-2">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Discounts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stats">
              <AdminStats />
            </TabsContent>

            <TabsContent value="movies">
              <MoviesManager />
            </TabsContent>

            <TabsContent value="theatres">
              <TheatresManager />
            </TabsContent>

            <TabsContent value="shows">
              <ShowsManager />
            </TabsContent>

            <TabsContent value="seats">
              <SeatsManager />
            </TabsContent>

            <TabsContent value="tickets">
              <TicketsManager />
            </TabsContent>

            <TabsContent value="bookings">
              <BookingsManager />
            </TabsContent>

            <TabsContent value="discounts">
              <DiscountsManager />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
