import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnrollments() {
    console.log("Checking Mariola's enrollments...");

    // 1. Get Mariola's profile
    const { data: profile } = await supabase
        .schema('iavolution')
        .from('profiles')
        .select('id, email')
        .ilike('email', '%mariola%')
        .maybeSingle();

    if (!profile) {
        console.log("Mariola not found.");
        return;
    }
    console.log("Mariola ID:", profile.id);

    // 2. Get all enrollments for her
    const { data: enrollments, error } = await supabase
        .schema('iavolution')
        .from('enrollments')
        .select(`
            id,
            course_id,
            edition_id,
            course:courses(title),
            edition:course_editions(name, live_class_url)
        `)
        .eq('user_id', profile.id);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Total enrollments:", enrollments.length);
        console.log(JSON.stringify(enrollments, null, 2));
    }
}

checkEnrollments();
