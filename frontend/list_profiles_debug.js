import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllProfiles() {
    console.log("Listing all profiles in 'iavolution' schema...");
    const { data, error } = await supabase
        .schema('iavolution')
        .from('profiles')
        .select('id, email, name');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Profiles found:", data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

listAllProfiles();
