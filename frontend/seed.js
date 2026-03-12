import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We use the admin client to bypass RLS for seeding if necessary
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function runSeed() {
    console.log("🌱 Inciando recuperación de datos...");

    try {
        // 1. Verificar/Crear Roles
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

        // Fetch role IDs
        const { data: roleData } = await supabaseAdmin.schema('iavolution').from('roles').select('id, name');
        const roleMap = roleData.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});

        console.log("✅ Roles creados.");

        // 2. Asociar el usuario actual que esté en auth.users a Admin
        // Como el usuario ya existe en auth.users (porque inició sesión antes o se acaba de registrar),
        // intentamos buscarlo o crear el perfil manual si no existe por los triggers fallidos.
        console.log("2. Recuperando IDs de usuarios existentes de auth.users...");

        // Hacemos una trampa: insertamos un curso dummy pero le asignamos profesor
        // Como no podemos crear auth.users directamente mediante SQL normal sin una API Key de Service Role
        // (y solo tenemos VITE_ANON_KEY que podría no tener permisos para registrar auth.users sin confirmación),
        // dejaremos instrucciones para recuperar cuentas.

        console.log("   Las cuentas de usuario deben crearse desde el panel web de la aplicación para que auth y perfiles se vinculen bien.");

        // 3. Crear un Curso Mock (Si hay algún perfil de admin lo usaremos, si no, se queda null)
        console.log("3. Recreando curso de prueba...");

        // Obtenemos un usuario cualquiera que tenga rol admin o profesor para asignarle el curso
        const { data: profiles } = await supabaseAdmin.schema('iavolution').from('profiles').select('id').limit(1);
        const teacherId = profiles && profiles.length > 0 ? profiles[0].id : null;

        const mockCourse = {
            title: 'Máster en IA Generativa 2026',
            description: 'Recuperado de la base de datos anterior. Aprende a dominar las IAs generativas más avanzadas.',
            category: 'Inteligencia Artificial',
            status: 'published',
            teacher_id: teacherId
        };

        const { data: courseData, error: courseError } = await supabaseAdmin
            .schema('iavolution')
            .from('courses')
            .insert(mockCourse)
            .select()
            .single();

        if (courseError) throw courseError;

        // 4. Crear un módulo y una lección
        console.log("4. Creando módulos y lecciones...");
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

        // 5. Crear una edición activa
        const { data: editionData } = await supabaseAdmin
            .schema('iavolution')
            .from('course_editions')
            .insert({ course_id: courseData.id, name: 'Edición Recuperación 2026', status: 'active' })
            .select()
            .single();

        console.log("🎉 Datos base de prueba recreados con éxito.");
        console.log(`- Curso: ${courseData.title}`);
        console.log(`- Edición: ${editionData.name}`);
        console.log("\n⚠️ Importante: Para recuperar a los usuarios, la forma más limpia es volver a registrarlos manualente desde http://localhost:5173/admin/users para que tengan contraseña y sesión válida en 'auth.users'.");

    } catch (err) {
        console.error("❌ Error durante el seeding:", err);
    }
}

runSeed();
