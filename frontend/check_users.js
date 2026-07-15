import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: profiles, error } = await supabase
        .schema('iavolution')
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);
    
    // Find Katia
    const katia = profiles.find(p => p.email && p.email.toLowerCase().includes('katia'));
    console.log('Katia profile:', katia);

    // List recent profiles
    console.log('Recent 10 profiles:', profiles.slice(0, 10).map(p => ({
        id: p.id,
        email: p.email,
        name: p.full_name || p.name,
        role: p.role_id,
        app: p.app_id || p.platform // checking for any potential app filter field
    })));
}

main();
