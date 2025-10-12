import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  CalculatePricingRequest, 
  CalculatePricingResponse,
  UrgencyLevel,
  FabricChoice 
} from '@sew4mi/shared/types';
import { CalculatePricingRequestSchema } from '@sew4mi/shared/schemas';
import { GARMENT_TYPES, URGENCY_SURCHARGE_MULTIPLIER } from '@sew4mi/shared/constants';

/**
 * POST /api/orders/calculate-pricing
 * Calculates order pricing with breakdown including base price, fabric cost, and surcharges
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    let pricingRequest: CalculatePricingRequest;

    try {
      pricingRequest = CalculatePricingRequestSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get garment type information
    const garmentType = GARMENT_TYPES[pricingRequest.garmentTypeId];
    if (!garmentType || !garmentType.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive garment type' },
        { status: 400 }
      );
    }

    // Verify tailor exists and get their pricing preferences
    const { data: tailorProfile, error: tailorError } = await supabase
      .from('tailor_profiles')
      .select('id, user_id, pricing_preferences, fabric_markup_percentage, express_surcharge_percentage')
      .eq('user_id', pricingRequest.tailorId)
      .eq('is_active', true)
      .single();

    if (tailorError || !tailorProfile) {
      return NextResponse.json(
        { error: 'Selected tailor is not available' },
        { status: 400 }
      );
    }

    // Calculate base price (from garment type)
    const basePrice = garmentType.basePrice;

    // Calculate fabric cost
    let fabricCost = 0;
    if (pricingRequest.fabricChoice === FabricChoice.TAILOR_SOURCED) {
      // Use tailor's markup percentage or default 30%
      const fabricMarkupPercentage = tailorProfile.fabric_markup_percentage || 0.3;
      fabricCost = basePrice * fabricMarkupPercentage;
      
      // Add fabric requirements cost if specified
      if (garmentType.fabricRequirements) {
        const fabricBaseCost = garmentType.fabricRequirements.yardsNeeded * 25; // GHS 25 per yard estimate
        fabricCost = Math.max(fabricCost, fabricBaseCost);
      }
    }

    // Calculate urgency surcharge
    let urgencySurcharge = 0;
    if (pricingRequest.urgencyLevel === UrgencyLevel.EXPRESS) {
      // Use tailor's express surcharge or default 25%
      const expressSurchargePercentage = tailorProfile.express_surcharge_percentage || (URGENCY_SURCHARGE_MULTIPLIER - 1);
      urgencySurcharge = basePrice * expressSurchargePercentage;
    }

    // Calculate total amount
    const totalAmount = basePrice + fabricCost + urgencySurcharge;

    // Calculate escrow breakdown (25/50/25)
    const escrowBreakdown = {
      deposit: Math.round(totalAmount * 0.25 * 100) / 100, // 25%
      fitting: Math.round(totalAmount * 0.5 * 100) / 100,  // 50%
      final: Math.round(totalAmount * 0.25 * 100) / 100    // 25%
    };

    // Ensure escrow amounts add up to total (handle rounding)
    const escrowTotal = escrowBreakdown.deposit + escrowBreakdown.fitting + escrowBreakdown.final;
    if (Math.abs(escrowTotal - totalAmount) > 0.01) {
      // Adjust final payment to account for rounding
      escrowBreakdown.final = Math.round((totalAmount - escrowBreakdown.deposit - escrowBreakdown.fitting) * 100) / 100;
    }

    const response: CalculatePricingResponse = {
      basePrice: Math.round(basePrice * 100) / 100,
      fabricCost: Math.round(fabricCost * 100) / 100,
      urgencySurcharge: Math.round(urgencySurcharge * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      escrowBreakdown
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Pricing calculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}