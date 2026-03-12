import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log("Listing tables in 'iavolution' schema...");
    const { data, error } = await supabase.rpc('get_tables_in_schema', { schema_name: 'iavolution' });

    if (error) {
        console.log("RPC failed, trying direct select from pg_catalog...");
        // This might fail due to lack of permissions for 'anon' role
        const { data: data2, error: error2 } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', 'iavolution');

        if (error2) {
            console.error("Direct select failed:", error2);
        } else {
            console.log("Tables found:", data2);
        }
    } else {
        console.log("Tables found (RPC):", data);
    }
}

listTables();
