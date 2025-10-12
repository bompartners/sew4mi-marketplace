import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  ValidateMeasurementsRequest, 
  ValidateMeasurementsResponse 
} from '@sew4mi/shared/types';
import { ValidateMeasurementsRequestSchema } from '@sew4mi/shared/schemas';
import { GARMENT_TYPES } from '@sew4mi/shared/constants';

/**
 * POST /api/orders/validate-measurements
 * Validates that a measurement profile has all required measurements for a garment type
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
    let validationRequest: ValidateMeasurementsRequest;

    try {
      validationRequest = ValidateMeasurementsRequestSchema.parse(body);
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

    // Get garment type requirements
    const garmentType = GARMENT_TYPES[validationRequest.garmentTypeId];
    if (!garmentType || !garmentType.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive garment type' },
        { status: 400 }
      );
    }

    // Get measurement profile
    const { data: measurementProfile, error: profileError } = await supabase
      .from('measurement_profiles')
      .select('*')
      .eq('id', validationRequest.measurementProfileId)
      .eq('user_id', user.id) // Ensure user owns the profile
      .single();

    if (profileError || !measurementProfile) {
      return NextResponse.json(
        { error: 'Measurement profile not found or access denied' },
        { status: 404 }
      );
    }

    // Check required measurements
    const requiredMeasurements = garmentType.measurementsRequired || [];
    const availableMeasurements = measurementProfile.measurements || {};
    
    const missingMeasurements = requiredMeasurements.filter(
      measurement => !availableMeasurements[measurement] || availableMeasurements[measurement] <= 0
    );

    const isValid = missingMeasurements.length === 0;

    // Generate recommendations for missing measurements
    const recommendations: string[] = [];
    if (!isValid) {
      recommendations.push(
        'Please update your measurement profile with the missing measurements',
        'Consider scheduling a measurement session with a tailor for accuracy',
        'You can also add voice notes to clarify specific measurements'
      );

      // Add specific recommendations based on missing measurements
      if (missingMeasurements.includes('chest')) {
        recommendations.push('For chest measurement: measure around the fullest part of your chest');
      }
      if (missingMeasurements.includes('waist')) {
        recommendations.push('For waist measurement: measure around your natural waistline');
      }
      if (missingMeasurements.includes('inseam')) {
        recommendations.push('For inseam: measure from crotch to ankle on the inside of your leg');
      }
    }

    const response: ValidateMeasurementsResponse = {
      isValid,
      missingMeasurements: missingMeasurements.map(measurement => 
        measurement.replace(/([A-Z])/g, ' $1').toLowerCase()
      ),
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Measurement validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}