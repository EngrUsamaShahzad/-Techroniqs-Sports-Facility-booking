'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, facilitiesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { Calendar as CalendarIcon, Trash2, Clock, Building2 } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';

export default function BookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['my-bookings', page],
    queryFn: () => bookingsApi.getAll({ page, per_page: 10, my_bookings: true }),
  });

  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const bookings = bookingsData?.data.bookings || [];
  const total = bookingsData?.data.total || 0;
  const pages = bookingsData?.data.pages || 1;

  const canCancel = (booking: any) => {
    const hoursUntilStart = differenceInHours(parseISO(booking.start_utc), new Date());
    return hoursUntilStart >= 1;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600 mt-1">View and manage your facility bookings</p>
          </div>

          <div className="bg-white rounded-lg shadow">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No bookings yet</p>
                <p className="text-sm mt-1">Start booking facilities to see them here</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {bookings.map((booking: any) => (
                    <div key={booking.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.facility_name}
                            </h3>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              <span>
                                {format(parseISO(booking.start_utc), 'PPP')}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>
                                {format(parseISO(booking.start_utc), 'HH:mm')} -{' '}
                                {format(parseISO(booking.end_utc), 'HH:mm')}
                              </span>
                            </div>
                            {booking.note && (
                              <div className="mt-2 text-gray-500 italic">
                                Note: {booking.note}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {canCancel(booking) ? (
                            <button
                              onClick={() => {
                                if (confirm('Cancel this booking?')) {
                                  cancelMutation.mutate(booking.id);
                                }
                              }}
                              className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Cancel
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 block text-center">
                              Cannot cancel
                              <br />
                              (less than 1h)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{bookings.length}</span> of{' '}
                    <span className="font-medium">{total}</span> bookings
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(pages, page + 1))}
                      disabled={page === pages}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}