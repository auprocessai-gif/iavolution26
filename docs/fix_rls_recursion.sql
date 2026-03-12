-- ==============================================================================
-- MIGRACIÓN: CORREGIR RECURSIÓN INFINITA EN RLS
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Crear funciones auxiliares con SECURITY DEFINER
-- Al ser security definer, se ejecutan con privilegios de postgres/owner, 
-- saltándose el RLS interno para estas consultas y rompiendo la recursión.

CREATE OR REPLACE FUNCTION iavolution.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM iavolution.profiles p
    JOIN iavolution.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION iavolution.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM iavolution.profiles p
    JOIN iavolution.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION iavolution.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM iavolution.profiles p
    JOIN iavolution.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recrear políticas de Perfiles (profiles)
-- Primero eliminamos las que causan problemas
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON iavolution.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON iavolution.profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON iavolution.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON iavolution.profiles;

-- Creamos nuevas políticas limpias
CREATE POLICY "Profiles are readable by everyone"
    ON iavolution.profiles FOR SELECT
    USING (true);

CREATE POLICY "Admins have all access to profiles"
    ON iavolution.profiles FOR ALL
    USING (iavolution.is_admin() OR iavolution.is_manager());

CREATE POLICY "Users can edit own profile"
    ON iavolution.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 3. Actualizar políticas en otras tablas para mayor limpieza (opcional pero recomendado)

-- Course Editions
DROP POLICY IF EXISTS "Admins specify course editions" ON iavolution.course_editions;
CREATE POLICY "Staff manage course editions"
    ON iavolution.course_editions FOR ALL
    USING (iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher());

-- Enrollments
DROP POLICY IF EXISTS "Admins ven todas las matriculaciones" ON iavolution.enrollments;
CREATE POLICY "Staff manage all enrollments"
    ON iavolution.enrollments FOR ALL
    USING (iavolution.is_admin() OR iavolution.is_manager());

-- 4. Forzar refresco
NOTIFY pgrst, 'reload schema';
