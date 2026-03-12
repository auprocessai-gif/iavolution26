-- Course Events and Calendar Schema for IAVolution

-- 1. Table for tracking course events (tutorias, milestones, etc.)
CREATE TABLE IF NOT EXISTS iavolution.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'tutoria', -- 'tutoria', 'exam', 'milestone', 'other'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    edition_id UUID REFERENCES iavolution.course_editions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE iavolution.events ENABLE ROW LEVEL SECURITY;

-- Policies for events
DROP POLICY IF EXISTS "Anyone enrolled can view course events" ON iavolution.events;
CREATE POLICY "Anyone enrolled can view course events" 
ON iavolution.events FOR SELECT 
TO authenticated 
USING (
    -- Admins/Teachers can see everything
    EXISTS (
        SELECT 1 FROM iavolution.profiles p
        JOIN iavolution.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher', 'manager')
    )
    OR
    -- Students can see events for their enrolled courses and editions
    EXISTS (
        SELECT 1 FROM iavolution.enrollments e
        WHERE e.user_id = auth.uid() 
        AND e.course_id = iavolution.events.course_id
        AND (iavolution.events.edition_id IS NULL OR e.edition_id = iavolution.events.edition_id)
    )
);

DROP POLICY IF EXISTS "Admins and Teachers can manage events" ON iavolution.events;
CREATE POLICY "Admins and Teachers can manage events" 
ON iavolution.events FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM iavolution.profiles p
        JOIN iavolution.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM iavolution.profiles p
        JOIN iavolution.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.name IN ('admin', 'teacher', 'manager')
    )
);

-- Grant permissions
GRANT ALL ON iavolution.events TO authenticated;
