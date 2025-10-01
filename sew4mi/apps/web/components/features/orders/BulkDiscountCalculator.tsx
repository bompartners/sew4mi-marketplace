'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Award, Sparkles } from 'lucide-react';
import { BULK_DISCOUNT_TIERS } from '@sew4mi/shared/constants/group-order';

interface BulkDiscountCalculatorProps {
  itemCount: number;
  originalTotal: number;
  discountedTotal: number;
  discountPercentage: number;
  savings: number;
}

export function BulkDiscountCalculator({
  itemCount,
  originalTotal,
  discountedTotal,
  discountPercentage,
  savings,
}: BulkDiscountCalculatorProps) {
  // Determine current tier
  let currentTier = null;
  let nextTier = null;

  if (itemCount >= BULK_DISCOUNT_TIERS.TIER_1.min && itemCount <= BULK_DISCOUNT_TIERS.TIER_1.max) {
    currentTier = BULK_DISCOUNT_TIERS.TIER_1;
    nextTier = BULK_DISCOUNT_TIERS.TIER_2;
  } else if (itemCount >= BULK_DISCOUNT_TIERS.TIER_2.min && itemCount <= BULK_DISCOUNT_TIERS.TIER_2.max) {
    currentTier = BULK_DISCOUNT_TIERS.TIER_2;
    nextTier = BULK_DISCOUNT_TIERS.TIER_3;
  } else if (itemCount >= BULK_DISCOUNT_TIERS.TIER_3.min) {
    currentTier = BULK_DISCOUNT_TIERS.TIER_3;
    nextTier = null;
  }

  const itemsUntilNextTier = nextTier ? nextTier.min - itemCount : 0;
  const progressToNextTier = currentTier && nextTier
    ? ((itemCount - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  return (
    <div className="space-y-4">
      {/* Current Discount Display */}
      {itemCount >= 3 ? (
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {discountPercentage}% OFF
                </div>
                <div className="text-sm text-green-600 font-medium mt-1">
                  Bulk Discount Applied!
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-600">You Save</div>
              <div className="text-2xl font-bold text-green-700">
                {savings.toFixed(2)} GHS
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-green-600">Original Total</div>
                <div className="font-semibold text-gray-700 line-through">
                  {originalTotal.toFixed(2)} GHS
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-600">Discounted Total</div>
                <div className="font-semibold text-green-700 text-lg">
                  {discountedTotal.toFixed(2)} GHS
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900">
                Add {3 - itemCount} more {3 - itemCount === 1 ? 'item' : 'items'} to unlock bulk discount!
              </div>
              <div className="text-sm text-blue-600 mt-1">
                Get 15% off when you order 3 or more items
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Discount Tiers Display */}
      <Card className="p-4">
        <div className="font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          Bulk Discount Tiers
        </div>
        <div className="space-y-3">
          {/* Tier 1 */}
          <div
            className={`p-3 rounded-lg border-2 transition-all ${
              itemCount >= BULK_DISCOUNT_TIERS.TIER_1.min && itemCount <= BULK_DISCOUNT_TIERS.TIER_1.max
                ? 'border-green-500 bg-green-50'
                : itemCount > BULK_DISCOUNT_TIERS.TIER_1.max
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">
                  Tier 1: {BULK_DISCOUNT_TIERS.TIER_1.min}-{BULK_DISCOUNT_TIERS.TIER_1.max} items
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Good start - coordinated family outfits
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {BULK_DISCOUNT_TIERS.TIER_1.discountPercentage}%
                </div>
                <div className="text-xs text-gray-500">discount</div>
              </div>
            </div>
          </div>

          {/* Tier 2 */}
          <div
            className={`p-3 rounded-lg border-2 transition-all ${
              itemCount >= BULK_DISCOUNT_TIERS.TIER_2.min && itemCount <= BULK_DISCOUNT_TIERS.TIER_2.max
                ? 'border-green-500 bg-green-50'
                : itemCount > BULK_DISCOUNT_TIERS.TIER_2.max
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">
                  Tier 2: {BULK_DISCOUNT_TIERS.TIER_2.min}-{BULK_DISCOUNT_TIERS.TIER_2.max} items
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Extended family coordination
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {BULK_DISCOUNT_TIERS.TIER_2.discountPercentage}%
                </div>
                <div className="text-xs text-gray-500">discount</div>
              </div>
            </div>
          </div>

          {/* Tier 3 */}
          <div
            className={`p-3 rounded-lg border-2 transition-all ${
              itemCount >= BULK_DISCOUNT_TIERS.TIER_3.min
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">
                  Tier 3: {BULK_DISCOUNT_TIERS.TIER_3.min}+ items
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Best value - large family events
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {BULK_DISCOUNT_TIERS.TIER_3.discountPercentage}%
                </div>
                <div className="text-xs text-gray-500">discount</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Progress to Next Tier */}
      {nextTier && itemCount >= 3 && (
        <Card className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-amber-900">
                Progress to Next Tier
              </span>
              <span className="text-amber-600">
                Add {itemsUntilNextTier} more {itemsUntilNextTier === 1 ? 'item' : 'items'}
              </span>
            </div>
            <Progress value={progressToNextTier} className="h-2" />
            <div className="text-xs text-amber-700">
              Unlock {nextTier.discountPercentage}% discount at {nextTier.min} items
            </div>
          </div>
        </Card>
      )}

      {/* Maximum Tier Reached */}
      {itemCount >= BULK_DISCOUNT_TIERS.TIER_3.min && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-purple-900">
                Maximum Discount Unlocked!
              </div>
              <div className="text-sm text-purple-600 mt-1">
                You're getting the best possible bulk pricing at {BULK_DISCOUNT_TIERS.TIER_3.discountPercentage}%
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Savings Breakdown */}
      {itemCount >= 3 && (
        <div className="text-xs text-gray-500 text-center">
          Bulk discounts are automatically applied to all items in the group order
        </div>
      )}
    </div>
  );
}

