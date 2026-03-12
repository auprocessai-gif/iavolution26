require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking database state...");

    // Check Roles
    const { data: roles, error: rolesErr } = await supabase.schema('iavolution').from('roles').select('*');
    if (rolesErr) console.error("Error roles:", rolesErr);
    else console.log("Roles:", roles);

    // Check Profiles
    const { data: profiles, error: profErr } = await supabase.schema('iavolution').from('profiles').select('*');
    if (profErr) console.error("Error profiles:", profErr);
    else console.log("Profiles:", profiles);
}

checkData();
