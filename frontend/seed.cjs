require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function runSeed() {
    console.log("🌱 Inciando recuperación de datos...");

    try {
        // 1. Roles
        console.log("1. Creando roles...");
        const roles = [
            { name: 'admin', description: 'Administrador total del sistema' },
            { name: 'manager', description: 'Gestor Académico' },
            { name: 'teacher', description: 'Profesor' },
            { name: 'student', description: 'Alumno' }
        ];

        for (const role of roles) {
            await supabaseAdmin.schema('iavolution').from('roles').upsert(role, { onConflict: 'name' });
        }
        console.log("✅ Roles creados o verificados.");

        // 2. Curso de prueba
        console.log("2. Recreando curso de prueba...");

        const mockCourse = {
            title: 'Máster en IA Generativa 2026',
            description: 'Recuperado de la base de datos anterior. Aprende a dominar las IAs generativas.',
            category: 'Inteligencia Artificial',
            status: 'published'
        };

        const { data: courseData, error: courseError } = await supabaseAdmin
            .schema('iavolution')
            .from('courses')
            .insert(mockCourse)
            .select()
            .single();

        if (courseError) throw courseError;

        // 3. Módulos y Lecciones
        console.log("3. Creando módulos y lecciones...");
        const { data: moduleData } = await supabaseAdmin
            .schema('iavolution')
            .from('modules')
            .insert({ title: 'Introducción a LLMs', course_id: courseData.id, order: 1 })
            .select()
            .single();

        const { data: lessonData } = await supabaseAdmin
            .schema('iavolution')
            .from('lessons')
            .insert({ title: 'Prompt engineering básico', module_id: moduleData.id, order: 1 })
            .select()
            .single();

        // 4. Edición de curso
        console.log("4. Creando edición activa...");
        const { data: editionData } = await supabaseAdmin
            .schema('iavolution')
            .from('course_editions')
            .insert({ course_id: courseData.id, name: 'Edición Recuperación 2026', status: 'active' })
            .select()
            .single();

        console.log("🎉 Datos base recreados con éxito!");
        console.log(`- Curso: ${courseData.title}`);
        console.log(`- Edición: ${editionData.name}`);
        console.log(`- Módulo: ${moduleData.title}`);

    } catch (err) {
        console.error("❌ Error durante el seeding:", err);
    }
}

runSeed();
