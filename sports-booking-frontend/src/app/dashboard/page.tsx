'use client';

import { useQuery } from '@tanstack/react-query';
import { bookingsApi, facilitiesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { Building2, Calendar, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function DashboardPage() {
  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => facilitiesApi.getAll({ per_page: 100 }),
  });

  const { data: bookings } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => bookingsApi.getAll({ per_page: 1000 }),
  });

  const facilitiesCount = facilities?.data.total || 0;
  const bookingsCount = bookings?.data.total || 0;

  // Generate last 7 days data for chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayBookings = bookings?.data.bookings.filter((b: any) => {
      const bookingDate = new Date(b.start_utc);
      return bookingDate >= startOfDay(date) && bookingDate <= endOfDay(date);
    }) || [];
    
    return {
      date: format(date, 'MMM dd'),
      bookings: dayBookings.length,
    };
  });

  const stats = [
    { label: 'Total Facilities', value: facilitiesCount, icon: Building2, color: 'bg-blue-500' },
    { label: 'Total Bookings', value: bookingsCount, icon: Calendar, color: 'bg-green-500' },
    { label: 'Active Today', value: last7Days[6]?.bookings || 0, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Bookings (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}