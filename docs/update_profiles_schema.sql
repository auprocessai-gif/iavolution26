-- Actualización de la Tabla de Perfiles para IAVolution
-- ==================================================

-- 1. Añadir nuevas columnas a la tabla de perfiles
ALTER TABLE iavolution.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Asegurar que las políticas de RLS permitan la actualización
-- (Ya deberían existir políticas para SELECT, pero necesitamos permitir que el usuario actualice su propio perfil)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile"
            ON iavolution.profiles FOR UPDATE
            USING (auth.uid() = id);
    END IF;
END $$;

-- 3. Recargar esquema
NOTIFY pgrst, 'reload schema';
