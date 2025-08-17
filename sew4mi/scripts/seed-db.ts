import { createClient } from '@supabase/supabase-js'
import { Database } from '../packages/shared/src/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Create test users
    const testUsers = [
      {
        id: 'test-customer-1',
        email: 'customer1@test.com',
        full_name: 'John Mensah',
        role: 'CUSTOMER' as const,
        phone_number: '+233240123456',
        phone_verified: true,
        whatsapp_opted_in: true,
        whatsapp_number: '+233240123456'
      },
      {
        id: 'test-customer-2',
        email: 'customer2@test.com',
        full_name: 'Ama Asante',
        role: 'CUSTOMER' as const,
        phone_number: '+233201234567',
        phone_verified: true,
        whatsapp_opted_in: false
      },
      {
        id: 'test-tailor-1',
        email: 'tailor1@test.com',
        full_name: 'Kofi Adjei',
        role: 'TAILOR' as const,
        phone_number: '+233244567890',
        phone_verified: true,
        whatsapp_opted_in: true,
        whatsapp_number: '+233244567890'
      },
      {
        id: 'test-tailor-2',
        email: 'tailor2@test.com',
        full_name: 'Akosua Boateng',
        role: 'TAILOR' as const,
        phone_number: '+233209876543',
        phone_verified: true,
        whatsapp_opted_in: true,
        whatsapp_number: '+233209876543'
      },
      {
        id: 'test-admin',
        email: 'admin@sew4mi.com',
        full_name: 'Admin User',
        role: 'ADMIN' as const,
        phone_number: '+233500000000',
        phone_verified: true,
        whatsapp_opted_in: false
      }
    ]

    console.log('Creating test users...')
    for (const user of testUsers) {
      const { error } = await supabase.from('users').upsert(user)
      if (error) {
        console.error(`Error creating user ${user.email}:`, error.message)
      } else {
        console.log(`✅ Created user: ${user.email}`)
      }
    }

    // Create tailor profiles
    const tailorProfiles = [
      {
        user_id: 'test-tailor-1',
        business_name: 'Kofi\'s Custom Tailoring',
        bio: 'Expert tailor with 15 years of experience in traditional and modern Ghanaian fashion',
        years_of_experience: 15,
        specializations: ['Kente', 'Suits', 'Traditional Wear', 'Wedding Attire'],
        city: 'Accra',
        region: 'Greater Accra',
        verification_status: 'VERIFIED' as const,
        verification_date: new Date().toISOString(),
        verified_by: 'test-admin',
        rating: 4.8,
        total_reviews: 47,
        total_orders: 156,
        completion_rate: 98.5,
        response_time_hours: 2.5,
        accepts_rush_orders: true,
        rush_order_fee_percentage: 30
      },
      {
        user_id: 'test-tailor-2',
        business_name: 'Akosua\'s Fashion House',
        bio: 'Specializing in women\'s fashion and bridal wear with attention to detail',
        years_of_experience: 10,
        specializations: ['Women\'s Fashion', 'Bridal Wear', 'Evening Gowns', 'Corporate Wear'],
        city: 'Kumasi',
        region: 'Ashanti',
        verification_status: 'VERIFIED' as const,
        verification_date: new Date().toISOString(),
        verified_by: 'test-admin',
        rating: 4.9,
        total_reviews: 89,
        total_orders: 234,
        completion_rate: 99.2,
        response_time_hours: 1.8,
        accepts_rush_orders: true,
        rush_order_fee_percentage: 25
      }
    ]

    console.log('Creating tailor profiles...')
    for (const profile of tailorProfiles) {
      const { error } = await supabase.from('tailor_profiles').upsert(profile)
      if (error) {
        console.error(`Error creating profile for ${profile.business_name}:`, error.message)
      } else {
        console.log(`✅ Created tailor profile: ${profile.business_name}`)
      }
    }

    // Create measurement profiles
    const measurementProfiles = [
      {
        user_id: 'test-customer-1',
        profile_name: 'Default',
        is_default: true,
        gender: 'male' as const,
        measurements: {
          chest: 102,
          waist: 86,
          hips: 98,
          inseam: 78,
          sleeve: 62,
          shoulder: 46,
          neck: 38,
          length: 72
        },
        measurement_unit: 'cm' as const,
        notes: 'Regular fit preferred'
      },
      {
        user_id: 'test-customer-2',
        profile_name: 'Default',
        is_default: true,
        gender: 'female' as const,
        measurements: {
          bust: 92,
          waist: 72,
          hips: 98,
          shoulder: 38,
          length: 60,
          sleeve: 58,
          armhole: 20
        },
        measurement_unit: 'cm' as const,
        notes: 'Prefers fitted styles'
      }
    ]

    console.log('Creating measurement profiles...')
    for (const profile of measurementProfiles) {
      const { error } = await supabase.from('measurement_profiles').upsert(profile)
      if (error) {
        console.error(`Error creating measurement profile:`, error.message)
      } else {
        console.log(`✅ Created measurement profile for user`)
      }
    }

    console.log('\n✨ Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
}

export { seedDatabase }