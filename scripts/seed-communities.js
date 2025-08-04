const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCommunities() {
  try {
    console.log('Seeding communities...');
    
    // Read the seed file
    const seedSQL = fs.readFileSync(path.join(__dirname, '../supabase/seed_communities.sql'), 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing statement...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error('Error executing statement:', error);
        // Continue with next statement
      }
    }
    
    // Check if communities were created
    const { data: communities, error: fetchError } = await supabase
      .from('communities')
      .select('id, name, is_featured, trending_score')
      .order('trending_score', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching communities:', fetchError);
    } else {
      console.log(`Successfully seeded ${communities.length} communities:`);
      communities.forEach(c => {
        console.log(`- ${c.name} (featured: ${c.is_featured}, trending: ${c.trending_score})`);
      });
    }
    
  } catch (error) {
    console.error('Error seeding communities:', error);
  }
}

seedCommunities();