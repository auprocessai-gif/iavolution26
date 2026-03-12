import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auprocessia-supabase.glfrxs.easypanel.host';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    // try to log in as mariola or francisco
    const emailsToTry = ['mariola@iavolution.com', 'francisco@iavolution.com', 'mariola.garcia@gmail.com', 'francisco.castellano@gmail.com', 'mariola@gmail.com', 'francisco@gmail.com'];
    for(const email of emailsToTry) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: 'password123'
        });
        if (!error && data.user) {
            console.log('Logged in as:', email);
            
            const user = data.user;
            const { data: enrData, error: enrError } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .select(`
                    *,
                    course:courses(
                        id, title, description, cover_url,
                        modules(
                            id, 
                            lessons(id, materials(id))
                        )
                    )
                `)
                .eq('user_id', user.id);
            
            console.log('Enrollments Err:', enrError?.message);
            console.log('Enrollments Data Length:', enrData?.length);

            // test basic enrollments
            const { data: enrBasic, error: enrBasicError } = await supabase
                .schema('iavolution')
                .from('enrollments')
                .select('*')
                .eq('user_id', user.id);
            
            console.log('Basic Enrollments Data Length:', enrBasic?.length);

            // try teacher courses
            const { data: teacher, error: teacherErr } = await supabase
                .schema('iavolution')
                .from('courses')
                .select('*');
            console.log('Teacher Courses Length:', teacher?.length, teacherErr?.message);

            return;
        }
    }
    console.log('Could not log in as any test user');
}

runTest();
