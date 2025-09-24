#!/usr/bin/env node

/**
 * Integration test for organization signup flow
 * Tests the complete signup process from form submission to database creation
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignupFlow() {
  const testData = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    userName: 'Test User',
    organizationName: 'Test Organization',
    subdomain: `testorg${Date.now()}`.substring(0, 15),
  };

  console.log('🧪 Starting signup integration test...');
  console.log('Test data:', { ...testData, password: '[REDACTED]' });

  try {
    // Step 1: Test auth signup
    console.log('\n📝 Step 1: Testing auth signup...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testData.email,
      password: testData.password,
      options: {
        data: {
          full_name: testData.userName,
          organization_name: testData.organizationName,
          subdomain: testData.subdomain,
          role: 'owner',
        },
      },
    });

    if (authError) {
      console.error('❌ Auth signup failed:', authError);
      return false;
    }

    if (!authData.user) {
      console.error('❌ No user returned from signup');
      return false;
    }

    console.log('✅ Auth signup successful, user ID:', authData.user.id);

    // Step 2: Check if user profile was created by trigger
    console.log('\n👤 Step 2: Checking user profile creation...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('uid', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ User profile not created by trigger:', profileError);
      return false;
    }

    console.log('✅ User profile created:', {
      user_id: profile.user_id,
      full_name: profile.full_name,
      role: profile.role,
    });

    // Step 3: Test organization creation (simulating server action)
    console.log('\n🏢 Step 3: Testing organization creation...');
    
    // First, check if we can insert into organizations
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        company_name: testData.organizationName,
        subdomain: testData.subdomain,
        owner_id: authData.user.id,
        settings: {},
        metadata: {},
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Organization creation failed:', orgError);
      return false;
    }

    console.log('✅ Organization created:', {
      id: orgData.id,
      company_name: orgData.company_name,
      subdomain: orgData.subdomain,
    });

    // Step 4: Test tenant creation
    console.log('\n🏠 Step 4: Testing tenant creation...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: orgData.id,
        company_name: testData.organizationName,
        searchable: true,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError);
      return false;
    }

    console.log('✅ Tenant created:', {
      id: tenantData.id,
      subdomain: tenantData.subdomain,
      company_name: tenantData.company_name,
    });

    // Step 5: Update user profile with org_id
    console.log('\n🔗 Step 5: Linking user to organization...');
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ org_id: orgData.id })
      .eq('uid', authData.user.id);

    if (updateError) {
      console.error('❌ User profile update failed:', updateError);
      return false;
    }

    console.log('✅ User profile linked to organization');

    // Step 6: Validate complete setup
    console.log('\n✅ Step 6: Final validation...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('tenants_public')
      .select('*')
      .eq('subdomain', testData.subdomain)
      .single();

    if (finalError || !finalCheck) {
      console.error('❌ Final validation failed:', finalError);
      return false;
    }

    console.log('✅ Organization visible in tenants_public:', finalCheck);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('tenants').delete().eq('id', orgData.id);
    await supabase.from('organizations').delete().eq('id', orgData.id);
    await supabase.from('user_profiles').delete().eq('uid', authData.user.id);
    
    console.log('✅ Cleanup completed');
    console.log('\n🎉 INTEGRATION TEST PASSED!');
    return true;

  } catch (error) {
    console.error('❌ Integration test failed with exception:', error);
    return false;
  }
}

// Run the test
testSignupFlow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
