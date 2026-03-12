import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in frontend/.env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log(`Testing connection to: ${supabaseUrl}`);
    try {
        // Intentamos recuperar la lista de tablas o información de profiles
        const { data, error } = await supabase
            .schema('iavolution')
            .from('profiles')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error("Supabase Error:", error.message, error.details, error.hint);
        } else {
            console.log("Conection successful. Profiles count:", data);
        }
    } catch (err) {
        console.error("Network/System Error:", err.message);
    }
}

testConnection();
