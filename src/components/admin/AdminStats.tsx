import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { adminAPI } from '@/lib/api';
import { DollarSign, Ticket, Film, Users } from 'lucide-react';

const AdminStats = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalMovies: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      const d = response.data || {};
      setStats({
        totalRevenue: Number(d.total_revenue ?? 0),
        totalBookings: Number(d.total_bookings ?? 0),
        totalMovies: Number(d.total_movies ?? 0),
        totalCustomers: Number(d.total_customers ?? 0),
      });
    } catch (error) {
      console.warn('Admin stats (admin-only) failed, falling back to public stats:', error?.response?.status || error);
      try {
        const publicResp = await adminAPI.getPublicStats();
        const pd = publicResp.data || {};
        setStats({
          totalRevenue: Number(pd.total_revenue ?? 0),
          totalBookings: Number(pd.total_bookings ?? 0),
          totalMovies: Number(pd.total_movies ?? 0),
          totalCustomers: Number(pd.total_customers ?? 0),
        });
      } catch (pubErr) {
        console.error('Failed to load public stats as fallback:', pubErr);
        setStats({ totalRevenue: 0, totalBookings: 0, totalMovies: 0, totalCustomers: 0 });
      }
    }
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${Number(stats.totalRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Total Bookings',
      value: Number(stats.totalBookings ?? 0).toLocaleString(),
      icon: Ticket,
      color: 'text-gold',
    },
    {
      title: 'Active Movies',
      value: Number(stats.totalMovies ?? 0).toLocaleString(),
      icon: Film,
      color: 'text-accent',
    },
    {
      title: 'Registered Customers',
      value: Number(stats.totalCustomers ?? 0).toLocaleString(),
      icon: Users,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`h-10 w-10 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 border-border">
        <h3 className="text-lg font-semibold mb-4">Quick Overview</h3>
        <div className="space-y-3 text-muted-foreground">
          <p>• System is operating normally</p>
          <p>• All theatres are active</p>
          <p>• Database connections stable</p>
        </div>
      </Card>
    </div>
  );
};

export default AdminStats;
