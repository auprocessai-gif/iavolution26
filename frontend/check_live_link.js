import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock dotenv since we can't easily install it if not there, 
// but it is in package.json devDependencies? No, it's not.
// I'll just hardcode the values from what I read.

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const courseId = 'd253b24e-f055-4505-bd36-431c8b3a4729';

async function checkData() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('Course ID:', courseId);

    // 1. Check Course
    const { data: course, error: cErr } = await supabase
        .schema('iavolution')
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
    
    if (cErr) console.error('Course Error:', cErr);
    else console.log('Course Found:', course.title);

    // 2. Check Editions
    const { data: editions, error: eErr } = await supabase
        .schema('iavolution')
        .from('course_editions')
        .select('*')
        .eq('course_id', courseId);
    
    if (eErr) console.error('Editions Error:', eErr);
    else {
        console.log('Editions Count:', editions?.length);
        editions?.forEach(ed => {
            console.log(`- Ed: ${ed.name}, Status: ${ed.status}, Link: [${ed.live_class_url}]`);
        });
    }

    // 3. Check Enrollments for current course
    // (We don't know the student ID easily without login, but let's see any enrollment)
    const { data: enrollments, error: enErr } = await supabase
        .schema('iavolution')
        .from('enrollments')
        .select(`
            id,
            user_id,
            edition:course_editions(name, live_class_url)
        `)
        .eq('course_id', courseId);
    
    if (enErr) console.error('Enrollments Error:', enErr);
    else console.log('Enrollments Found:', enrollments?.length);

    console.log('--- DIAGNOSTIC END ---');
}

checkData();
