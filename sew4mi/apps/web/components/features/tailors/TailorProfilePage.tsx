'use client';

import { useState, useEffect, useCallback } from 'react';
import { TailorProfileComplete } from '@sew4mi/shared';
import { TailorHeader } from './TailorHeader';
import { TailorStats } from './TailorStats';
import { PortfolioGallery } from './PortfolioGallery';
import { ReviewsSection } from './ReviewsSection';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { PricingTable } from './PricingTable';
import { WhatsAppContactButton } from './WhatsAppContactButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Star, Award, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface TailorProfilePageProps {
  tailorId: string;
  initialData?: TailorProfileComplete;
}

export function TailorProfilePage({ tailorId, initialData }: TailorProfilePageProps) {
  const [profile, setProfile] = useState<TailorProfileComplete | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tailors/${tailorId}/profile`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setProfile(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [tailorId]);

  useEffect(() => {
    if (!initialData) {
      fetchProfile();
    }
  }, [initialData, fetchProfile]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <TailorHeader profile={profile} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="w-5 h-5 text-yellow-500 mr-1" />
              <span className="text-2xl font-bold">{profile.rating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-gray-600">{profile.totalReviews} reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Award className="w-5 h-5 text-green-500 mr-1" />
              <span className="text-2xl font-bold">{profile.completedOrders}</span>
            </div>
            <p className="text-sm text-gray-600">completed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-blue-500 mr-1" />
              <span className="text-2xl font-bold">{profile.statistics.responseTime.average}h</span>
            </div>
            <p className="text-sm text-gray-600">avg response</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <MapPin className="w-5 h-5 text-red-500 mr-1" />
              <span className="text-2xl font-bold">{profile.onTimeDeliveryRate}%</span>
            </div>
            <p className="text-sm text-gray-600">on-time delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Specializations */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Specializations</h3>
        <div className="flex flex-wrap gap-2">
          {profile.specializations.map((spec, index) => (
            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
              {spec}
            </Badge>
          ))}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="portfolio" className="mb-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-6">
          <PortfolioGallery
            images={profile.portfolio.images}
            featuredWork={profile.portfolio.featuredWork}
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsSection
            tailorId={profile.id}
            initialReviews={profile.reviews}
            totalReviews={profile.totalReviews}
            averageRating={profile.rating}
          />
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <AvailabilityCalendar
            tailorId={profile.id}
            availability={profile.availability}
            readonly={true}
          />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PricingTable pricing={profile.pricing} />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <TailorStats statistics={profile.statistics} />
        </TabsContent>
      </Tabs>

      {/* Contact Section */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">Ready to Order?</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link href={`/orders/new?tailorId=${profile.id}`} className="flex-1">
              <Button className="w-full bg-[#CE1126] hover:bg-[#CE1126]/90">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Start Order with {profile.businessName}
              </Button>
            </Link>
            <WhatsAppContactButton
              tailorId={profile.id}
              tailorName={profile.businessName}
              className="flex-1"
            />
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              {profile.city}, {profile.region}
            </p>
            <p className="mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Usually responds within {profile.statistics.responseTime.average} {profile.statistics.responseTime.unit}
            </p>
            {profile.verificationStatus === 'VERIFIED' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                ✓ Verified Tailor
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}