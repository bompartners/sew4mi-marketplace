'use client';

import { useState } from 'react';
import { TailorAvailability } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

interface AvailabilityCalendarProps {
  tailorId: string;
  availability: TailorAvailability[];
  readonly?: boolean;
}

export function AvailabilityCalendar({ tailorId, availability, readonly = true }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'BUSY':
        return 'Busy';
      case 'BLOCKED':
        return 'Unavailable';
      default:
        return 'No info';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  return (
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
          <Badge className="bg-red-100 text-red-800">Unavailable</Badge>
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

            return (
              <div
                key={day.toISOString()}
                className={`
                  p-2 h-16 border border-gray-200 relative
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isToday ? 'ring-2 ring-blue-500' : ''}
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
              </div>
            );
          })}
        </div>

        {/* Availability Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
            <div className="text-sm text-red-800">Unavailable Days</div>
          </div>
        </div>

        {/* Capacity Information */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Capacity Information</h4>
          <p className="text-sm text-gray-600">
            Numbers shown indicate current orders / daily capacity. 
            This tailor typically accepts {Math.max(...availability.map(a => a.capacity), 5)} orders per day.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}