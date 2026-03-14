-- ==============================================================================
-- SCRIPT: CREAR PROYECTO FINAL POR DEFECTO PARA TODOS LOS CURSOS
-- ==============================================================================

-- Este script crea una entrada en la tabla de proyectos para cada curso existente.
-- Esto hará que el botón de "Proyecto Final" aparezca en la interfaz.

INSERT INTO iavolution.course_projects (course_id, title, instructions, rubric)
SELECT 
    id as course_id, 
    'Proyecto Final: ' || title as title,
    'En este proyecto final deberás aplicar todos los conocimientos adquiridos durante el curso. Puedes entregar un documento PDF, un enlace a un repositorio de GitHub o un enlace a Google Drive con tu trabajo.' as instructions,
    '1. Calidad del contenido: 5 puntos' || chr(10) || '2. Aplicación práctica: 3 puntos' || chr(10) || '3. Presentación y formato: 2 puntos' as rubric
FROM iavolution.courses
ON CONFLICT (course_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
