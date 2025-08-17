'use client';

import * as React from 'react';
import { cn } from './utils';

export interface GhanaPhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onChange?: (value: string) => void;
  error?: string;
}

const GhanaPhoneInput = React.forwardRef<HTMLInputElement, GhanaPhoneInputProps>(
  ({ className, onChange, error, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    
    const formatPhoneNumber = (value: string) => {
      // Remove all non-numeric characters
      const numbers = value.replace(/\D/g, '');
      
      // Handle Ghana number formats
      if (numbers.startsWith('233')) {
        // International format: +233 XX XXX XXXX
        const match = numbers.match(/^(233)(\d{2})(\d{3})(\d{4})$/);
        if (match) {
          return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
        }
        // Partial match
        if (numbers.length <= 3) return `+${numbers}`;
        if (numbers.length <= 5) return `+${numbers.slice(0, 3)} ${numbers.slice(3)}`;
        if (numbers.length <= 8) return `+${numbers.slice(0, 3)} ${numbers.slice(3, 5)} ${numbers.slice(5)}`;
        return `+${numbers.slice(0, 3)} ${numbers.slice(3, 5)} ${numbers.slice(5, 8)} ${numbers.slice(8, 12)}`;
      } else if (numbers.startsWith('0')) {
        // Local format: 0XX XXX XXXX
        const match = numbers.match(/^(0)(\d{2})(\d{3})(\d{4})$/);
        if (match) {
          return `${match[1]}${match[2]} ${match[3]} ${match[4]}`;
        }
        // Partial match
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
      }
      
      // Default formatting for incomplete numbers
      return numbers;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatPhoneNumber(rawValue);
      setDisplayValue(formatted);
      
      // Pass the cleaned number to parent
      const cleaned = rawValue.replace(/\D/g, '');
      if (onChange) {
        if (cleaned.startsWith('0')) {
          onChange(cleaned);
        } else if (cleaned.startsWith('233')) {
          onChange('+' + cleaned);
        } else {
          onChange(cleaned);
        }
      }
    };
    
    // Set initial value if provided
    React.useEffect(() => {
      if (props.value) {
        setDisplayValue(formatPhoneNumber(String(props.value)));
      }
    }, [props.value]);
    
    return (
      <div className="space-y-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <div className="flex items-center space-x-1">
              <span className="text-2xl">🇬🇭</span>
              <span className="text-sm text-muted-foreground">+233</span>
            </div>
          </div>
          <input
            type="tel"
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background pl-20 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            placeholder="024 123 4567"
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

GhanaPhoneInput.displayName = 'GhanaPhoneInput';

export { GhanaPhoneInput };