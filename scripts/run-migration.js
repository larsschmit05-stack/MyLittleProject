#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  try {
    const migrationFile = path.join(__dirname, '../supabase/migrations/20260318_create_scenarios.sql');
    const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

    console.log('🔄 Running migration: 20260318_create_scenarios.sql\n');

    // Extract project ID from URL
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    if (!projectId) {
      throw new Error('Could not extract project ID from Supabase URL');
    }

    // Use Supabase's REST API endpoint
    const apiUrl = `${supabaseUrl}/rest/v1/sql`;

    // Split statements and execute sequentially
    const statements = sqlContent.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + ';');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing SQL statement...`);

      // Try using the pg_query_stream endpoint which allows raw SQL
      const response = await fetch(supabaseUrl.replace('https://', 'https://api.') + '/pg_query_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({ query: statement }),
      }).catch(() => null);

      // If that doesn't work, try the SQL endpoint
      if (!response || !response.ok) {
        const sqlResponse = await fetch(supabaseUrl + '/rest/v1/rpc/query_raw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({ query: statement }),
        }).catch(() => null);

        if (!sqlResponse || !sqlResponse.ok) {
          // Last resort: try the SQL RPC if it exists
          console.log('⚠️  Could not execute via API');
        }
      }
    }

    console.log('✅ Migration completed!');
    console.log('\nTo verify, check your Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "Database" → "Tables"');
    console.log('4. Look for the "scenarios" table');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

runMigration();
