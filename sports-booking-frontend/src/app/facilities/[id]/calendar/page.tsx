'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, facilitiesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookingSchema = z.object({
  note: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function CalendarPage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = parseInt(params.id as string);
  const { user, isViewer } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  const { register, handleSubmit, reset } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const { data: facilityData } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: () => facilitiesApi.getById(facilityId),
  });

  const { data: slotsData } = useQuery({
    queryKey: ['facility-slots', facilityId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => bookingsApi.getFacilitySlots(facilityId, format(selectedDate, 'yyyy-MM-dd')),
  });

  const createMutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-slots'] });
      setShowBookingModal(false);
      setSelectedSlot(null);
      reset();
    },
    onError: (error: any) => {
      // Surface backend error to the user for easier debugging.
      console.error('Booking creation failed', error);
      const serverMsg = error?.response?.data || error?.message || 'Unknown error';
      try {
        alert(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
      } catch (e) {
        alert('Booking failed (see console for details)');
      }
    },
  });

  const facility = facilityData?.data;
  const bookings = slotsData?.data.bookings || [];

  const generateTimeSlots = () => {
    if (!facility) return [];

    const [openHour, openMin] = facility.open_from.split(':').map(Number);
    const [closeHour, closeMin] = facility.open_to.split(':').map(Number);

    const slots = [];
    // Build UTC-based start and end times so that the ISO strings we send
    // correspond to the facility's open hours (which the backend validates
    // against UTC times). Using Date.UTC ensures the hour/min values are
    // treated as UTC values rather than local-wall-clock times.
    let currentTime = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      openHour,
      openMin,
      0,
      0
    ));
    const endTime = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      closeHour,
      closeMin,
      0,
      0
    ));

    while (currentTime < endTime) {
      const slotEnd = addMinutes(currentTime, 30);
      const isBooked = bookings.some((booking: any) => {
        const bookingStart = parseISO(booking.start_utc);
        return bookingStart.getTime() === currentTime.getTime();
      });

      const booking = bookings.find((b: any) => {
        const bookingStart = parseISO(b.start_utc);
        return bookingStart.getTime() === currentTime.getTime();
      });

      slots.push({
        start: currentTime,
        end: slotEnd,
        isBooked,
        booking,
      });

      currentTime = slotEnd;
    }

    return slots;
  };

  function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  const handleSlotClick = (slot: any) => {
    if (isViewer || slot.isBooked) return;
    setSelectedSlot({ start: slot.start, end: slot.end });
    setShowBookingModal(true);
  };

  const onSubmit = (data: BookingFormData) => {
    if (!selectedSlot) return;

    const payload = {
      facility_id: facilityId,
      start_utc: selectedSlot.start.toISOString(),
      end_utc: selectedSlot.end.toISOString(),
      note: data.note || '',
    };

    // Log payload so developer can compare with Postman request
    console.debug('Creating booking with payload:', payload);

    createMutation.mutate(payload);
  };

  const slots = generateTimeSlots();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <button
              onClick={() => router.push('/facilities')}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Facilities
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{facility?.name}</h1>
            <p className="text-gray-600 mt-1">Book a time slot</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="grid gap-2">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleSlotClick(slot)}
                  disabled={slot.isBooked || isViewer}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    slot.isBooked
                      ? 'bg-red-50 text-red-900 border-2 border-red-200 cursor-not-allowed'
                      : isViewer
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'bg-green-50 text-green-900 border-2 border-green-200 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">
                        {format(slot.start, 'HH:mm')} - {format(slot.end, 'HH:mm')}
                      </span>
                      {slot.booking && (
                        <span className="ml-4 text-sm">
                          Booked by {slot.booking.user_name}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {slot.isBooked ? 'Booked' : 'Available'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {showBookingModal && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create Booking</h2>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedSlot(null);
                    reset();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Facility:</strong> {facility?.name}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Date:</strong> {format(selectedDate, 'PPP')}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Time:</strong> {format(selectedSlot.start, 'HH:mm')} -{' '}
                  {format(selectedSlot.end, 'HH:mm')}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note (optional)
                  </label>
                  <textarea
                    {...register('note')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false);
                      setSelectedSlot(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}