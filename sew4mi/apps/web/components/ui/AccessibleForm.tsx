'use client'

import React, { useId, useState, useEffect } from 'react';
import { useAccessibleFormValidation } from '@/hooks/useAccessibility';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'select' | 'textarea';
  required?: boolean;
  error?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
  className?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  selectProps?: React.SelectHTMLAttributes<HTMLSelectElement>;
}

export const AccessibleFormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  required = false,
  error,
  helpText,
  options = [],
  children,
  className,
  inputProps,
  textareaProps,
  selectProps
}) => {
  const fieldId = useId();
  const helpId = useId();
  const errorId = useId();
  const { announceFieldError } = useAccessibleFormValidation();

  // Announce errors when they change
  useEffect(() => {
    if (error) {
      announceFieldError(label, error);
    }
  }, [error, label, announceFieldError]);

  const getAriaDescribedBy = () => {
    const ids = [];
    if (helpText) ids.push(helpId);
    if (error) ids.push(errorId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  const commonProps = {
    id: fieldId,
    name,
    required,
    'aria-describedby': getAriaDescribedBy(),
    'aria-invalid': !!error,
    className: cn(
      'block w-full rounded-md border px-3 py-2 text-sm placeholder-gray-500 shadow-sm transition-colors',
      'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      error 
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
        : 'border-gray-300 hover:border-gray-400',
      'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
      inputProps?.className || textareaProps?.className || selectProps?.className
    )
  };

  const renderInput = () => {
    if (children) {
      return children;
    }

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            {...textareaProps}
            rows={textareaProps?.rows || 3}
          />
        );

      case 'select':
        return (
          <select {...commonProps} {...selectProps}>
            {!selectProps?.value && (
              <option value="" disabled>
                Select {label.toLowerCase()}
              </option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            {...commonProps}
            {...inputProps}
            type={type}
          />
        );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label 
        htmlFor={fieldId}
        className={cn(
          'block text-sm font-medium text-gray-700',
          error && 'text-red-700'
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {renderInput()}

      {helpText && (
        <p 
          id={helpId} 
          className="text-sm text-gray-600"
          role="note"
        >
          {helpText}
        </p>
      )}

      {error && (
        <p 
          id={errorId} 
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <svg 
            className="h-4 w-4 flex-shrink-0" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
              clipRule="evenodd" 
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

interface FormGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleFormGroup: React.FC<FormGroupProps> = ({
  title,
  description,
  children,
  className
}) => {
  const groupId = useId();
  const descriptionId = useId();

  return (
    <fieldset 
      className={cn('space-y-4', className)}
      role="group"
      aria-labelledby={groupId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <legend id={groupId} className="text-lg font-medium text-gray-900">
        {title}
      </legend>
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  );
};

interface FormProps {
  onSubmit: (data: FormData) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  errors?: Record<string, string[]>;
  isSubmitting?: boolean;
  className?: string;
}

export const AccessibleForm: React.FC<FormProps> = ({
  onSubmit,
  title,
  description,
  children,
  errors = {},
  isSubmitting = false,
  className
}) => {
  const formId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const errorsId = useId();
  
  const { announceErrors, announceSuccess } = useAccessibleFormValidation();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Announce errors when form is submitted with errors
  useEffect(() => {
    if (hasSubmitted && Object.keys(errors).length > 0) {
      announceErrors(errors);
    }
  }, [errors, hasSubmitted, announceErrors]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    
    const formData = new FormData(event.currentTarget);
    
    // If no errors, announce success and submit
    if (Object.keys(errors).length === 0) {
      announceSuccess('Form submitted successfully');
      onSubmit(formData);
    }
  };

  const errorCount = Object.keys(errors).length;
  const hasErrors = errorCount > 0;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={cn('space-y-6', className)}
      noValidate
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={[
        description ? descriptionId : null,
        hasErrors ? errorsId : null
      ].filter(Boolean).join(' ') || undefined}
    >
      {title && (
        <div>
          <h2 id={titleId} className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Error Summary */}
      {hasErrors && hasSubmitted && (
        <div 
          id={errorsId}
          className="rounded-md bg-red-50 border border-red-200 p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start">
            <svg 
              className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
                clipRule="evenodd" 
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {errorCount === 1 
                  ? 'There is 1 error that needs to be corrected:'
                  : `There are ${errorCount} errors that need to be corrected:`
                }
              </h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-red-700">
                {Object.entries(errors).map(([field, fieldErrors]) =>
                  fieldErrors.map((error, index) => (
                    <li key={`${field}-${index}`}>
                      <strong>{field}:</strong> {error}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {children}

      <div className="pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full sm:w-auto px-6 py-3 rounded-md text-sm font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
            isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed'
          )}
          aria-describedby={isSubmitting ? `${formId}-submitting` : undefined}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg 
                className="animate-spin h-4 w-4" 
                viewBox="0 0 24 24" 
                fill="none"
                aria-hidden="true"
              >
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  className="opacity-25"
                />
                <path 
                  fill="currentColor" 
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  className="opacity-75"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit'
          )}
        </button>
        
        {isSubmitting && (
          <p id={`${formId}-submitting`} className="sr-only">
            Form is being submitted, please wait
          </p>
        )}
      </div>
    </form>
  );
};