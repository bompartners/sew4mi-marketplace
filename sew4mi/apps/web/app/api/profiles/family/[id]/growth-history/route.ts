import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { familyProfileService } from '@/lib/services/family-profile.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get authenticated user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const profileId = params.id;
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('range') || '1y'; // 3m, 6m, 1y, all
    const measurement = url.searchParams.get('measurement'); // specific measurement to focus on

    // Verify profile ownership
    const profile = await familyProfileService.getProfile(profileId, session.user.id);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 404 }
      );
    }

    // Get measurement history from database
    const { data: historyData, error: historyError } = await supabase
      .from('measurement_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('recorded_at', { ascending: true });

    if (historyError) {
      throw historyError;
    }

    // Filter by time range if specified
    let filteredHistory = historyData || [];
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (timeRange) {
        case '3m':
          cutoff.setMonth(now.getMonth() - 3);
          break;
        case '6m':
          cutoff.setMonth(now.getMonth() - 6);
          break;
        case '1y':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredHistory = filteredHistory.filter(
        entry => new Date(entry.recorded_at) >= cutoff
      );
    }

    // Process the data for growth chart visualization
    const processedHistory = filteredHistory.map(entry => ({
      id: entry.id,
      date: entry.recorded_at,
      age: calculateAgeAtDate(profile.birthDate, new Date(entry.recorded_at)),
      measurements: entry.measurements,
      notes: entry.notes,
      recordedBy: entry.recorded_by_name
    }));

    // Calculate growth trends for each measurement
    const measurementNames = Array.from(
      new Set(
        filteredHistory.flatMap(entry => Object.keys(entry.measurements || {}))
      )
    );

    const growthTrends = measurementNames.reduce((trends, measurementName) => {
      const measurementData = processedHistory
        .filter(entry => entry.measurements[measurementName] !== undefined)
        .map(entry => ({
          date: entry.date,
          age: entry.age,
          value: entry.measurements[measurementName]
        }));

      if (measurementData.length < 2) {
        trends[measurementName] = {
          trend: 'insufficient-data',
          change: 0,
          changePercent: 0,
          averageGrowthRate: 0,
          data: measurementData
        };
        return trends;
      }

      const latest = measurementData[measurementData.length - 1];
      const earliest = measurementData[0];
      const change = latest.value - earliest.value;
      const changePercent = (change / earliest.value) * 100;
      const timePeriodMonths = (new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const averageGrowthRate = timePeriodMonths > 0 ? change / timePeriodMonths : 0;

      trends[measurementName] = {
        trend: change > 0.5 ? 'increasing' : change < -0.5 ? 'decreasing' : 'stable',
        change,
        changePercent,
        averageGrowthRate,
        data: measurementData,
        latest: latest.value,
        earliest: earliest.value
      };

      return trends;
    }, {} as Record<string, any>);

    // Generate growth milestones and recommendations
    const milestones = generateGrowthMilestones(profile, processedHistory);
    const recommendations = generateGrowthRecommendations(profile, growthTrends);

    // Calculate percentiles if age data is available (simplified version)
    const percentiles = profile.age ? calculateGrowthPercentiles(profile, growthTrends) : null;

    const growthChart = {
      profileId,
      profileName: profile.nickname,
      age: profile.age,
      birthDate: profile.birthDate,
      timeRange,
      dataPoints: processedHistory.length,
      history: processedHistory,
      trends: growthTrends,
      milestones,
      recommendations,
      percentiles,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      growthChart
    });

  } catch (error) {
    console.error('Error fetching growth history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth history' },
      { status: 500 }
    );
  }
}

function calculateAgeAtDate(birthDate?: Date, measurementDate?: Date): number | undefined {
  if (!birthDate || !measurementDate) return undefined;
  
  const birth = new Date(birthDate);
  const measurement = new Date(measurementDate);
  
  let age = measurement.getFullYear() - birth.getFullYear();
  const monthDiff = measurement.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && measurement.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function generateGrowthMilestones(profile: any, history: any[]): any[] {
  const milestones = [];
  
  if (!profile.age || profile.age > 18) {
    return milestones; // Growth milestones primarily for children
  }
  
  // Define key growth periods
  const growthPeriods = [
    { ageMin: 0, ageMax: 2, name: 'Infant Growth', expectedGrowth: { chest: 15, height: 50 } },
    { ageMin: 2, ageMax: 5, name: 'Toddler Growth', expectedGrowth: { chest: 10, height: 35 } },
    { ageMin: 5, ageMax: 12, name: 'Child Growth', expectedGrowth: { chest: 20, height: 60 } },
    { ageMin: 12, ageMax: 18, name: 'Adolescent Growth', expectedGrowth: { chest: 15, height: 40 } }
  ];
  
  const currentPeriod = growthPeriods.find(
    period => profile.age >= period.ageMin && profile.age <= period.ageMax
  );
  
  if (currentPeriod && history.length >= 2) {
    // Check if child is meeting expected growth patterns
    const recentHistory = history.slice(-6); // Last 6 measurements
    if (recentHistory.length >= 2) {
      const oldest = recentHistory[0];
      const newest = recentHistory[recentHistory.length - 1];
      const monthsDiff = (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      
      if (monthsDiff >= 3) {
        Object.keys(currentPeriod.expectedGrowth).forEach(measurement => {
          if (oldest.measurements[measurement] && newest.measurements[measurement]) {
            const actualGrowth = newest.measurements[measurement] - oldest.measurements[measurement];
            const expectedGrowthRate = currentPeriod.expectedGrowth[measurement] / 12; // Per month
            const expectedGrowth = expectedGrowthRate * monthsDiff;
            
            milestones.push({
              id: `${measurement}-growth-${Date.now()}`,
              type: 'growth-tracking',
              measurement,
              period: currentPeriod.name,
              actualGrowth,
              expectedGrowth,
              isOnTrack: actualGrowth >= expectedGrowth * 0.8, // Within 80% is considered on track
              monthsPeriod: monthsDiff,
              notes: `${measurement} growth over ${monthsDiff.toFixed(1)} months`
            });
          }
        });
      }
    }
  }
  
  return milestones;
}

function generateGrowthRecommendations(profile: any, trends: Record<string, any>): string[] {
  const recommendations = [];
  
  // Check for concerning growth patterns
  Object.entries(trends).forEach(([measurement, trend]) => {
    if (trend.trend === 'decreasing' && Math.abs(trend.changePercent) > 5) {
      recommendations.push(
        `Consider consulting a healthcare provider about ${measurement} measurements showing a decreasing trend.`
      );
    }
    
    if (trend.trend === 'insufficient-data') {
      recommendations.push(
        `Take regular ${measurement} measurements to track growth patterns effectively.`
      );
    }
    
    if (trend.averageGrowthRate > 0 && profile.age && profile.age < 18) {
      const growthRate = trend.averageGrowthRate;
      if (growthRate > 2) {
        recommendations.push(
          `${measurement} is growing rapidly (${growthRate.toFixed(1)}cm/month). Consider more frequent measurements.`
        );
      }
    }
  });
  
  // Age-specific recommendations
  if (profile.age) {
    if (profile.age < 5) {
      recommendations.push('Schedule measurements every 3 months for optimal growth tracking.');
    } else if (profile.age < 12) {
      recommendations.push('Schedule measurements every 6 months to track steady growth.');
    } else if (profile.age < 18) {
      recommendations.push('Monitor measurements during growth spurts, especially around puberty.');
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Growth patterns look normal. Continue regular measurement updates.');
  }
  
  return recommendations;
}

function calculateGrowthPercentiles(profile: any, trends: Record<string, any>): Record<string, number> | null {
  // Simplified percentile calculation
  // In production, this would use CDC or WHO growth charts
  
  if (!profile.age) return null;
  
  const percentiles: Record<string, number> = {};
  
  // Simplified percentile calculation for demonstration
  // This should be replaced with proper growth chart data
  Object.entries(trends).forEach(([measurement, trend]) => {
    if (trend.latest && profile.age) {
      // Mock percentile calculation (would use real growth charts in production)
      const ageFactor = Math.min(profile.age / 18, 1);
      const genderFactor = profile.gender === 'MALE' ? 1.1 : 1.0;
      const expectedValue = getExpectedMeasurement(measurement, profile.age, profile.gender);
      
      if (expectedValue) {
        const ratio = trend.latest / expectedValue;
        const percentile = Math.min(Math.max(ratio * 50, 5), 95); // Rough approximation
        percentiles[measurement] = Math.round(percentile);
      }
    }
  });
  
  return Object.keys(percentiles).length > 0 ? percentiles : null;
}

function getExpectedMeasurement(measurement: string, age: number, gender: string): number | null {
  // Simplified expected values - would use proper growth charts in production
  const baseMeasurements = {
    chest: gender === 'MALE' ? 85 : 80,
    waist: gender === 'MALE' ? 78 : 72,
    hips: gender === 'MALE' ? 85 : 90,
    height: gender === 'MALE' ? 175 : 165
  };
  
  const base = baseMeasurements[measurement as keyof typeof baseMeasurements];
  if (!base) return null;
  
  // Simple age adjustment
  if (age < 18) {
    return base * (0.4 + (age / 18) * 0.6);
  }
  
  return base;
}