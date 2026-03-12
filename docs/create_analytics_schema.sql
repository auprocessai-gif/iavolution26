-- Analytics and Session Tracking Schema for IAVolution

-- 1. Table for tracking user session time
CREATE TABLE IF NOT EXISTS iavolution.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT now(),
    last_ping TIMESTAMPTZ DEFAULT now(),
    total_minutes INTEGER DEFAULT 1,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to increment session minutes atomically
CREATE OR REPLACE FUNCTION iavolution.increment_minutes(row_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE iavolution.user_sessions
    SET total_minutes = total_minutes + 1,
        last_ping = now()
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE iavolution.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions
DROP POLICY IF EXISTS "Users can insert their own sessions" ON iavolution.user_sessions;
CREATE POLICY "Users can insert their own sessions" 
ON iavolution.user_sessions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON iavolution.user_sessions;
CREATE POLICY "Users can update their own sessions" 
ON iavolution.user_sessions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and Teachers can view all sessions" ON iavolution.user_sessions;
CREATE POLICY "Admins and Teachers can view all sessions" 
ON iavolution.user_sessions FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM iavolution.profiles p
        JOIN iavolution.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher', 'manager')
    )
);

-- 2. View for Aggregated Student Performance
-- This view calculates averages based on the weights: 70% Tasks (0-100) and 30% Quizzes (0-10)
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
session_totals AS (
    SELECT 
        user_id,
        course_id,
        SUM(total_minutes) as total_minutes,
        MAX(last_ping) as last_seen
    FROM iavolution.user_sessions
    GROUP BY user_id, course_id
)
SELECT 
    p.id as user_id,
    p.name,
    p.email,
    e.course_id,
    e.edition_id,
    COALESCE(ta.avg_task_grade, 0) as avg_task_100,
    COALESCE(qa.avg_quiz_score, 0) as avg_quiz_10,
    -- Formula: (Tasks/10 * 0.7) + (Quizzes * 0.3)
    ROUND(
        (COALESCE(ta.avg_task_grade, 0) / 10.0 * 0.7) + 
        (COALESCE(qa.avg_quiz_score, 0) * 0.3), 
        2
    ) as final_grade_10,
    COALESCE(st.total_minutes, 0) as total_minutes_spent,
    st.last_seen
FROM iavolution.profiles p
JOIN iavolution.enrollments e ON p.id = e.user_id
LEFT JOIN task_averages ta ON p.id = ta.user_id AND e.course_id = ta.course_id
LEFT JOIN quiz_averages qa ON p.id = qa.user_id AND e.course_id = qa.course_id
LEFT JOIN session_totals st ON p.id = st.user_id AND e.course_id = st.course_id;

-- Grant permissions
GRANT SELECT ON iavolution.v_student_performance TO authenticated;
GRANT ALL ON iavolution.user_sessions TO authenticated;
GRANT USAGE ON SCHEMA iavolution TO authenticated;
