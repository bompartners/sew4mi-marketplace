'use client';

/**
 * FabricAllocationCalculator Component
 * Calculates and displays total fabric needed across all group order items
 * with per-item allocation breakdown and buffer calculations
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Ruler, 
  Package, 
  AlertTriangle, 
  Info,
  Save,
  Calculator
} from 'lucide-react';
import { FabricAllocation, FabricQuantityCalculation } from '@sew4mi/shared/types/group-order';

export interface FabricAllocationCalculatorProps {
  /** Group order ID */
  groupOrderId?: string;
  /** Individual fabric allocations for each order item */
  allocations: FabricAllocation[];
  /** Current buffer percentage (default 10%) */
  initialBufferPercentage?: number;
  /** Callback when fabric allocation is saved */
  onSave?: (calculation: FabricQuantityCalculation) => Promise<void>;
  /** Loading state */
  isSaving?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Calculate total fabric needs with buffer for waste/errors
 */
export function FabricAllocationCalculator({
  allocations,
  initialBufferPercentage = 10,
  onSave,
  isSaving = false,
  className = ''
}: FabricAllocationCalculatorProps) {
  const [bufferPercentage, setBufferPercentage] = useState(initialBufferPercentage);
  const [customAllocations, setCustomAllocations] = useState<FabricAllocation[]>(allocations);

  /**
   * Calculate total fabric requirements
   */
  const calculation = useMemo<FabricQuantityCalculation>(() => {
    const totalYardsNeeded = customAllocations.reduce(
      (sum, alloc) => sum + alloc.yardsAllocated, 
      0
    );
    
    const bufferAmount = (totalYardsNeeded * bufferPercentage) / 100;
    const recommendedPurchaseQuantity = totalYardsNeeded + bufferAmount;

    return {
      totalYardsNeeded,
      recommendedPurchaseQuantity,
      bufferPercentage,
      individualAllocations: customAllocations,
      estimatedWaste: bufferAmount
    };
  }, [customAllocations, bufferPercentage]);

  /**
   * Update allocation for a specific order
   */
  const handleAllocationChange = (orderId: string, newYardage: number) => {
    setCustomAllocations(prev => 
      prev.map(alloc => 
        alloc.orderId === orderId 
          ? { ...alloc, yardsAllocated: newYardage }
          : alloc
      )
    );
  };

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    if (onSave) {
      await onSave(calculation);
    }
  };

  /**
   * Fabric sourcing recommendations based on Ghana market
   */
  const fabricSourcingRecommendations = useMemo(() => {
    const totalYards = calculation.recommendedPurchaseQuantity;
    
    if (totalYards < 20) {
      return {
        recommendation: 'Local Fabric Store',
        details: 'Purchase from Makola Market or local fabric vendors',
        estimatedCost: 'GHS 15-25 per yard'
      };
    } else if (totalYards < 50) {
      return {
        recommendation: 'Wholesale Fabric Supplier',
        details: 'Contact wholesale suppliers for better rates on bulk orders',
        estimatedCost: 'GHS 12-20 per yard'
      };
    } else {
      return {
        recommendation: 'Direct Textile Importer',
        details: 'Consider ordering directly from textile importers for significant savings',
        estimatedCost: 'GHS 10-18 per yard'
      };
    }
  }, [calculation.recommendedPurchaseQuantity]);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Fabric Allocation Calculator
          </CardTitle>
          <CardDescription>
            Calculate total fabric needs with buffer for waste and errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Section */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Needed</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {calculation.totalYardsNeeded.toFixed(2)} yds
                    </p>
                  </div>
                  <Ruler className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Buffer ({bufferPercentage}%)</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {calculation.estimatedWaste.toFixed(2)} yds
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Purchase Qty</p>
                    <p className="text-2xl font-bold text-green-900">
                      {calculation.recommendedPurchaseQuantity.toFixed(2)} yds
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Buffer Percentage Control */}
          <div className="space-y-2">
            <Label htmlFor="buffer">Buffer Percentage for Waste/Errors</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="buffer"
                type="number"
                min="0"
                max="50"
                step="1"
                value={bufferPercentage}
                onChange={(e) => setBufferPercentage(parseFloat(e.target.value) || 0)}
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">
                Typical range: 10-15% for experienced tailors, 15-20% for complex patterns
              </span>
            </div>
          </div>

          <Separator />

          {/* Per-Item Allocation Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Per-Item Fabric Allocation</h3>
              <Badge variant="secondary">
                {customAllocations.length} Items
              </Badge>
            </div>

            <div className="space-y-3">
              {customAllocations.map((allocation) => (
                <Card key={allocation.orderId} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{allocation.garmentType}</p>
                      <p className="text-sm text-muted-foreground">
                        Order ID: {allocation.orderId.slice(0, 8)}...
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`alloc-${allocation.orderId}`} className="text-sm">
                          Yards:
                        </Label>
                        <Input
                          id={`alloc-${allocation.orderId}`}
                          type="number"
                          min="0"
                          step="0.5"
                          value={allocation.yardsAllocated}
                          onChange={(e) => handleAllocationChange(
                            allocation.orderId, 
                            parseFloat(e.target.value) || 0
                          )}
                          className="w-24"
                        />
                      </div>
                      
                      <Badge variant="outline">
                        {((allocation.yardsAllocated / calculation.totalYardsNeeded) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fabric Sourcing Recommendations */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Info className="h-5 w-5" />
              Fabric Sourcing Recommendation
            </h3>
            
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{fabricSourcingRecommendations.recommendation}</p>
                  <p className="text-sm">{fabricSourcingRecommendations.details}</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated Cost: {fabricSourcingRecommendations.estimatedCost}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Save Button */}
          {onSave && (
            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Fabric Allocation'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Fabric Allocation Tips for Ghana Market
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>For Kente fabric, add 15-20% buffer due to pattern matching requirements</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Buy all fabric from same lot to ensure color consistency</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Confirm measurements before cutting - waste fabric is costly</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Consider pre-washing fabric to account for shrinkage (add 5% extra)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

