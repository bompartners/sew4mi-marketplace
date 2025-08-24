'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TailorApplicationForm } from '@/components/features/auth/TailorApplicationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, User } from 'lucide-react';
import type { TailorApplication } from '@sew4mi/shared';

export default function ApplyTailorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  
  const userId = searchParams.get('userId');
  const userName = searchParams.get('userName');

  const handleApplicationSubmit = async (data: TailorApplication) => {
    try {
      // Submit tailor application
      const response = await fetch('/api/auth/tailor-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to submit application');
      }

      await response.json(); // Consume the response body
      
      setApplicationSubmitted(true);
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard?welcome=tailor-applied');
      }, 3000);

    } catch (error) {
      console.error('Application submission failed:', error);
      throw error;
    }
  };

  const handleSkip = () => {
    // Allow users to skip application for now and complete later
    router.push('/dashboard?welcome=true&incomplete_profile=tailor');
  };

  if (applicationSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Application Submitted!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Thank you for your tailor application. Our team will review your submission within 2-3 business days.
              </p>
              
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  You'll receive an email notification once your application is reviewed. 
                  You can access your dashboard in the meantime.
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Expert Tailor Application</h1>
          <p className="text-muted-foreground mt-2">
            {userName ? `Welcome ${userName}! ` : ''}
            Complete your application to join our network of expert tailors
          </p>
        </div>

        <TailorApplicationForm 
          onSubmit={handleApplicationSubmit}
          onSkip={handleSkip}
          userId={userId || undefined}
        />
      </div>
    </div>
  );
}