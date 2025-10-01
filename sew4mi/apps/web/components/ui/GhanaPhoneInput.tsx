'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { validateGhanaPhoneNumber } from '@sew4mi/shared/utils';
import { Info } from 'lucide-react';

export interface GhanaPhoneInputProps
  extends Omit<React.InputHTMLAttributes<React.ElementRef<'input'>>, 'type' | 'onChange'> {
  onChange?: (value: string) => void;
  onValidation?: (isValid: boolean, network?: string) => void;
  error?: string;
  showNetworkInfo?: boolean;
}

const GhanaPhoneInput = React.forwardRef<React.ElementRef<'input'>, GhanaPhoneInputProps>(
  ({ className, onChange, onValidation, error, showNetworkInfo = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const [validationSuggestion, setSuggestionValue] = React.useState<string | null>(null);
    const [detectedNetwork, setDetectedNetwork] = React.useState<string | null>(null);
    
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
    
    const validateAndUpdateState = (phoneNumber: string) => {
      if (!phoneNumber || phoneNumber.length < 3) {
        setValidationError(null);
        setSuggestionValue(null);
        setDetectedNetwork(null);
        return;
      }

      const validation = validateGhanaPhoneNumber(phoneNumber);
      
      if (validation.isValid) {
        setValidationError(null);
        setSuggestionValue(null);
        setDetectedNetwork(validation.network || null);
        onValidation?.(true, validation.network);
      } else {
        setValidationError(validation.error || null);
        setSuggestionValue(validation.suggestion || null);
        setDetectedNetwork(null);
        onValidation?.(false);
      }
    };
    
    const handleChange = (e: React.ChangeEvent<React.ElementRef<'input'>>) => {
      const rawValue = e.target.value;
      const formatted = formatPhoneNumber(rawValue);
      setDisplayValue(formatted);
      
      // Pass the cleaned number to parent
      const cleaned = rawValue.replace(/\D/g, '');
      let valueToReturn: string;
      if (cleaned.startsWith('0')) {
        valueToReturn = cleaned;
      } else if (cleaned.startsWith('233')) {
        valueToReturn = '+' + cleaned;
      } else {
        valueToReturn = cleaned;
      }
      
      // Validate the phone number
      validateAndUpdateState(valueToReturn);
      
      if (onChange) {
        onChange(valueToReturn);
      }
    };
    
    // Set initial value if provided
    React.useEffect(() => {
      if (props.value) {
        setDisplayValue(formatPhoneNumber(String(props.value)));
      }
    }, [props.value]);
    
    const displayError = error || validationError;
    const shouldShowNetworkInfo = showNetworkInfo && detectedNetwork && !displayError;

    return (
      <div className="space-y-2">
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
              displayError && 'border-destructive focus-visible:ring-destructive',
              detectedNetwork && !displayError && 'border-green-500 focus-visible:ring-green-500',
              className
            )}
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            placeholder="024 123 4567"
            {...props}
          />
          {detectedNetwork && !displayError && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="flex items-center space-x-1 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium">{detectedNetwork}</span>
              </div>
            </div>
          )}
        </div>
        
        {displayError && (
          <div className="space-y-1">
            <p className="text-sm text-destructive flex items-start gap-1">
              <span className="text-destructive mt-0.5">⚠️</span>
              {displayError}
            </p>
            {validationSuggestion && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {validationSuggestion}
              </p>
            )}
          </div>
        )}
        
        {shouldShowNetworkInfo && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Valid {detectedNetwork} number detected
          </p>
        )}
      </div>
    );
  }
);

GhanaPhoneInput.displayName = 'GhanaPhoneInput';

export { GhanaPhoneInput };