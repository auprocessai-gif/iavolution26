-- ==============================================================================
-- MIGRACIÓN: ARREGLAR CÁLCULO DE NOTAS DE QUIZZES (ESCALA 0-10)
-- ==============================================================================

DROP VIEW IF EXISTS iavolution.v_student_performance;

CREATE OR REPLACE VIEW iavolution.v_student_performance AS
WITH task_averages AS (
    SELECT 
        user_id,
        course_id,
        AVG(CAST(grade AS NUMERIC)) as avg_task_grade
    FROM iavolution.submissions s
    JOIN iavolution.assignments a ON s.assignment_id = a.id
    JOIN iavolution.lessons l ON a.lesson_id = l.id
    JOIN iavolution.modules m ON l.module_id = m.id
    WHERE s.grade IS NOT NULL
    GROUP BY user_id, course_id
),
quiz_averages AS (
    SELECT 
        user_id,
        course_id,
        AVG(score) as avg_quiz_score
    FROM iavolution.quiz_attempts qa
    JOIN iavolution.quizzes q ON qa.quiz_id = q.id
    JOIN iavolution.lessons l ON q.lesson_id = l.id
    JOIN iavolution.modules m ON l.module_id = m.id
    GROUP BY user_id, course_id
),
project_grades AS (
    SELECT 
        ps.user_id,
        cp.course_id,
        ps.grade as project_grade,
        ps.status as project_status
    FROM iavolution.project_submissions ps
    JOIN iavolution.course_projects cp ON ps.project_id = cp.id
    WHERE ps.grade IS NOT NULL
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
academic_stats AS (
    SELECT 
        c.id as course_id,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT mat.id) as total_materials
    FROM iavolution.courses c
    LEFT JOIN iavolution.modules m ON c.id = m.course_id
    LEFT JOIN iavolution.lessons l ON m.id = l.module_id
    LEFT JOIN iavolution.materials mat ON l.id = mat.lesson_id
    GROUP BY c.id
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
    COALESCE(ta.avg_task_grade, 0) as avg_task_100,
    ROUND(COALESCE(qa.avg_quiz_score, 0) / 10.0, 2) as avg_quiz_10,
    COALESCE(pg.project_grade, 0) as project_grade,
    COALESCE(pg.project_status, 'not_submitted') as project_status,
    -- Nota Final (40% Tareas / 20% Tests / 40% Proyecto)
    ROUND(
        (COALESCE(ta.avg_task_grade, 0) / 10.0 * 0.4) + -- Tareas (0-10 escala)
        (COALESCE(qa.avg_quiz_score, 0) / 10.0 * 0.2) + -- Tests (0-10 escala)
        (COALESCE(pg.project_grade, 0) * 0.4),          -- Proyecto (0-10 escala)
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
LEFT JOIN task_averages ta ON p.id = ta.user_id AND e.course_id = ta.course_id
LEFT JOIN quiz_averages qa ON p.id = qa.user_id AND e.course_id = qa.course_id
LEFT JOIN project_grades pg ON p.id = pg.user_id AND e.course_id = pg.course_id
LEFT JOIN aggregated_academic_progress ap ON p.id = ap.user_id AND e.course_id = ap.course_id
LEFT JOIN session_totals st ON p.id = st.user_id AND e.course_id = st.course_id
LEFT JOIN platform_totals pt ON p.id = pt.user_id;

GRANT SELECT ON iavolution.v_student_performance TO authenticated;
NOTIFY pgrst, 'reload schema';
