'use client';

import React, { useState } from 'react';
import { Heart, Bell, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { TailorSearchFilters } from '@sew4mi/shared';

interface SaveSearchDialogProps {
  filters: TailorSearchFilters;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveSearchDialog({ filters, open, onClose, onSaved }: SaveSearchDialogProps) {
  const { createSavedSearch } = useSavedSearches();

  const [name, setName] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState<'instant' | 'daily' | 'weekly'>('weekly');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a name for your saved search.');
      return;
    }

    try {
      setIsSaving(true);

      await createSavedSearch({
        name: name.trim(),
        filters,
        alertEnabled,
        alertFrequency,
      });

      // Reset form
      setName('');
      setAlertEnabled(true);
      setAlertFrequency('weekly');

      onClose();
      if (onSaved) onSaved();

      alert('Search saved successfully! You can manage your saved searches from your dashboard.');
    } catch (err) {
      console.error('Failed to save search:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save search';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getFrequencyDescription = (frequency: string) => {
    switch (frequency) {
      case 'instant':
        return 'Receive alerts within 15 minutes when new matching tailors are added';
      case 'daily':
        return 'Receive daily alerts at 8:00 AM Ghana time';
      case 'weekly':
        return 'Receive weekly alerts on Mondays at 8:00 AM Ghana time';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Save Search
          </DialogTitle>
          <DialogDescription>
            Save your search criteria and get notified when new matching tailors join the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Search Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wedding Tailors in Accra"
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-gray-600">
              Give your search a memorable name
            </p>
          </div>

          {/* Enable Alerts */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className={`h-5 w-5 ${alertEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
              <div>
                <p className="font-medium text-sm">Enable Alerts</p>
                <p className="text-xs text-gray-600">
                  Get notified about new matching tailors
                </p>
              </div>
            </div>
            <Checkbox
              checked={alertEnabled}
              onCheckedChange={(checked) => setAlertEnabled(checked === true)}
            />
          </div>

          {/* Alert Frequency */}
          {alertEnabled && (
            <div className="space-y-2">
              <Label htmlFor="frequency">Alert Frequency</Label>
              <Select
                value={alertFrequency}
                onValueChange={(value: 'instant' | 'daily' | 'weekly') =>
                  setAlertFrequency(value)
                }
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant (every 15 minutes)</SelectItem>
                  <SelectItem value="daily">Daily (8:00 AM)</SelectItem>
                  <SelectItem value="weekly">Weekly (Mondays, 8:00 AM)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                {getFrequencyDescription(alertFrequency)}
              </p>
            </div>
          )}

          {/* Info Card */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 space-y-1">
                <p className="font-medium">How it works:</p>
                <ul className="space-y-1 ml-2">
                  <li>• Your search filters will be saved securely</li>
                  <li>• You'll receive notifications via WhatsApp, SMS, and Email</li>
                  <li>• You can manage or delete this search anytime</li>
                  <li>• Maximum 10 saved searches per account</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Save Search
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
