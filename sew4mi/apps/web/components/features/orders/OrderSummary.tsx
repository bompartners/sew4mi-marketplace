'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingBag, 
  User, 
  Ruler, 
  Clock, 
  CreditCard, 
  Shield, 
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  OrderCreationState,
  FabricChoice,
  UrgencyLevel 
} from '@sew4mi/shared/types';

interface OrderSummaryProps {
  state: OrderCreationState;
  onCreateOrder: () => void;
  isCreating: boolean;
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}

function SummaryRow({ icon, label, value, highlight = false }: SummaryRowProps) {
  return (
    <div className={`flex items-start gap-3 ${highlight ? 'bg-primary/5 p-3 rounded-lg' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${highlight ? 'font-medium' : 'text-muted-foreground'}`}>
          {label}
        </p>
        <div className={highlight ? 'font-semibold' : 'font-medium'}>
          {value}
        </div>
      </div>
    </div>
  );
}

interface PricingBreakdownProps {
  basePrice: number;
  fabricCost: number;
  urgencySurcharge: number;
  totalAmount: number;
  escrowBreakdown: {
    deposit: number;
    fitting: number;
    final: number;
  };
}

function PricingBreakdown({ 
  basePrice, 
  fabricCost, 
  urgencySurcharge, 
  totalAmount,
  escrowBreakdown 
}: PricingBreakdownProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-lg">Cost Breakdown</h4>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Base garment price</span>
          <span>GHS {basePrice.toFixed(2)}</span>
        </div>
        
        {fabricCost > 0 && (
          <div className="flex justify-between text-sm">
            <span>Fabric cost</span>
            <span>GHS {fabricCost.toFixed(2)}</span>
          </div>
        )}
        
        {urgencySurcharge > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Express delivery surcharge</span>
            <span>+GHS {urgencySurcharge.toFixed(2)}</span>
          </div>
        )}
        
        <Separator />
        
        <div className="flex justify-between font-semibold text-lg">
          <span>Total Amount</span>
          <span className="text-green-600">GHS {totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 mb-3">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <h5 className="font-medium text-blue-800">Escrow Payment Protection</h5>
        </div>
        
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex justify-between">
            <span>Deposit (25%)</span>
            <span className="font-medium">GHS {escrowBreakdown.deposit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Fitting milestone (50%)</span>
            <span className="font-medium">GHS {escrowBreakdown.fitting.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Final delivery (25%)</span>
            <span className="font-medium">GHS {escrowBreakdown.final.toFixed(2)}</span>
          </div>
        </div>
        
        <p className="text-xs text-blue-600 mt-2">
          Your money is held securely and released to the tailor as milestones are completed.
        </p>
      </div>
    </div>
  );
}

export function OrderSummary({ state, onCreateOrder, isCreating }: OrderSummaryProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedEscrow, setAcceptedEscrow] = useState(false);

  const canCreateOrder = acceptedTerms && 
                        acceptedEscrow && 
                        state.isValid && 
                        !isCreating &&
                        state.garmentType &&
                        state.measurementProfile &&
                        state.fabricChoice &&
                        state.urgencyLevel &&
                        state.estimatedDelivery &&
                        state.pricingBreakdown;

  const missingItems = [];
  if (!state.garmentType) missingItems.push('Garment type');
  if (!state.fabricChoice) missingItems.push('Fabric choice');
  if (!state.measurementProfile) missingItems.push('Measurement profile');
  if (!state.urgencyLevel) missingItems.push('Urgency level');
  if (!state.estimatedDelivery) missingItems.push('Delivery date');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Order Summary</h2>
        <p className="text-muted-foreground">
          Review your order details and confirm to proceed with payment.
        </p>
      </div>

      {/* Missing Items Alert */}
      {missingItems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please complete the following steps: {missingItems.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Order Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Order Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5" />
                Garment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.garmentType ? (
                <div className="space-y-4">
                  <SummaryRow
                    icon={<ShoppingBag className="h-4 w-4 text-blue-600" />}
                    label="Garment Type"
                    value={
                      <div>
                        <p>{state.garmentType.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {state.garmentType.description}
                        </p>
                      </div>
                    }
                    highlight
                  />
                  
                  <SummaryRow
                    icon={<Ruler className="h-4 w-4 text-purple-600" />}
                    label="Fabric"
                    value={
                      state.fabricChoice === FabricChoice.CUSTOMER_PROVIDED
                        ? 'Customer provided'
                        : 'Tailor sourced'
                    }
                  />
                  
                  {state.specialInstructions && (
                    <SummaryRow
                      icon={<Info className="h-4 w-4 text-green-600" />}
                      label="Special Instructions"
                      value={
                        <p className="text-sm bg-muted p-2 rounded">
                          {state.specialInstructions}
                        </p>
                      }
                    />
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No garment selected
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.measurementProfile ? (
                <div className="space-y-4">
                  <SummaryRow
                    icon={<User className="h-4 w-4 text-blue-600" />}
                    label="Profile"
                    value={
                      <div>
                        <p>{state.measurementProfile.nickname}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {state.measurementProfile.gender.toLowerCase()}
                        </p>
                      </div>
                    }
                    highlight
                  />
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(state.measurementProfile.measurements).map(([key, value]) => (
                      value ? (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                          </span>
                          <span className="font-medium">{value}cm</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                  
                  {state.measurementProfile.voiceNoteUrl && (
                    <Badge variant="secondary" className="text-xs">
                      Includes voice note
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No measurement profile selected
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline & Pricing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.urgencyLevel && state.estimatedDelivery ? (
                <div className="space-y-4">
                  <SummaryRow
                    icon={<Clock className="h-4 w-4 text-orange-600" />}
                    label="Delivery Speed"
                    value={
                      <div className="flex items-center gap-2">
                        <span>
                          {state.urgencyLevel === UrgencyLevel.EXPRESS ? 'Express' : 'Standard'}
                        </span>
                        {state.urgencyLevel === UrgencyLevel.EXPRESS && (
                          <Badge className="bg-orange-600">Priority</Badge>
                        )}
                      </div>
                    }
                    highlight
                  />
                  
                  <SummaryRow
                    icon={<Clock className="h-4 w-4 text-green-600" />}
                    label="Estimated Delivery"
                    value={format(state.estimatedDelivery, 'EEEE, MMM dd, yyyy')}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No timeline selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          {state.pricingBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PricingBreakdown {...state.pricingBreakdown} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
              />
              <div className="space-y-1">
                <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  I agree to the Terms of Service and Privacy Policy
                </label>
                <p className="text-xs text-muted-foreground">
                  By proceeding, you agree to our terms of service and privacy policy. 
                  You can review these documents at any time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="escrow"
                checked={acceptedEscrow}
                onCheckedChange={(checked) => setAcceptedEscrow(!!checked)}
              />
              <div className="space-y-1">
                <label htmlFor="escrow" className="text-sm font-medium cursor-pointer">
                  I understand the escrow payment system
                </label>
                <p className="text-xs text-muted-foreground">
                  I understand that payments are held in escrow and released to the tailor 
                  as milestones are completed and approved.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Order Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Ready to Create Order?</h4>
              <p className="text-sm text-muted-foreground">
                Your order will be sent to the tailor for confirmation
              </p>
            </div>
            
            <Button
              onClick={onCreateOrder}
              disabled={!canCreateOrder}
              size="lg"
              className="min-w-[140px] bg-green-600 hover:bg-green-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Order
                </>
              )}
            </Button>
          </div>
          
          {state.pricingBreakdown && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-green-600">
                  GHS {state.pricingBreakdown.totalAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                You'll pay the deposit (GHS {state.pricingBreakdown.escrowBreakdown.deposit.toFixed(2)}) 
                after the tailor confirms your order
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Information */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">What happens next?</p>
              <ol className="space-y-1 text-xs list-decimal list-inside">
                <li>Your order is sent to the tailor for review</li>
                <li>The tailor will confirm availability and pricing</li>
                <li>You'll receive a notification to pay the deposit</li>
                <li>Work begins once the deposit is paid</li>
                <li>You'll track progress through milestone updates</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}