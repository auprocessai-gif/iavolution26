const { createClient } = require('@supabase/supabase-client');
const dotenv = require('dotenv');

dotenv.config({ path: './frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const courseId = 'd253b24e-f055-4505-bd36-431c8b3a4729';

async function checkEditions() {
    console.log('Checking editions for course:', courseId);
    const { data: editions, error } = await supabase
        .schema('iavolution')
        .from('course_editions')
        .select('*')
        .eq('course_id', courseId);

    if (error) {
        console.error('Error fetching editions:', error);
        return;
    }

    if (!editions || editions.length === 0) {
        console.log('No editions found for this course.');
        return;
    }

    console.log('Found editions:', editions.length);
    editions.forEach(ed => {
        console.log(`- ${ed.name}: Status=${ed.status}, Link=${ed.live_class_url || 'NONE'}`);
    });
}

checkEditions();
