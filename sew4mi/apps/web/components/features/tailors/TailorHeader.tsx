'use client';

import { TailorProfile } from '@sew4mi/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Star, Award, Instagram, Facebook } from 'lucide-react';

interface TailorHeaderProps {
  profile: TailorProfile;
}

export function TailorHeader({ profile }: TailorHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getVerificationBadge = () => {
    switch (profile.verificationStatus) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">⏳ Pending Verification</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">⚠ Suspended</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            <Avatar className="w-32 h-32">
              <AvatarImage src={profile.profilePhoto || undefined} alt={profile.businessName} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-green-400 to-blue-500 text-white">
                {getInitials(profile.businessName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.businessName}
                </h1>
                <div className="flex items-center gap-4 text-gray-600 mb-3">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profile.city}, {profile.region}</span>
                  </div>
                  {profile.yearsOfExperience && (
                    <div className="flex items-center">
                      <Award className="w-4 h-4 mr-1" />
                      <span>{profile.yearsOfExperience} years experience</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2">
                {getVerificationBadge()}
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="text-xl font-semibold">{profile.rating.toFixed(1)}</span>
                  <span className="text-gray-500">({profile.totalReviews} reviews)</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{profile.completedOrders}</div>
                <div className="text-xs text-gray-500">Orders Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{profile.completionRate}%</div>
                <div className="text-xs text-gray-500">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{profile.onTimeDeliveryRate}%</div>
                <div className="text-xs text-gray-500">On-Time Delivery</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {profile.averageResponseHours ? `${profile.averageResponseHours}h` : 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Avg Response Time</div>
              </div>
            </div>

            {/* Social Links */}
            {(profile.instagramHandle || profile.facebookPage || profile.tiktokHandle) && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 mr-2">Follow:</span>
                {profile.instagramHandle && (
                  <a
                    href={`https://instagram.com/${profile.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-700 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {profile.facebookPage && (
                  <a
                    href={profile.facebookPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {profile.tiktokHandle && (
                  <a
                    href={`https://tiktok.com/@${profile.tiktokHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.43z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Vacation Mode Notice */}
            {profile.vacationMode && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-1">
                  <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-800">Currently on vacation</span>
                </div>
                {profile.vacationMessage && (
                  <p className="text-sm text-yellow-700">{profile.vacationMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}