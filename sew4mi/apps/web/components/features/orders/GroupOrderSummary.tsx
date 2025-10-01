'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Users, Calendar, Palette, CreditCard, Truck, Sparkles } from 'lucide-react';
import { EventType, PaymentMode, DeliveryStrategy } from '@sew4mi/shared/types/group-order';
import { getEventTypeLabel } from '@sew4mi/shared/constants/group-order';
import { BulkDiscountCalculator } from './BulkDiscountCalculator';

interface GroupOrderSummaryProps {
  state: any; // GroupOrderState from wizard
  bulkDiscount: any; // Bulk discount calculation result
}

export function GroupOrderSummary({ state, bulkDiscount }: GroupOrderSummaryProps) {
  const hasDiscount = state.familyMemberProfiles.length >= 3 && bulkDiscount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Group Order</h3>
        <p className="text-sm text-gray-500">
          Please review all details before submitting your group order
        </p>
      </div>

      {/* Event Details Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold">Event Details</h4>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Event Name:</span>
            <span className="font-medium">{state.groupName}</span>
          </div>
          {state.eventType && (
            <div className="flex justify-between">
              <span className="text-gray-600">Event Type:</span>
              <span className="font-medium">{getEventTypeLabel(state.eventType)}</span>
            </div>
          )}
          {state.eventDate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Event Date:</span>
              <span className="font-medium">
                {new Date(state.eventDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Family Members Section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold">Family Members ({state.familyMemberProfiles.length})</h4>
        </div>
        <div className="space-y-2">
          {state.familyMemberProfiles.map((profile: any, index: number) => (
            <div key={profile.profileId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{profile.garmentType}</div>
                {profile.specialInstructions && (
                  <div className="text-xs text-gray-500">{profile.specialInstructions}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Fabric Coordination Section */}
      {state.sharedFabric && state.fabricDetails && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold">Fabric Coordination</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Fabric Type:</span>
              <span className="font-medium">{state.fabricDetails.fabricType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Color:</span>
              <span className="font-medium">{state.fabricDetails.fabricColor}</span>
            </div>
            {state.fabricDetails.fabricPattern && (
              <div className="flex justify-between">
                <span className="text-gray-600">Pattern:</span>
                <span className="font-medium">{state.fabricDetails.fabricPattern}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Total Yardage:</span>
              <span className="font-medium">{state.fabricDetails.totalYardage} yards</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fabric Source:</span>
              <span className="font-medium">
                {state.fabricDetails.fabricSource === 'CUSTOMER_PROVIDED'
                  ? 'Customer Provided'
                  : 'Tailor Sourced'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Total Fabric Cost:</span>
              <span>{state.fabricDetails.totalFabricCost?.toFixed(2) || 0} GHS</span>
            </div>
          </div>
        </Card>
      )}

      {/* Payment & Delivery Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Payment Mode</h4>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                {state.paymentMode === PaymentMode.SINGLE_PAYER
                  ? 'Single Payer - One person pays for all items'
                  : 'Split Payment - Each person pays for their items'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Delivery Strategy</h4>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                {state.deliveryStrategy === DeliveryStrategy.ALL_TOGETHER
                  ? 'All Together - Deliver all items when complete'
                  : 'Staggered Delivery - Deliver items as they complete'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Coordination Notes */}
      {state.coordinationNotes && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Coordination Notes</h4>
          <p className="text-sm text-gray-600">{state.coordinationNotes}</p>
        </Card>
      )}

      {/* Bulk Discount Section */}
      {hasDiscount ? (
        <BulkDiscountCalculator
          itemCount={state.familyMemberProfiles.length}
          originalTotal={bulkDiscount.originalTotal}
          discountedTotal={bulkDiscount.finalTotal}
          discountPercentage={bulkDiscount.discountPercentage}
          savings={bulkDiscount.savings}
        />
      ) : (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900 mb-1">
                Add More Items to Unlock Bulk Discount
              </div>
              <div className="text-sm text-blue-600">
                Add {3 - state.familyMemberProfiles.length} more{' '}
                {3 - state.familyMemberProfiles.length === 1 ? 'item' : 'items'} to get 15% off
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Final Confirmation Message */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-green-900 mb-2">Ready to Submit</div>
            <ul className="space-y-1 text-green-700">
              <li>• Group order will be created with {state.familyMemberProfiles.length} items</li>
              {hasDiscount && (
                <li>• Bulk discount of {bulkDiscount.discountPercentage}% will be applied</li>
              )}
              <li>• You'll receive a confirmation with your group order number</li>
              <li>• Individual progress tracking for each item</li>
              <li>• WhatsApp notifications for order updates</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

