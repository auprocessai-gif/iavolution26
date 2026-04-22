-- ==============================================================================
-- FIX: Permitir que admins/managers inserten perfiles directamente
-- Necesario para que el frontend pueda hacer upsert al crear usuarios
-- ==============================================================================

-- La política "Admins have all access to profiles" usa FOR ALL pero solo USING.
-- En PostgreSQL, para INSERT necesita WITH CHECK. Recreamos con ambos.

DROP POLICY IF EXISTS "Admins have all access to profiles" ON iavolution.profiles;
DROP POLICY IF EXISTS "Admins have all access to profiles v2" ON iavolution.profiles;

CREATE POLICY "Admins have all access to profiles"
    ON iavolution.profiles FOR ALL
    USING (iavolution.is_admin() OR iavolution.is_manager())
    WITH CHECK (iavolution.is_admin() OR iavolution.is_manager());

-- También necesitamos permitir que el propio usuario inserte su perfil
-- (por si el trigger tarda y el frontend hace upsert antes)
DROP POLICY IF EXISTS "Users can insert own profile" ON iavolution.profiles;
CREATE POLICY "Users can insert own profile"
    ON iavolution.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Refresco de caché
NOTIFY pgrst, 'reload schema';
