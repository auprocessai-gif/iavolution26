-- ==============================================================================
-- FIX: Trigger combinado que soporta AMBOS proyectos en la misma instancia
-- - iavolution.profiles → para IAVolution LMS
-- - public.profiles → para el proyecto del Metaverso (comportamiento original)
-- ==============================================================================

CREATE OR REPLACE FUNCTION iavolution.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role_id UUID;
    target_role_name TEXT;
BEGIN
    -- ========================================================
    -- PROYECTO 1: IAVolution → inserta en iavolution.profiles
    -- ========================================================
    target_role_name := COALESCE(new.raw_user_meta_data->>'role', 'student');

    SELECT id INTO target_role_id
    FROM iavolution.roles
    WHERE name = target_role_name;

    IF target_role_id IS NULL THEN
        SELECT id INTO target_role_id
        FROM iavolution.roles
        WHERE name = 'student';
    END IF;

    INSERT INTO iavolution.profiles (id, email, name, role_id, status)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', new.email),
        target_role_id,
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, iavolution.profiles.name),
        role_id = COALESCE(EXCLUDED.role_id, iavolution.profiles.role_id);

    -- ========================================================
    -- PROYECTO 2: Metaverso → inserta en public.profiles
    -- Mantiene el comportamiento original del trigger anterior
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

-- Recrear el trigger con la función combinada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION iavolution.handle_new_user();

NOTIFY pgrst, 'reload schema';
