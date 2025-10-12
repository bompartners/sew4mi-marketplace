'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';
import Link from 'next/link';

interface TailorAvailability {
  id: string;
  tailorId: string;
  date: Date;
  status: 'AVAILABLE' | 'BUSY' | 'BLOCKED';
  capacity: number;
  currentLoad: number;
  notes?: string;
}

export default function CalendarPage() {
  const { user, userRole } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<TailorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    if (user && userRole === 'TAILOR') {
      fetchAvailability();
    }
  }, [user, userRole, currentDate]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockData: TailorAvailability[] = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const date = addDays(today, i);
        mockData.push({
          id: `avail-${i}`,
          tailorId: user?.id || '',
          date: date,
          status: i % 3 === 0 ? 'BUSY' : 'AVAILABLE',
          capacity: 5,
          currentLoad: i % 3 === 0 ? 5 : Math.floor(Math.random() * 3),
          notes: undefined,
        });
      }

      setAvailability(mockData);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityForDate = (date: Date) => {
    return availability.find(a => isSameDay(new Date(a.date), date));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'BUSY':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const updateAvailability = async (date: Date, status: 'AVAILABLE' | 'BUSY' | 'BLOCKED') => {
    try {
      // TODO: Implement API call to update availability
      const newAvailability = availability.map(a =>
        isSameDay(new Date(a.date), date)
          ? { ...a, status }
          : a
      );
      setAvailability(newAvailability);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to view your calendar.</p>
            <div className="mt-4 text-center">
              <Link href="/login">
                <Button>Log In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userRole !== 'TAILOR') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">This page is only available for tailors.</p>
            <div className="mt-4 text-center">
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
            <p className="mt-2 text-gray-600">Manage your availability and view upcoming orders</p>
          </div>
          <Link href="/orders">
            <Button variant="outline">
              View Orders
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Availability Calendar</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      disabled={loading}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold min-w-[140px] text-center">
                      {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      disabled={loading}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge className="bg-green-100 text-green-800">Available</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">Busy</Badge>
                  <Badge className="bg-red-100 text-red-800">Blocked</Badge>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {/* Weekday Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {monthDays.map(day => {
                    const dayAvailability = getAvailabilityForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDateClick(day)}
                        className={`
                          p-2 h-20 border border-gray-200 relative cursor-pointer hover:shadow-md transition-shadow
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                          ${isToday ? 'ring-2 ring-blue-500' : ''}
                          ${isSelected ? 'ring-2 ring-purple-500' : ''}
                          ${dayAvailability ? getStatusColor(dayAvailability.status) : ''}
                        `}
                      >
                        <div className="text-sm font-medium">
                          {format(day, 'd')}
                        </div>

                        {dayAvailability && (
                          <div className="absolute bottom-1 left-1 right-1">
                            <div className="text-xs text-center">
                              {dayAvailability.currentLoad}/{dayAvailability.capacity}
                            </div>
                          </div>
                        )}

                        {!isCurrentMonth && (
                          <div className="absolute inset-0 bg-gray-200 bg-opacity-50" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Availability Summary */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {availability.filter(a => a.status === 'AVAILABLE').length}
                    </div>
                    <div className="text-sm text-green-800">Available Days</div>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {availability.filter(a => a.status === 'BUSY').length}
                    </div>
                    <div className="text-sm text-yellow-800">Busy Days</div>
                  </div>

                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {availability.filter(a => a.status === 'BLOCKED').length}
                    </div>
                    <div className="text-sm text-red-800">Blocked Days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Editor */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{format(selectedDate, 'MMM d, yyyy')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">Update availability status:</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-green-50 hover:bg-green-100 text-green-800"
                    onClick={() => updateAvailability(selectedDate, 'AVAILABLE')}
                  >
                    Set as Available
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-yellow-50 hover:bg-yellow-100 text-yellow-800"
                    onClick={() => updateAvailability(selectedDate, 'BUSY')}
                  >
                    Set as Busy
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-red-50 hover:bg-red-100 text-red-800"
                    onClick={() => updateAvailability(selectedDate, 'BLOCKED')}
                  >
                    Block Date
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Daily Capacity:</span>
                  <span className="font-semibold">5 orders</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Load:</span>
                  <span className="font-semibold">
                    {availability.reduce((sum, a) => sum + a.currentLoad, 0)} orders
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Slots:</span>
                  <span className="font-semibold text-green-600">
                    {availability.reduce((sum, a) => sum + (a.capacity - a.currentLoad), 0)} slots
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle>Calendar Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Click any date to update availability</p>
                <p>• Green = Available for orders</p>
                <p>• Yellow = At capacity</p>
                <p>• Red = Blocked/Unavailable</p>
                <p>• Numbers show current/total capacity</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
