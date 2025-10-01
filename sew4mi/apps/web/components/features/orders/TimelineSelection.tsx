'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar as CalendarIcon, Zap, Truck, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import { 
  GarmentTypeOption, 
  UrgencyLevel
} from '@sew4mi/shared/types';
import { URGENCY_SURCHARGE_MULTIPLIER } from '@sew4mi/shared/constants';

interface TimelineSelectionProps {
  urgencyLevel?: UrgencyLevel;
  estimatedDelivery?: Date;
  garmentType?: GarmentTypeOption;
  tailorId?: string;
  onUrgencyChange: (urgency: UrgencyLevel) => void;
  onDeliveryDateChange: (date: Date) => void;
  errors: Record<string, string>;
}

interface UrgencyOptionProps {
  urgency: UrgencyLevel;
  title: string;
  description: string;
  icon: React.ReactNode;
  basePrice: number;
  surcharge: number;
  estimatedDays: number;
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

function UrgencyOption({
  urgency,
  title,
  description,
  icon,
  basePrice,
  surcharge,
  estimatedDays,
  isSelected,
  isAvailable,
  onClick
}: UrgencyOptionProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        !isAvailable 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:shadow-md'
      } ${
        isSelected && isAvailable
          ? 'ring-2 ring-primary border-primary bg-primary/5' 
          : 'hover:border-primary/50'
      }`}
      onClick={isAvailable ? onClick : undefined}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          
          {!isAvailable && (
            <Badge variant="secondary">Not Available</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Delivery Time</p>
              <p className="font-semibold">{estimatedDays} days</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <div className="space-y-1">
                <p className="font-semibold text-green-600">
                  GHS {(basePrice + surcharge).toFixed(2)}
                </p>
                {surcharge > 0 && (
                  <p className="text-xs text-orange-600">
                    +GHS {surcharge.toFixed(2)} surcharge
                  </p>
                )}
              </div>
            </div>
          </div>

          {urgency === UrgencyLevel.EXPRESS && (
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-700">
                  <p className="font-medium">Express Delivery</p>
                  <p className="text-xs">
                    Priority handling with {Math.round((URGENCY_SURCHARGE_MULTIPLIER - 1) * 100)}% surcharge
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DeliveryCalendarProps {
  selectedDate?: Date;
  minDate: Date;
  maxDate: Date;
  blockedDates: Date[];
  onDateSelect: (date: Date | undefined) => void;
}

function DeliveryCalendar({
  selectedDate,
  minDate,
  maxDate,
  blockedDates,
  onDateSelect
}: DeliveryCalendarProps) {
  const isDateBlocked = (date: Date) => {
    return blockedDates.some(blocked => 
      format(blocked, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const isDateDisabled = (date: Date) => {
    return isBefore(date, minDate) || 
           isAfter(date, maxDate) || 
           isDateBlocked(date);
  };

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        disabled={isDateDisabled}
        className="rounded-md border"
      />
      
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded" />
          <span>Available dates</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted rounded" />
          <span>Unavailable dates</span>
        </div>
      </div>
    </div>
  );
}

export function TimelineSelection({
  urgencyLevel,
  estimatedDelivery,
  garmentType,
  tailorId,
  onUrgencyChange,
  onDeliveryDateChange,
  errors
}: TimelineSelectionProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tailorAvailability, setTailorAvailability] = useState({
    isLoading: true,
    blockedDates: [] as Date[],
    standardAvailable: true,
    expressAvailable: true
  });

  const basePrice = garmentType?.basePrice || 0;
  const standardDays = garmentType?.estimatedDays || 14;
  const expressDays = Math.max(Math.ceil(standardDays * 0.6), 3); // 60% of standard time, min 3 days

  // Calculate delivery date based on urgency
  const calculateMinDeliveryDate = (urgency: UrgencyLevel) => {
    const days = urgency === UrgencyLevel.EXPRESS ? expressDays : standardDays;
    return addDays(new Date(), days);
  };

  // Load tailor availability
  useEffect(() => {
    if (tailorId) {
      // Simulate API call to check tailor availability
      setTailorAvailability(prev => ({ ...prev, isLoading: true }));
      
      setTimeout(() => {
        // Mock blocked dates
        const blocked = [
          addDays(new Date(), 10),
          addDays(new Date(), 15),
          addDays(new Date(), 25)
        ];
        
        setTailorAvailability({
          isLoading: false,
          blockedDates: blocked,
          standardAvailable: true,
          expressAvailable: Math.random() > 0.3 // 70% chance express is available
        });
      }, 1000);
    }
  }, [tailorId]);

  // Auto-update delivery date when urgency changes
  useEffect(() => {
    if (urgencyLevel && (!estimatedDelivery || !urgencyLevel)) {
      const minDate = calculateMinDeliveryDate(urgencyLevel);
      onDeliveryDateChange(minDate);
    }
  }, [urgencyLevel, estimatedDelivery, onDeliveryDateChange]);

  const urgencyOptions = [
    {
      urgency: UrgencyLevel.STANDARD,
      title: 'Standard Delivery',
      description: 'Normal processing time with regular pricing',
      icon: <Truck className="h-6 w-6 text-blue-600" />,
      estimatedDays: standardDays,
      surcharge: 0,
      isAvailable: tailorAvailability.standardAvailable
    },
    {
      urgency: UrgencyLevel.EXPRESS,
      title: 'Express Delivery',
      description: 'Faster processing with priority handling',
      icon: <Zap className="h-6 w-6 text-orange-600" />,
      estimatedDays: expressDays,
      surcharge: basePrice * (URGENCY_SURCHARGE_MULTIPLIER - 1),
      isAvailable: tailorAvailability.expressAvailable
    }
  ];

  const minDeliveryDate = urgencyLevel ? calculateMinDeliveryDate(urgencyLevel) : new Date();
  const maxDeliveryDate = addDays(new Date(), 180); // 6 months max

  const daysFromNow = estimatedDelivery ? differenceInDays(estimatedDelivery, new Date()) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Timeline & Delivery</h2>
        <p className="text-muted-foreground">
          Choose your preferred delivery speed and select a delivery date that works for you.
        </p>
      </div>

      {/* Garment Summary */}
      {garmentType && (
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{garmentType.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Standard completion: {standardDays} days • Express: {expressDays} days
                </p>
              </div>
              <Badge variant="secondary">
                Base: GHS {basePrice.toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {(errors.urgencyLevel || errors.estimatedDelivery) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errors.urgencyLevel || errors.estimatedDelivery}
          </AlertDescription>
        </Alert>
      )}

      {/* Urgency Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Delivery Speed</h3>
        
        {tailorAvailability.isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {urgencyOptions.map((option) => (
              <UrgencyOption
                key={option.urgency}
                urgency={option.urgency}
                title={option.title}
                description={option.description}
                icon={option.icon}
                basePrice={basePrice}
                surcharge={option.surcharge}
                estimatedDays={option.estimatedDays}
                isSelected={urgencyLevel === option.urgency}
                isAvailable={option.isAvailable}
                onClick={() => onUrgencyChange(option.urgency)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delivery Date Selection */}
      {urgencyLevel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Select Delivery Date</h3>
            {estimatedDelivery && (
              <Badge variant="outline">
                {daysFromNow} days from now
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Earliest Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Earliest delivery:</span>
                    <span className="font-semibold">
                      {format(minDeliveryDate, 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => onDeliveryDateChange(minDeliveryDate)}
                    className="w-full"
                  >
                    Use Earliest Date
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Choose Custom Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {estimatedDelivery ? format(estimatedDelivery, 'MMM dd, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DeliveryCalendar
                      selectedDate={estimatedDelivery}
                      minDate={minDeliveryDate}
                      maxDate={maxDeliveryDate}
                      blockedDates={tailorAvailability.blockedDates}
                      onDateSelect={(date) => {
                        if (date) {
                          onDeliveryDateChange(date);
                        }
                        setIsCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {urgencyLevel && estimatedDelivery && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Timeline Summary</h4>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 text-sm text-green-700">
              <div>
                <p className="font-medium">Delivery Option</p>
                <p>{urgencyLevel === UrgencyLevel.EXPRESS ? 'Express' : 'Standard'}</p>
              </div>
              <div>
                <p className="font-medium">Delivery Date</p>
                <p>{format(estimatedDelivery, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="font-medium">Total Time</p>
                <p>{daysFromNow} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Delivery Timeline Notes:</p>
              <ul className="space-y-1 text-xs">
                <li>• Delivery dates are estimates and may vary based on complexity</li>
                <li>• Express orders receive priority but quality is never compromised</li>
                <li>• You'll receive updates throughout the creation process</li>
                <li>• Delivery dates exclude weekends and public holidays</li>
                <li>• Final fitting may be required before delivery</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}