-- ==============================================================================
-- RESTAURAR A KATIA (ACTUALIZANDO SI YA EXISTE)
-- ==============================================================================

INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', email), 
    (SELECT id FROM iavolution.roles WHERE name = 'student' LIMIT 1), 
    'active',
    'iavolution'
FROM auth.users 
WHERE email = 'arevalo.katia@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    role_id = EXCLUDED.role_id,
    status = 'active',
    app = 'iavolution',
    email = EXCLUDED.email;

-- Si esto muestra "Query executed successfully" y afecta a 1 fila, 
-- ve al panel de la web y recarga.
