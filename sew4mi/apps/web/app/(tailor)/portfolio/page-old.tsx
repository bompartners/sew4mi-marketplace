'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Trash2,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import Image from 'next/image';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: string;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPortfolio();
    }
  }, [user]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tailors/portfolio');

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const data = await response.json();
      setPortfolioItems(data.items || []);
      setError(null);
    } catch (err) {
      console.warn('Error fetching portfolio:', err instanceof Error ? err.message : 'Unknown error');
      setError('Failed to load portfolio. Please try again.');
      setPortfolioItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file count
    if (files.length > 5) {
      setError('Maximum 5 files allowed per upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      // Upload files
      const response = await fetch('/api/tailors/portfolio/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to upload images');
      }

      const result = await response.json();

      // Show success message with upload count
      console.log(`Successfully uploaded ${result.uploadedCount} file(s)`);

      // Refresh portfolio
      await fetchPortfolio();

      // Clear file input
      event.target.value = '';

      // Show warnings if some files failed
      if (result.errors && result.errors.length > 0) {
        const errorMsg = `Uploaded ${result.uploadedCount} file(s), but ${result.errors.length} failed: ${result.errors.map((e: any) => e.file).join(', ')}`;
        setError(errorMsg);
      }
    } catch (err) {
      console.warn('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      const response = await fetch(`/api/tailors/portfolio?itemId=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete portfolio item');
      }

      // Remove from local state
      setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
      setError(null);
    } catch (err) {
      console.warn('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <AlertDescription>Please log in to manage your portfolio.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
        <p className="text-gray-600">Showcase your best work to attract more customers</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Add New Work
          </CardTitle>
          <CardDescription>
            Upload photos of your completed projects (max 5MB per image)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#CE1126] transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
              ) : (
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
              )}
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, JPEG (MAX. 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </CardContent>
      </Card>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-[#CE1126]" />
        </div>
      ) : portfolioItems.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No portfolio items yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start building your portfolio by uploading photos of your completed work
              </p>
              <label className="inline-block">
                <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Photo
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  onChange={handleUpload}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{item.category}</Badge>
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(item.imageUrl, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {portfolioItems.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{portfolioItems.length}</p>
                <p className="text-sm text-gray-600">Portfolio Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(portfolioItems.map(i => i.category)).size}
                </p>
                <p className="text-sm text-gray-600">Categories</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Total Views</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
