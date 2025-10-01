'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { calculateFabricWithBuffer, FABRIC_BUFFER_PERCENTAGE } from '@sew4mi/shared/constants/group-order';

interface FabricDetails {
  fabricType: string;
  fabricColor: string;
  fabricPattern?: string;
  totalYardage: number;
  costPerYard: number;
  preferredVendor?: string;
  fabricSource: 'CUSTOMER_PROVIDED' | 'TAILOR_SOURCED';
}

interface FabricCoordinatorProps {
  sharedFabric: boolean;
  fabricDetails?: FabricDetails;
  itemCount?: number; // Optional, for future use
  onSharedFabricChange: (shared: boolean) => void;
  onFabricDetailsChange: (details: FabricDetails | undefined) => void;
}

export function FabricCoordinator({
  sharedFabric,
  fabricDetails,
  itemCount: _itemCount, // Renamed to indicate unused, available for future use
  onSharedFabricChange,
  onFabricDetailsChange,
}: FabricCoordinatorProps) {
  const updateFabricDetails = (updates: Partial<FabricDetails>) => {
    if (!fabricDetails) {
      onFabricDetailsChange({
        fabricType: '',
        fabricColor: '',
        totalYardage: 0,
        costPerYard: 0,
        fabricSource: 'TAILOR_SOURCED',
        ...updates,
      } as FabricDetails);
    } else {
      onFabricDetailsChange({
        ...fabricDetails,
        ...updates,
      });
    }
  };

  // Calculate total yards with buffer
  const totalYardsWithBuffer = fabricDetails?.totalYardage
    ? calculateFabricWithBuffer(fabricDetails.totalYardage)
    : 0;

  const totalFabricCost = totalYardsWithBuffer * (fabricDetails?.costPerYard || 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Fabric Coordination</h3>
        <p className="text-sm text-gray-500">
          Coordinate fabric selection across all family members for a unified look
        </p>
      </div>

      {/* Shared Fabric Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium">Use Shared Fabric</div>
            <div className="text-sm text-gray-500 mt-1">
              All garments will be made from the same fabric
            </div>
          </div>
          <Switch
            checked={sharedFabric}
            onCheckedChange={(checked) => {
              onSharedFabricChange(checked);
              if (!checked) {
                onFabricDetailsChange(undefined);
              }
            }}
          />
        </div>
      </Card>

      {/* Fabric Details Form */}
      {sharedFabric && (
        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <div className="font-medium mb-1">Fabric Coordination Benefits</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Guaranteed color and pattern matching</li>
                <li>Bulk fabric pricing from vendors</li>
                <li>Simplified ordering and delivery</li>
                <li>Professional coordination assistance</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Fabric Type <span className="text-red-500">*</span>
              </label>
              <select
                value={fabricDetails?.fabricType || ''}
                onChange={(e) => updateFabricDetails({ fabricType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select fabric type...</option>
                <option value="KENTE">Kente</option>
                <option value="COTTON">Cotton</option>
                <option value="SILK">Silk</option>
                <option value="BATIK">Batik</option>
                <option value="LINEN">Linen</option>
                <option value="POLYESTER">Polyester</option>
                <option value="BLEND">Blend</option>
                <option value="WOOL">Wool</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Fabric Color <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fabricDetails?.fabricColor || ''}
                onChange={(e) => updateFabricDetails({ fabricColor: e.target.value })}
                placeholder="e.g., Royal Blue and Gold"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Fabric Pattern (Optional)
            </label>
            <input
              type="text"
              value={fabricDetails?.fabricPattern || ''}
              onChange={(e) => updateFabricDetails({ fabricPattern: e.target.value })}
              placeholder="e.g., Adinkra symbols, Geometric"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Total Yardage Needed <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={fabricDetails?.totalYardage || ''}
                onChange={(e) => updateFabricDetails({ totalYardage: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 30"
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border rounded-md"
              />
              <div className="text-xs text-gray-500 mt-1">
                With {FABRIC_BUFFER_PERCENTAGE}% buffer: {totalYardsWithBuffer.toFixed(1)} yards
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cost Per Yard (GHS) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={fabricDetails?.costPerYard || ''}
                onChange={(e) => updateFabricDetails({ costPerYard: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 50"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Preferred Vendor (Optional)
            </label>
            <input
              type="text"
              value={fabricDetails?.preferredVendor || ''}
              onChange={(e) => updateFabricDetails({ preferredVendor: e.target.value })}
              placeholder="e.g., Ashanti Textiles, Makola Market"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Fabric Source <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateFabricDetails({ fabricSource: 'CUSTOMER_PROVIDED' })}
                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                  fabricDetails?.fabricSource === 'CUSTOMER_PROVIDED'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">Customer Provided</div>
                <div className="text-xs text-gray-500 mt-1">
                  I will provide the fabric
                </div>
              </button>
              <button
                type="button"
                onClick={() => updateFabricDetails({ fabricSource: 'TAILOR_SOURCED' })}
                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                  fabricDetails?.fabricSource === 'TAILOR_SOURCED'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">Tailor Sourced</div>
                <div className="text-xs text-gray-500 mt-1">
                  Tailor will source fabric
                </div>
              </button>
            </div>
          </div>

          {/* Fabric Cost Summary */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="font-medium text-sm mb-2">Fabric Cost Summary</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base yardage:</span>
                <span>{fabricDetails?.totalYardage || 0} yards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">With {FABRIC_BUFFER_PERCENTAGE}% buffer:</span>
                <span>{totalYardsWithBuffer.toFixed(1)} yards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost per yard:</span>
                <span>{fabricDetails?.costPerYard || 0} GHS</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total fabric cost:</span>
                <span>{totalFabricCost.toFixed(2)} GHS</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No Shared Fabric Message */}
      {!sharedFabric && (
        <Card className="p-6 text-center text-gray-500">
          <div className="font-medium mb-1">Individual Fabric Selection</div>
          <div className="text-sm">
            Each family member can choose their own fabric during order customization
          </div>
        </Card>
      )}
    </div>
  );
}

