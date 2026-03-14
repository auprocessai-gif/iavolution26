-- ==============================================================================
-- FIX: Eliminar usuarios completamente (profiles + auth.users)
-- ==============================================================================

-- Función que elimina un usuario de auth.users (requiere SECURITY DEFINER)
-- Solo puede ser llamada por staff (admin/teacher/manager)
CREATE OR REPLACE FUNCTION iavolution.delete_user_completely(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iavolution, public
AS $$
BEGIN
    -- Verificar que el usuario que llama es staff
    IF NOT iavolution.is_staff() THEN
        RAISE EXCEPTION 'Solo el personal autorizado puede eliminar usuarios';
    END IF;

    -- 1. Eliminar el perfil (cascadeará a enrollments, etc.)
    DELETE FROM iavolution.profiles WHERE id = target_user_id;

    -- 2. Eliminar el usuario de auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Dar permisos para que usuarios autenticados puedan llamar a esta función
GRANT EXECUTE ON FUNCTION iavolution.delete_user_completely(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
