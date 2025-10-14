const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'sew4mi', '.env.local') });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Split SQL content into individual statements
 */
function splitSqlStatements(sql) {
  // Remove comments and split by semicolons, but be careful with functions
  const statements = [];
  let currentStatement = '';
  let inFunction = false;
  let inDollarQuote = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip comment-only lines
    if (trimmedLine.startsWith('--') && !inFunction && !inDollarQuote) {
      continue;
    }

    // Check for function start/end
    if (trimmedLine.includes('$$') && !inDollarQuote) {
      inDollarQuote = true;
      inFunction = true;
    } else if (trimmedLine.includes('$$') && inDollarQuote) {
      inDollarQuote = false;
    }

    if (trimmedLine.toUpperCase().includes('CREATE OR REPLACE FUNCTION') ||
        trimmedLine.toUpperCase().includes('CREATE FUNCTION')) {
      inFunction = true;
    }

    currentStatement += line + '\n';

    // Check if statement is complete
    if (trimmedLine.endsWith(';') && !inDollarQuote) {
      if (!inFunction || (inFunction && trimmedLine.includes('LANGUAGE'))) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inFunction = false;
      }
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements.filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
}

/**
 * Run a single SQL statement with proper error handling
 */
async function runStatement(statement, index) {
  try {
    console.log(`\nExecuting statement ${index + 1}...`);

    // Log first 100 characters of the statement
    const preview = statement.substring(0, 100).replace(/\n/g, ' ');
    console.log(`Preview: ${preview}...`);

    // Use the Supabase RPC to run raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: statement
    }).single();

    if (error) {
      // Try direct execution if RPC doesn't exist
      const { data: directData, error: directError } = await supabase
        .from('_sql')
        .select('*')
        .sql(statement);

      if (directError) {
        throw directError;
      }

      console.log(`✓ Statement ${index + 1} executed successfully`);
      return { success: true, data: directData };
    }

    console.log(`✓ Statement ${index + 1} executed successfully`);
    return { success: true, data };
  } catch (error) {
    console.error(`✗ Statement ${index + 1} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run migration file
 */
async function runMigration(filePath) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running migration: ${path.basename(filePath)}`);
    console.log('='.repeat(60));

    // Read the SQL file
    const sql = await fs.readFile(filePath, 'utf8');

    // Split into statements
    const statements = splitSqlStatements(sql);
    console.log(`Found ${statements.length} SQL statements to execute`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const result = await runStatement(statements[i], i);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        // For critical statements, you might want to stop here
        // break;
      }
    }

    console.log(`\nMigration Summary for ${path.basename(filePath)}:`);
    console.log(`✓ Successful statements: ${successCount}`);
    console.log(`✗ Failed statements: ${failCount}`);

    return {
      file: filePath,
      total: statements.length,
      success: successCount,
      failed: failCount,
      results
    };
  } catch (error) {
    console.error(`Failed to run migration ${filePath}:`, error);
    throw error;
  }
}

/**
 * Alternative approach using psql command if available
 */
async function runMigrationWithPsql(filePath) {
  const { exec } = require('child_process').promises;

  try {
    console.log(`\nAttempting to run migration with psql: ${path.basename(filePath)}`);

    const databaseUrl = process.env.DATABASE_URL ||
      `postgresql://postgres:postgres@localhost:54322/postgres`;

    const command = `psql "${databaseUrl}" -f "${filePath}"`;

    const { stdout, stderr } = await exec(command);

    if (stdout) console.log('Output:', stdout);
    if (stderr) console.error('Errors:', stderr);

    return { success: true };
  } catch (error) {
    console.error('psql execution failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting migration runner...\n');

  const migrations = [
    path.join(__dirname, 'sew4mi', 'supabase', 'migrations', '20241013000000_advanced_search_filters.sql'),
    path.join(__dirname, 'sew4mi', 'supabase', 'migrations', '20241013000001_setup_search_alerts_cron.sql')
  ];

  const results = [];

  for (const migration of migrations) {
    try {
      // Check if file exists
      await fs.access(migration);

      // Try running the migration
      const result = await runMigration(migration);
      results.push(result);

      // If too many failures, try with psql
      if (result.failed > result.success) {
        console.log('\nToo many failures, attempting with psql...');
        const psqlResult = await runMigrationWithPsql(migration);
        if (psqlResult.success) {
          console.log('✓ Migration successful with psql');
        }
      }
    } catch (error) {
      console.error(`Failed to process migration ${migration}:`, error.message);
      results.push({
        file: migration,
        error: error.message
      });
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));

  for (const result of results) {
    if (result.error) {
      console.log(`✗ ${path.basename(result.file)}: ERROR - ${result.error}`);
    } else {
      console.log(`${result.failed === 0 ? '✓' : '⚠'} ${path.basename(result.file)}: ${result.success}/${result.total} statements successful`);
    }
  }

  console.log('\nMigration runner completed!');
}

// Run the migrations
main().catch(console.error);