
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function checkView() {
    try {
        const envPath = './.env';
        if (!fs.existsSync(envPath)) {
            console.log('No .env found');
            return;
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
        const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

        if (!supabaseUrl || !supabaseAnonKey) {
            console.log('Missing Supabase credentials in .env');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        console.log('Checking v_student_performance...');
        const { data, error, count } = await supabase
            .schema('iavolution')
            .from('v_student_performance')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching v_student_performance:', error);
        } else {
            if (data && data.length > 0) {
                console.log('Columns available:', Object.keys(data[0]));
                console.log('Sample row:', JSON.stringify(data[0], null, 2));
            } else {
                console.log('The view is empty.');
            }
        }

    } catch (err) {
        console.error('Diagnostic failed:', err);
    }
}

checkView();
