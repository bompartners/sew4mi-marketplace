#!/usr/bin/env node
/**
 * Setup Test Data Script
 * Creates test customers and tailors for order creation testing
 */

// Use dynamic import for ES modules
async function loadSupabase() {
  const { createClient } = await import('./sew4mi/node_modules/@supabase/supabase-js/dist/module/index.js');
  return { createClient };
}

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');

  // Connect to local Supabase
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });

  try {
    // Check for existing customers
    const { data: customers, error: customerError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('role', 'CUSTOMER')
      .limit(5);

    if (customerError) {
      console.error('❌ Error fetching customers:', customerError.message);
    } else {
      console.log('📊 Existing Customers:', customers?.length || 0);
      if (customers && customers.length > 0) {
        console.log(customers.map(c => `  - ${c.email} (${c.full_name})`).join('\n'));
      }
    }

    // Check for existing tailors
    const { data: tailors, error: tailorError } = await supabase
      .from('tailor_profiles')
      .select(`
        id,
        user_id,
        business_name,
        vacation_mode,
        users!inner(full_name, email)
      `)
      .eq('vacation_mode', false)
      .limit(5);

    if (tailorError) {
      console.error('❌ Error fetching tailors:', tailorError.message);
    } else {
      console.log('\n📊 Existing Active Tailors:', tailors?.length || 0);
      if (tailors && tailors.length > 0) {
        tailors.forEach(t => {
          console.log(`  - ${t.business_name} (user_id: ${t.user_id})`);
        });
      }
    }

    // Create test customer if none exist
    if (!customers || customers.length === 0) {
      console.log('\n🔨 Creating test customer...');
      const { data: newCustomer, error: createCustomerError } = await supabase
        .from('users')
        .insert({
          email: 'test-customer@sew4mi.test',
          full_name: 'Test Customer',
          role: 'CUSTOMER',
          phone_number: '+233500000001',
          whatsapp_opted_in: true
        })
        .select()
        .single();

      if (createCustomerError) {
        console.error('❌ Error creating customer:', createCustomerError.message);
      } else {
        console.log('✅ Created test customer:', newCustomer.email, `(${newCustomer.id})`);
      }
    }

    // Create test tailor if none exist
    if (!tailors || tailors.length === 0) {
      console.log('\n🔨 Creating test tailor...');
      
      // First create the user
      const { data: newTailorUser, error: createTailorUserError } = await supabase
        .from('users')
        .insert({
          email: 'test-tailor@sew4mi.test',
          full_name: 'Test Tailor',
          role: 'TAILOR',
          phone_number: '+233500000002',
          whatsapp_opted_in: true
        })
        .select()
        .single();

      if (createTailorUserError) {
        console.error('❌ Error creating tailor user:', createTailorUserError.message);
      } else {
        console.log('✅ Created tailor user:', newTailorUser.email, `(${newTailorUser.id})`);

        // Then create the tailor profile
        const { data: newTailorProfile, error: createTailorProfileError } = await supabase
          .from('tailor_profiles')
          .insert({
            user_id: newTailorUser.id,
            business_name: 'Test Tailor Shop',
            bio: 'Expert in traditional and modern garments',
            years_of_experience: 5,
            specializations: ['Traditional Wear', 'Suits', 'Dresses'],
            city: 'Accra',
            region: 'Greater Accra',
            verification_status: 'VERIFIED',
            vacation_mode: false,
            rating: 4.5,
            total_reviews: 0,
            accepts_rush_orders: true,
            rush_order_fee_percentage: 25
          })
          .select()
          .single();

        if (createTailorProfileError) {
          console.error('❌ Error creating tailor profile:', createTailorProfileError.message);
        } else {
          console.log('✅ Created tailor profile:', newTailorProfile.business_name, `(profile_id: ${newTailorProfile.id})`);
        }
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test data setup complete!');
    console.log('='.repeat(60));
    
    // Show test IDs
    const { data: finalCustomer } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'CUSTOMER')
      .limit(1)
      .single();

    const { data: finalTailor } = await supabase
      .from('tailor_profiles')
      .select('user_id, business_name')
      .eq('vacation_mode', false)
      .limit(1)
      .single();

    if (finalCustomer) {
      console.log(`\n📝 Customer ID: ${finalCustomer.id}`);
      console.log(`   Email: ${finalCustomer.email}`);
    }

    if (finalTailor) {
      console.log(`\n📝 Tailor User ID: ${finalTailor.user_id}`);
      console.log(`   Business: ${finalTailor.business_name}`);
    }

    console.log('\n🎉 You can now test the order creation flow!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestData();

