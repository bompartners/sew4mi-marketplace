'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageCropModal } from '@/components/portfolio/ImageCropModal';
import {
  Upload,
  Trash2,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: string;
}

const ITEMS_PER_PAGE = 9;

export default function PortfolioPage() {
  const router = useRouter();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [, setPendingCroppedImages] = useState<Blob[]>([]);

  useEffect(() => {
    console.log('Portfolio - Auth state:', { user: !!user, userRole, authLoading });

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('Waiting for auth to finish loading...');
      return;
    }

    if (user) {
      console.log('User authenticated, fetching portfolio...');
      fetchPortfolio();
    } else {
      console.log('No user found, stopping load');
      setLoading(false);
      setError('Please log in to view your portfolio.');
    }
  }, [user, authLoading]);

  const fetchPortfolio = async () => {
    try {
      console.log('Fetching portfolio from API...');
      setLoading(true);

      // Get auth service to get current session
      const { authService } = await import('@/services/auth.service');
      const session = await authService.getSession();

      console.log('Session check:', { hasSession: !!session, userId: session?.user?.id });

      if (!session?.access_token) {
        console.error('No session found');
        setError('No active session. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Fetching with auth token...');

      const response = await fetch('/api/tailors/portfolio', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      console.log('Portfolio API response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Portfolio API error:', response.status, errorData);

        // Show specific error messages
        if (response.status === 401) {
          setError('Please log in to view your portfolio.');
        } else if (response.status === 403) {
          setError('Access denied. You must be a tailor to view this page.');
        } else {
          setError(errorData.error || 'Failed to load portfolio. Please try again.');
        }
        setPortfolioItems([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Portfolio data received:', data);
      setPortfolioItems(data.items || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Failed to load portfolio. Please check your connection and try again.');
      setPortfolioItems([]);
    } finally {
      setLoading(false);
      console.log('Portfolio fetch complete');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Show crop modal for first image
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Store remaining files for later
    if (files.length > 1) {
      const remainingFiles = Array.from(files).slice(1);
      // Process remaining files without cropping
      handleUpload(remainingFiles);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Add to pending images
    setPendingCroppedImages(prev => [...prev, croppedBlob]);

    // Upload the cropped image
    const files = [new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' })];
    await handleUpload(files);

    setCropImage(null);
  };

  const handleUpload = async (files: File[]) => {
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

      // Show warnings if some files failed
      if (result.errors && result.errors.length > 0) {
        const errorMsg = `Uploaded ${result.uploadedCount} file(s), but ${result.errors.length} failed`;
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
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      setError(null);
    } catch (err) {
      console.warn('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) return;

    try {
      setLoading(true);

      // Delete each item
      const deletePromises = Array.from(selectedItems).map(itemId =>
        fetch(`/api/tailors/portfolio?itemId=${encodeURIComponent(itemId)}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);

      // Refresh portfolio
      await fetchPortfolio();
      setSelectedItems(new Set());
      setError(null);
    } catch (err) {
      console.warn('Bulk delete error:', err);
      setError('Failed to delete some items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === currentPageItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentPageItems.map(item => item.id)));
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(portfolioItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentPageItems = portfolioItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert>
          <AlertDescription>Please log in to manage your portfolio.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
          <p className="text-gray-600">Showcase your best work to attract more customers</p>
        </div>

        {selectedItems.size > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedItems.size})
          </Button>
        )}
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
            Upload photos of your completed projects (max 5MB per image). First image will be cropped.
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
              <p className="text-xs text-gray-500">PNG, JPG, JPEG, WebP (MAX. 5MB)</p>
              <p className="text-xs text-[#CE1126] mt-1">First image will be auto-cropped</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </CardContent>
      </Card>

      {/* Selection toolbar */}
      {portfolioItems.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="gap-2"
          >
            {selectedItems.size === currentPageItems.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedItems.size === currentPageItems.length ? 'Deselect All' : 'Select All'}
          </Button>

          {selectedItems.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      )}

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
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPageItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-square bg-gray-100">
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      className="bg-white"
                    />
                  </div>

                  {/* Lazy loaded image with thumbnail */}
                  <Image
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? 'bg-[#CE1126] hover:bg-[#CE1126]/90' : ''}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
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
                <p className="text-2xl font-bold text-gray-900">{currentPage}/{totalPages}</p>
                <p className="text-sm text-gray-600">Current Page</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        image={cropImage}
        open={cropImage !== null}
        onClose={() => setCropImage(null)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
