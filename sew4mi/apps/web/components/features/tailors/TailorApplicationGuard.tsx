'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ApplicationStatusCard, type ApplicationStatus } from './ApplicationStatusCard';

interface TailorApplicationGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that protects tailor pages by checking application status
 * Shows appropriate messages for pending/rejected applications
 * Only renders children if tailor has an approved profile
 */
export function TailorApplicationGuard({ children }: TailorApplicationGuardProps) {
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tailors/application-status');
      if (response.ok) {
        const data = await response.json();
        setApplicationStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch application status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Checking your application status...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show application status card if not approved
  if (applicationStatus && !applicationStatus.hasProfile) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <ApplicationStatusCard status={applicationStatus} />
      </div>
    );
  }

  // Render children if approved
  return <>{children}</>;
}

