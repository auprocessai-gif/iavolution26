import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEditions() {
    const { data, error } = await supabase
        .schema('iavolution')
        .from('course_editions')
        .select(`
            id,
            name,
            live_class_url,
            course:courses(title)
        `)
        .ilike('name', '%Recuperaci%');

    if (error) {
        console.error("Error fetching editions:", error);
    } else {
        console.log("Ediciones encontradas:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkEditions();
