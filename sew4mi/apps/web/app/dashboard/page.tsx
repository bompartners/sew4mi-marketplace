'use client';

import { useAuth } from '@/hooks/useAuth';
import { RoleBasedNavigation } from '@/components/common/Navigation/RoleBasedNavigation';
import { CustomerDashboard } from '@/components/features/dashboards/CustomerDashboard';
import { TailorDashboard } from '@/components/features/dashboards/TailorDashboard';
import { AdminDashboard } from '@/components/features/dashboards/AdminDashboard';
import { USER_ROLES } from '@sew4mi/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[#CE1126]">Sew4Mi</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <RoleBasedNavigation />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </main>

      {/* Mobile Navigation - Bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="px-4 py-2">
          <RoleBasedNavigation isMobile />
        </div>
      </div>
    </div>
  );
}