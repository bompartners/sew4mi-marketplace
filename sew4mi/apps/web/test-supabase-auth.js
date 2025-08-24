const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pvhnegggxjnmnnpiwpcm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aG5lZ2dneGpubW5ucGl3cGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODEyOTAsImV4cCI6MjA3MDM1NzI5MH0.5wKYaeNYqBiARgtbtWv1gGAixTWjj1OjNeBmgXxhrZk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('Testing Supabase authentication...\n');
  
  // Test 1: Check if we can connect to Supabase
  console.log('1. Testing connection to Supabase...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('   ❌ Connection error:', error.message);
    } else {
      console.log('   ✅ Connected to Supabase successfully');
      console.log('   Current session:', data.session ? 'Active' : 'None');
    }
  } catch (err) {
    console.log('   ❌ Failed to connect:', err.message);
  }

  // Test 2: Try to sign up with a test email
  console.log('\n2. Testing email signup...');
  const testEmail = `test_${Date.now()}@example.com`;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          role: 'CUSTOMER'
        }
      }
    });
    
    if (error) {
      console.log('   ❌ Email signup error:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error status:', error.status);
    } else {
      console.log('   ✅ Email signup successful');
      console.log('   User ID:', data.user?.id);
      console.log('   Email confirmation required:', !data.session);
    }
  } catch (err) {
    console.log('   ❌ Signup failed:', err.message);
  }

  // Test 3: Try to sign up with a test phone
  console.log('\n3. Testing phone signup...');
  const testPhone = '+233241234567';
  try {
    const { data, error } = await supabase.auth.signUp({
      phone: testPhone,
      password: 'TestPassword123!',
      options: {
        data: {
          role: 'CUSTOMER'
        }
      }
    });
    
    if (error) {
      console.log('   ❌ Phone signup error:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error status:', error.status);
    } else {
      console.log('   ✅ Phone signup successful');
      console.log('   User ID:', data.user?.id);
      console.log('   OTP verification required:', !data.session);
    }
  } catch (err) {
    console.log('   ❌ Signup failed:', err.message);
  }

  // Test 4: Check auth settings
  console.log('\n4. Checking auth configuration...');
  try {
    // Try to fetch from auth schema (this might fail due to permissions)
    const { data: settings, error } = await supabase
      .from('auth.config')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('   ℹ️  Cannot access auth config (expected - requires admin access)');
    } else {
      console.log('   Auth settings:', settings);
    }
  } catch (err) {
    console.log('   ℹ️  Auth config check:', err.message);
  }

  console.log('\n✅ Test complete');
}

testAuth().catch(console.error);