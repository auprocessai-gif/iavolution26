import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMariolaData() {
    console.log("Checking Mariola's data using .schema('iavolution')...");

    // 1. Get Mariola's profile
    const { data: profile, error: pError } = await supabase
        .schema('iavolution')
        .from('profiles')
        .select('id, email, name')
        .ilike('email', '%mariola%')
        .limit(1)
        .maybeSingle();

    if (pError) {
        console.error("Error finding profile:", pError);
        return;
    }
    if (!profile) {
        console.log("Profile not found for 'mariola'");
        return;
    }
    console.log("Profile found:", profile);

    // 2. Get enrollments
    const { data: enrollments, error: eError } = await supabase
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

    if (eError) {
        console.error("Error fetching enrollments:", eError);
        return;
    }

    console.log("Enrollments found:", enrollments.length);
    enrollments.forEach(enr => {
        console.log(`- Course: ${enr.course?.title}`);
        console.log(`  Edition: ${enr.edition?.name}`);
        console.log(`  Live Class URL: ${enr.edition?.live_class_url || 'NOT SET'}`);
    });
}

checkMariolaData();
