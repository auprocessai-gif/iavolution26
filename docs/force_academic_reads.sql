-- Restauramos acceso SELECT global a todo el contenido académico para usuarios autenticados
GRANT SELECT ON iavolution.materials TO authenticated;
GRANT SELECT ON iavolution.course_editions TO authenticated;
GRANT SELECT ON iavolution.modules TO authenticated;
GRANT SELECT ON iavolution.lessons TO authenticated;
GRANT SELECT ON iavolution.materials TO anon;
GRANT SELECT ON iavolution.roles TO authenticated;
GRANT SELECT ON iavolution.roles TO anon;

-- Políticas universales de lectura para contenido académico
DROP POLICY IF EXISTS "Todo el mundo lee materiales" ON iavolution.materials;
CREATE POLICY "Todo el mundo lee materiales" ON iavolution.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todo el mundo lee modulos" ON iavolution.modules;
CREATE POLICY "Todo el mundo lee modulos" ON iavolution.modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todo el mundo lee lecciones" ON iavolution.lessons;
CREATE POLICY "Todo el mundo lee lecciones" ON iavolution.lessons FOR SELECT USING (true);

-- Política para ediciones
DROP POLICY IF EXISTS "Todo el mundo lee ediciones" ON iavolution.course_editions;
CREATE POLICY "Todo el mundo lee ediciones" ON iavolution.course_editions FOR SELECT USING (true);

-- Forzar parche completo de Caché PostgREST
NOTIFY pgrst, 'reload schema';
