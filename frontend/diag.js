import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('=== DIAGNOSTIC: Tables & Data ===');
    
    // 1. Check if material_views table exists
    const { data: mv, error: mvErr } = await supabase
        .schema('iavolution')
        .from('material_views')
        .select('*')
        .limit(5);
    
    if (mvErr) {
        console.error('material_views ERROR:', mvErr.code, mvErr.message);
        if (mvErr.code === '42P01' || mvErr.message.includes('does not exist')) {
            console.log('>>> TABLE material_views DOES NOT EXIST - SQL NOT RUN <<<');
        }
    } else {
        console.log('material_views OK, rows:', mv?.length);
    }

    // 2. Check if user_sessions table exists and has data
    const { data: us, error: usErr } = await supabase
        .schema('iavolution')
        .from('user_sessions')
        .select('*')
        .limit(5);
    
    if (usErr) {
        console.error('user_sessions ERROR:', usErr.code, usErr.message);
    } else {
        console.log('user_sessions OK, rows:', us?.length);
        if (us?.length > 0) {
            us.forEach(s => console.log(`  - user=${s.user_id.substring(0,8)}... mins=${s.total_minutes} last=${s.last_ping}`));
        }
    }

    // 3. Check if increment_minutes function exists in public schema
    const { error: rpcErr } = await supabase.rpc('increment_minutes', { row_id: '00000000-0000-0000-0000-000000000000' });
    if (rpcErr) {
        console.log('increment_minutes RPC:', rpcErr.code, rpcErr.message);
    } else {
        console.log('increment_minutes RPC: OK');
    }

    console.log('=== END ===');
}

run();
