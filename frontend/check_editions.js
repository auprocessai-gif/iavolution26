import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllEditions() {
    console.log("Fetching all editions in 'iavolution' schema...");
    const { data: editions, error } = await supabase
        .schema('iavolution')
        .from('course_editions')
        .select('id, name, live_class_url');

    if (error) {
        console.error("Error fetching editions:", error);
        return;
    }

    console.log("Editions found:", editions.length);
    editions.forEach(ed => {
        console.log(`- ID: ${ed.id}, Name: ${ed.name}, URL: ${ed.live_class_url || 'NULL'}`);
    });
}

checkAllEditions();
