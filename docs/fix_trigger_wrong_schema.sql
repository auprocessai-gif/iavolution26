-- ==============================================================================
-- FIX CRÍTICO: El trigger on_auth_user_created apunta a public.profiles
-- en lugar de iavolution.profiles. Hay que recrearlo correctamente.
-- ==============================================================================

-- 1. Recrear la función del trigger apuntando al esquema correcto
CREATE OR REPLACE FUNCTION iavolution.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role_id UUID;
    target_role_name TEXT;
BEGIN
    -- Obtener el rol del metadata, por defecto 'student'
    target_role_name := COALESCE(new.raw_user_meta_data->>'role', 'student');

    -- Obtener el ID del rol en iavolution.roles
    SELECT id INTO target_role_id
    FROM iavolution.roles
    WHERE name = target_role_name;

    -- Si no se encuentra el rol, usar 'student' por defecto
    IF target_role_id IS NULL THEN
        SELECT id INTO target_role_id
        FROM iavolution.roles
        WHERE name = 'student';
    END IF;

    -- Insertar en iavolution.profiles (no en public.profiles)
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
        role_id = COALESCE(EXCLUDED.role_id, iavolution.profiles.role_id),
        status = COALESCE(iavolution.profiles.status, 'active');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar el trigger viejo y recrearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION iavolution.handle_new_user();

-- 3. Refresco de caché
NOTIFY pgrst, 'reload schema';

-- 4. (Opcional) Sincronizar usuarios existentes en auth.users que no tengan perfil
INSERT INTO iavolution.profiles (id, email, name, role_id, status)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', u.email),
    (SELECT id FROM iavolution.roles WHERE name = 'student' LIMIT 1),
    'active'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM iavolution.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
