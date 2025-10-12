import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Welcome Section Skeleton */}
        <div className="bg-gradient-to-r from-[#FFFDD0] to-[#FFD700]/20 rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-[#8B4513]/10">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-[#8B4513]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#CE1126]" />
                <span className="ml-2 text-gray-600">Loading your dashboard...</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#8B4513]/10">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
