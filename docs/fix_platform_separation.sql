-- ==============================================================================
-- FIX: Separación de plataformas IAVolution y Metaverso B2B
-- 
-- 1. Añadimos una columna `app` a la tabla profiles.
-- 2. Actualizamos el trigger para respetar de dónde viene el usuario.
-- 3. Instrucciones de recuperación incluidas para Katia u otros eliminados.
-- ==============================================================================

-- 1. Añadir columna 'app' si no existe
ALTER TABLE iavolution.profiles 
ADD COLUMN IF NOT EXISTS app VARCHAR(50) DEFAULT 'iavolution';

-- Actualizamos a todos los existentes a 'iavolution' por seguridad inicial, 
-- el admin luego podrá organizarlos desde el panel.
UPDATE iavolution.profiles 
SET app = 'iavolution' 
WHERE app IS NULL;

-- 2. Modificamos el trigger combinado
CREATE OR REPLACE FUNCTION iavolution.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role_id UUID;
    target_role_name TEXT;
    target_app TEXT;
BEGIN
    -- Obtenemos el app desde los metadatos (por defecto 'iavolution' para retrocompatibilidad)
    target_app := COALESCE(new.raw_user_meta_data->>'app', 'iavolution');
    
    -- ========================================================
    -- PROYECTO 1: IAVolution → inserta en iavolution.profiles
    -- SOLO si pertenecen a Iavolution
    -- ========================================================
    IF target_app = 'iavolution' THEN
        target_role_name := COALESCE(new.raw_user_meta_data->>'role', 'student');

        SELECT id INTO target_role_id
        FROM iavolution.roles
        WHERE name = target_role_name;

        IF target_role_id IS NULL THEN
            SELECT id INTO target_role_id
            FROM iavolution.roles
            WHERE name = 'student';
        END IF;

        INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'name', new.email),
            target_role_id,
            'active',
            target_app
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, iavolution.profiles.name),
            role_id = COALESCE(EXCLUDED.role_id, iavolution.profiles.role_id),
            app = COALESCE(EXCLUDED.app, 'iavolution');
    END IF;

    -- ========================================================
    -- PROYECTO 2: Metaverso → inserta en public.profiles
    -- Siempre mantendrá su propia tabla si el esquema existe
    -- ========================================================
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        INSERT INTO public.profiles (id, email, role)
        VALUES (new.id, new.email, 'participant')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;

EXCEPTION WHEN OTHERS THEN
    -- Si algo falla, no bloqueamos el registro del usuario
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notificar a la API
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- RECOVERY DE KATIA AREVALO (O CUALQUIER OTRO ALUMNO AFECTADO)
-- El frontend ya tiene un parche para recuperar automáticamente el perfil al loguearse.
-- Si prefieres hacerlo a mano desde SQL, puedes buscarla en auth.users y hacer:
-- INSERT INTO iavolution.profiles (id, email, name, role_id, status)
-- SELECT id, email, raw_user_meta_data->>'name', (SELECT id FROM iavolution.roles WHERE name='student'), 'active' 
-- FROM auth.users WHERE email = 'correo_de_katia@ejemplo.com' ON CONFLICT DO NOTHING;
-- ==============================================================================
