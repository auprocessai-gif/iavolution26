-- ==============================================================================
-- MIGRACIÓN: ARREGLAR CÁLCULO DE NOTAS DE QUIZZES (ESCALA 0-10) Y TAREAS FALTANTES
-- ==============================================================================

DROP VIEW IF EXISTS iavolution.v_student_performance;

CREATE OR REPLACE VIEW iavolution.v_student_performance AS
WITH academic_stats AS (
    SELECT 
        c.id as course_id,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT mat.id) as total_materials,
        COUNT(DISTINCT CASE WHEN a.title NOT ILIKE '%proyecto%' THEN a.id END) as total_assignments,
        COUNT(DISTINCT q.id) as total_quizzes
    FROM iavolution.courses c
    LEFT JOIN iavolution.modules m ON c.id = m.course_id
    LEFT JOIN iavolution.lessons l ON m.id = l.module_id
    LEFT JOIN iavolution.materials mat ON l.id = mat.lesson_id
    LEFT JOIN iavolution.assignments a ON l.id = a.lesson_id
    LEFT JOIN iavolution.quizzes q ON l.id = q.lesson_id
    GROUP BY c.id
),
task_totals AS (
    SELECT 
        s.user_id,
        m.course_id,
        SUM(CAST(s.grade AS NUMERIC)) as total_task_points
    FROM iavolution.submissions s
    JOIN iavolution.assignments a ON s.assignment_id = a.id
    JOIN iavolution.lessons l ON a.lesson_id = l.id
    JOIN iavolution.modules m ON l.module_id = m.id
    WHERE s.grade IS NOT NULL AND a.title NOT ILIKE '%proyecto%'
    GROUP BY s.user_id, m.course_id
),
quiz_totals AS (
    SELECT 
        user_id,
        course_id,
        SUM(max_score) as total_quiz_points
    FROM (
        SELECT 
            qa.user_id,
            m.course_id,
            qa.quiz_id,
            MAX(qa.score) as max_score
        FROM iavolution.quiz_attempts qa
        JOIN iavolution.quizzes q ON qa.quiz_id = q.id
        JOIN iavolution.lessons l ON q.lesson_id = l.id
        JOIN iavolution.modules m ON l.module_id = m.id
        GROUP BY qa.user_id, m.course_id, qa.quiz_id
    ) user_quiz_max
    GROUP BY user_id, course_id
),
project_grades_from_assignments AS (
    SELECT 
        s.user_id,
        m.course_id,
        MAX(CAST(s.grade AS NUMERIC)) / 10.0 as project_grade,
        MAX(CASE WHEN s.grade IS NOT NULL THEN 'graded' ELSE 'submitted' END) as project_status
    FROM iavolution.submissions s
    JOIN iavolution.assignments a ON s.assignment_id = a.id
    JOIN iavolution.lessons l ON a.lesson_id = l.id
    JOIN iavolution.modules m ON l.module_id = m.id
    WHERE a.title ILIKE '%proyecto%'
    GROUP BY s.user_id, m.course_id
),
project_grades_from_projects AS (
    SELECT 
        ps.user_id,
        cp.course_id,
        MAX(ps.grade) as project_grade,
        MAX(ps.status) as project_status
    FROM iavolution.project_submissions ps
    JOIN iavolution.course_projects cp ON ps.project_id = cp.id
    GROUP BY ps.user_id, cp.course_id
),
project_grades AS (
    SELECT 
        COALESCE(pga.user_id, pgp.user_id) as user_id,
        COALESCE(pga.course_id, pgp.course_id) as course_id,
        COALESCE(pga.project_grade, pgp.project_grade) as project_grade,
        COALESCE(pga.project_status, pgp.project_status) as project_status
    FROM project_grades_from_assignments pga
    FULL OUTER JOIN project_grades_from_projects pgp 
        ON pga.user_id = pgp.user_id AND pga.course_id = pgp.course_id
),
session_totals AS (
    SELECT 
        user_id,
        course_id,
        SUM(total_minutes) as total_minutes,
        MAX(last_ping) as last_seen
    FROM iavolution.user_sessions
    GROUP BY user_id, course_id
),
student_academic_progress AS (
    SELECT 
        lp.user_id,
        m.course_id,
        COUNT(DISTINCT lp.lesson_id) as lessons_completed,
        0 as materials_viewed
    FROM iavolution.lesson_progress lp
    JOIN iavolution.lessons l ON lp.lesson_id = l.id
    JOIN iavolution.modules m ON l.module_id = m.id
    GROUP BY lp.user_id, m.course_id
    UNION ALL
    SELECT 
        mv.user_id,
        m.course_id,
        0 as lessons_completed,
        COUNT(DISTINCT mv.material_id) as materials_viewed
    FROM iavolution.material_views mv
    JOIN iavolution.materials mat ON mv.material_id = mat.id
    JOIN iavolution.lessons l ON mat.lesson_id = l.id
    JOIN iavolution.modules m ON l.module_id = m.id
    GROUP BY mv.user_id, m.course_id
),
aggregated_academic_progress AS (
    SELECT 
        user_id,
        course_id,
        SUM(lessons_completed) as lessons_completed,
        SUM(materials_viewed) as materials_viewed
    FROM student_academic_progress
    GROUP BY user_id, course_id
),
platform_totals AS (
    SELECT 
        user_id,
        SUM(total_minutes) as total_minutes
    FROM iavolution.user_sessions
    GROUP BY user_id
)
SELECT 
    p.id as user_id,
    p.name,
    p.email,
    e.course_id,
    e.edition_id,
    -- Tareas (Escala 0-100) -> Consideramos todas las tareas del curso. Si total_assignments es 0, nota es 0.
    ROUND(
        CASE WHEN stats.total_assignments > 0 THEN COALESCE(tt.total_task_points, 0) / stats.total_assignments ELSE 0 END, 0
    ) as avg_task_100,
    -- Quizzes (Escala 0-10) -> Consideramos todos los quizzes del curso.
    ROUND(
        CASE WHEN stats.total_quizzes > 0 THEN (COALESCE(qt.total_quiz_points, 0) / stats.total_quizzes) / 10.0 ELSE 0 END, 2
    ) as avg_quiz_10,
    -- Proyecto (Escala 0-10)
    COALESCE(pg.project_grade, 0) as project_grade,
    COALESCE(pg.project_status, 'not_submitted') as project_status,
    -- Nota Final (40% Tareas / 20% Tests / 40% Proyecto)
    ROUND(
        (CASE WHEN stats.total_assignments > 0 THEN (COALESCE(tt.total_task_points, 0) / stats.total_assignments) / 10.0 ELSE 0 END * 0.4) +
        (CASE WHEN stats.total_quizzes > 0 THEN (COALESCE(qt.total_quiz_points, 0) / stats.total_quizzes) / 10.0 ELSE 0 END * 0.2) +
        (COALESCE(pg.project_grade, 0) * 0.4),
        2
    ) as final_grade_10,
    COALESCE(ap.lessons_completed, 0) as lessons_completed,
    COALESCE(stats.total_lessons, 0) as total_lessons,
    COALESCE(ap.materials_viewed, 0) as materials_viewed,
    COALESCE(stats.total_materials, 0) as total_materials,
    CASE 
        WHEN (COALESCE(stats.total_lessons, 0) + COALESCE(stats.total_materials, 0)) > 0 
        THEN ROUND(
            ((COALESCE(ap.lessons_completed, 0) + COALESCE(ap.materials_viewed, 0))::NUMERIC / 
            (COALESCE(stats.total_lessons, 0) + COALESCE(stats.total_materials, 0))::NUMERIC) * 100
        )
        ELSE 0 
    END as progress_percent,
    COALESCE(st.total_minutes, 0) as total_minutes_spent,
    COALESCE(pt.total_minutes, 0) as total_platform_minutes,
    st.last_seen
FROM iavolution.profiles p
JOIN iavolution.enrollments e ON p.id = e.user_id
JOIN academic_stats stats ON e.course_id = stats.course_id
LEFT JOIN task_totals tt ON p.id = tt.user_id AND e.course_id = tt.course_id
LEFT JOIN quiz_totals qt ON p.id = qt.user_id AND e.course_id = qt.course_id
LEFT JOIN project_grades pg ON p.id = pg.user_id AND e.course_id = pg.course_id
LEFT JOIN aggregated_academic_progress ap ON p.id = ap.user_id AND e.course_id = ap.course_id
LEFT JOIN session_totals st ON p.id = st.user_id AND e.course_id = st.course_id
LEFT JOIN platform_totals pt ON p.id = pt.user_id;

GRANT SELECT ON iavolution.v_student_performance TO authenticated;
NOTIFY pgrst, 'reload schema';

