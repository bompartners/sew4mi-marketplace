'use client';

import React, { useState } from 'react';
import { Bell, BellOff, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { SavedSearch } from '@sew4mi/shared';

interface SavedSearchAlertProps {
  search: SavedSearch;
  onClose: () => void;
}

export function SavedSearchAlert({ search, onClose }: SavedSearchAlertProps) {
  const { updateSavedSearch } = useSavedSearches();

  const [name, setName] = useState(search.name);
  const [alertEnabled, setAlertEnabled] = useState(search.alertEnabled);
  const [alertFrequency, setAlertFrequency] = useState(search.alertFrequency);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await updateSavedSearch(search.id, {
        name,
        alertEnabled,
        alertFrequency,
      });

      onClose();
    } catch (err) {
      console.error('Failed to update saved search:', err);
      alert('Failed to update search settings. Please try again.');
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Search Alert</DialogTitle>
          <DialogDescription>
            Configure notifications for when new matching tailors are found.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Search Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wedding Tailors in Accra"
              maxLength={100}
            />
          </div>

          {/* Alert Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {alertEnabled ? (
                <Bell className="h-5 w-5 text-blue-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-sm">Enable Alerts</p>
                <p className="text-xs text-gray-600">
                  Get notified when new tailors match your search
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
              <Label htmlFor="frequency" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Alert Frequency
              </Label>
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
              <p className="text-xs text-gray-600 mt-1">
                {getFrequencyDescription(alertFrequency)}
              </p>
            </div>
          )}

          {/* Notification Methods */}
          {alertEnabled && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-900 font-medium mb-2">Notification Methods:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• WhatsApp message</li>
                <li>• SMS notification</li>
                <li>• Email alert</li>
              </ul>
            </Card>
          )}
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
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
