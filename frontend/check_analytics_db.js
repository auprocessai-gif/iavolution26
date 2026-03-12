
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env or just try to use the client logic if possible
// Since I'm on the user's machine, I'll try to use their lib/supabase.js via node if possible, 
// but it's ESM. I'll just look for the env vars in the project.

async function checkView() {
    try {
        // I'll look for .env or common paths
        const envPath = 'c:/Users/Mario/Documents/iavolution/frontend/.env';
        if (!fs.existsSync(envPath)) {
            console.log('No .env found');
            return;
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
        const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

        if (!supabaseUrl || !supabaseAnonKey) {
            console.log('Missing Supabase credentials in .env');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        console.log('Checking v_student_performance...');
        const { data, error, count } = await supabase
            .schema('iavolution')
            .from('v_student_performance')
            .select('*', { count: 'exact' });

        if (error) {
            console.error('Error fetching v_student_performance:', error);
            if (error.code === 'PGRST116' || error.message.includes('not exist')) {
                console.log('VIEW DOES NOT EXIST');
            }
        } else {
            console.log(`Success! Found ${count} rows.`);
            if (data && data.length > 0) {
                console.log('Sample row:', JSON.stringify(data[0], null, 2));
            } else {
                console.log('The view is empty.');
            }
        }

        console.log('\nChecking user_sessions for activity chart...');
        const { data: sessions, error: sError } = await supabase
            .schema('iavolution')
            .from('user_sessions')
            .select('count', { count: 'exact' });
        
        if (sError) console.error('Error fetching sessions:', sError);
        else console.log(`Found ${sessions?.length || 0} session records.`);

    } catch (err) {
        console.error('Diagnostic failed:', err);
    }
}

checkView();
