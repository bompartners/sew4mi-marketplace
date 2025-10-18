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
    console.log('Pricing calculation request body:', body);
    let pricingRequest: CalculatePricingRequest;

    try {
      pricingRequest = CalculatePricingRequestSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        console.error('Validation errors:', errors);
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }
      
      console.error('Unknown validation error:', validationError);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get garment type information
    // Find garment type by ID (since keys are UPPERCASE but IDs are kebab-case)
    const garmentType = Object.values(GARMENT_TYPES).find(gt => gt.id === pricingRequest.garmentTypeId);
    if (!garmentType || !garmentType.isActive) {
      console.error('Garment type not found:', pricingRequest.garmentTypeId);
      return NextResponse.json(
        { error: 'Invalid or inactive garment type' },
        { status: 400 }
      );
    }

    // Verify tailor exists and get their pricing preferences
    const { data: tailorProfile, error: tailorError } = await supabase
      .from('tailor_profiles')
      .select('id, user_id, rush_order_fee_percentage, vacation_mode')
      .eq('user_id', pricingRequest.tailorId)
      .single();

    if (tailorError) {
      console.error('Tailor lookup error:', tailorError);
      return NextResponse.json(
        { error: 'Selected tailor not found', details: tailorError.message },
        { status: 400 }
      );
    }

    if (!tailorProfile) {
      console.error('No tailor profile found for user_id:', pricingRequest.tailorId);
      return NextResponse.json(
        { error: 'Selected tailor profile not found' },
        { status: 400 }
      );
    }

    if (tailorProfile.vacation_mode) {
      console.error('Tailor is in vacation mode:', pricingRequest.tailorId);
      return NextResponse.json(
        { error: 'Selected tailor is currently unavailable (vacation mode)' },
        { status: 400 }
      );
    }

    // Calculate base price (from garment type)
    const basePrice = garmentType.basePrice;

    // Calculate fabric cost
    let fabricCost = 0;
    if (pricingRequest.fabricChoice === FabricChoice.TAILOR_SOURCED) {
      // Use default 30% markup for tailor-sourced fabric
      const fabricMarkupPercentage = 0.3;
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
      // Use tailor's rush order fee or default 25%
      const rushFeePercentage = (tailorProfile.rush_order_fee_percentage || 25) / 100;
      urgencySurcharge = basePrice * rushFeePercentage;
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