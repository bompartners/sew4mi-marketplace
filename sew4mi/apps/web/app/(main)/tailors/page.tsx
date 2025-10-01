'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Star, MapPin, Heart, Eye, Filter } from 'lucide-react';
import Link from 'next/link';

// Mock tailors data
const mockTailors = [
  {
    id: '1',
    name: 'Adwoa\'s Atelier',
    specialty: 'Wedding Dresses',
    rating: 4.9,
    distance: '2.5 km',
    image: '/api/placeholder/120/120',
    location: 'East Legon, Accra',
    priceRange: 'GHS 200-800',
    completedOrders: 156,
    responseTime: '< 2 hours',
    featured: true
  },
  {
    id: '2', 
    name: 'Yaw\'s Traditional Wear',
    specialty: 'Kente & Dashiki',
    rating: 4.8,
    distance: '1.2 km',
    image: '/api/placeholder/120/120',
    location: 'Osu, Accra',
    priceRange: 'GHS 150-500',
    completedOrders: 203,
    responseTime: '< 1 hour',
    featured: true
  },
  {
    id: '3',
    name: 'Akosua\'s Fashion',
    specialty: 'Contemporary Designs',
    rating: 4.7,
    distance: '3.1 km',
    image: '/api/placeholder/120/120',
    location: 'Tema, Greater Accra',
    priceRange: 'GHS 180-600',
    completedOrders: 89,
    responseTime: '< 3 hours',
    featured: false
  },
  {
    id: '4',
    name: 'Kwame\'s Suits',
    specialty: 'Men\'s Formal Wear',
    rating: 4.6,
    distance: '4.0 km',
    image: '/api/placeholder/120/120',
    location: 'Spintex, Accra',
    priceRange: 'GHS 250-750',
    completedOrders: 134,
    responseTime: '< 4 hours',
    featured: false
  },
  {
    id: '5',
    name: 'Ama\'s Couture',
    specialty: 'Traditional & Modern',
    rating: 4.5,
    distance: '5.2 km',
    image: '/api/placeholder/120/120',
    location: 'Madina, Accra',
    priceRange: 'GHS 120-450',
    completedOrders: 67,
    responseTime: '< 6 hours',
    featured: false
  }
];

export default function TailorsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFeatured, setShowFeatured] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredTailors = mockTailors.filter(tailor => {
    const matchesSearch = tailor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tailor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tailor.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFeatured = !showFeatured || tailor.featured;
    
    return matchesSearch && matchesFeatured;
  });

  const toggleFavorite = (tailorId: string) => {
    setFavorites(prev => 
      prev.includes(tailorId) 
        ? prev.filter(id => id !== tailorId)
        : [...prev, tailorId]
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to browse tailors.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Tailors</h1>
          <p className="mt-2 text-gray-600">Find the perfect tailor for your custom garment needs</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, specialty, or location..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant={showFeatured ? "default" : "outline"}
              onClick={() => setShowFeatured(!showFeatured)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFeatured ? 'Show All' : 'Featured Only'}
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredTailors.length} tailor{filteredTailors.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
            {showFeatured && ' (featured only)'}
          </p>
        </div>

        {/* Tailors Grid */}
        {filteredTailors.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No tailors found</h3>
                <p className="mt-2 text-gray-600">
                  Try adjusting your search criteria or browse all available tailors.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setShowFeatured(false);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTailors.map((tailor) => (
              <Card key={tailor.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <div className="w-12 h-12 bg-[#CE1126] text-white rounded-full flex items-center justify-center">
                        {tailor.name.charAt(0)}
                      </div>
                    </div>
                    
                    {tailor.featured && (
                      <Badge className="bg-[#FFD700] text-[#8B4513] hover:bg-[#FFD700]/90">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {tailor.name}
                    </h3>
                    <p className="text-[#CE1126] font-medium mb-2">{tailor.specialty}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                        {tailor.rating}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {tailor.distance}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">{tailor.location}</p>
                    <p className="text-sm font-medium text-gray-900">{tailor.priceRange}</p>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed Orders:</span>
                      <span className="font-medium">{tailor.completedOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium">{tailor.responseTime}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/tailors/${tailor.id}`} className="flex-1">
                      <Button className="w-full bg-[#CE1126] hover:bg-[#CE1126]/90">
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleFavorite(tailor.id)}
                      className={favorites.includes(tailor.id) ? 'text-red-500 border-red-500' : ''}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(tailor.id) ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {filteredTailors.length > 0 && (
          <div className="mt-12 text-center">
            <Card>
              <CardContent className="py-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Can't find what you're looking for?
                </h3>
                <p className="text-gray-600 mb-4">
                  Post your custom requirements and let tailors come to you.
                </p>
                <Link href="/orders/new">
                  <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                    Create Custom Order
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}