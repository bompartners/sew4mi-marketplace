import { Metadata } from 'next';
import { Heart, Search, Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SavedSearches } from '@/components/features/tailors/SavedSearches';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Saved Searches | Sew4Mi',
  description: 'Manage your saved tailor searches and alerts',
};

export default function SavedSearchesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">Saved Searches</h1>
        </div>
        <p className="text-gray-600">
          Manage your saved tailor searches and get notified when new matching tailors join the platform.
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Create a New Saved Search
            </h2>
            <p className="text-sm text-gray-600">
              Find tailors with specific criteria and get notified about new matches
            </p>
          </div>
          <Link href="/tailors">
            <Button className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Tailors
            </Button>
          </Link>
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          How Search Alerts Work
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mb-2">
              1
            </div>
            <h3 className="font-medium text-gray-900">Save Your Search</h3>
            <p className="text-sm text-gray-600">
              Search for tailors with your specific criteria and save it with a memorable name
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold mb-2">
              2
            </div>
            <h3 className="font-medium text-gray-900">Choose Alert Frequency</h3>
            <p className="text-sm text-gray-600">
              Get notified instantly, daily, or weekly when new matching tailors are added
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold mb-2">
              3
            </div>
            <h3 className="font-medium text-gray-900">Receive Notifications</h3>
            <p className="text-sm text-gray-600">
              Get alerts via WhatsApp, SMS, and Email with details about new matches
            </p>
          </div>
        </div>
      </Card>

      {/* Saved Searches List */}
      <SavedSearches />
    </div>
  );
}
