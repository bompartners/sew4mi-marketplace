'use client';

import { useAuth } from '@/contexts/AuthContext';
import { CustomerDashboard } from '@/components/features/dashboards/CustomerDashboard';
import { TailorDashboard } from '@/components/features/dashboards/TailorDashboard';
import { AdminDashboard } from '@/components/features/dashboards/AdminDashboard';
import { USER_ROLES } from '@sew4mi/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, userRole, isLoading } = useAuth();
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    console.log('Dashboard - Auth State:', { user: !!user, userRole, isLoading });
  }, [user, userRole, isLoading]);

  // Redirect to login if not authenticated after loading completes
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('No user found, redirecting to login...');
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading your dashboard...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // This should be handled by middleware, but as a fallback
    return (
      <div className="flex items-center justify-center py-8">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please log in to access your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case USER_ROLES.ADMIN:
        return <AdminDashboard />;
      case USER_ROLES.TAILOR:
        return <TailorDashboard />;
      case USER_ROLES.CUSTOMER:
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {renderDashboard()}
    </div>
  );
}