-- =========================================================
-- Fix 'order' column in quiz_questions
-- Ensure it has a default value and is NOT NULL
-- =========================================================

-- Ensure the column exists and has the correct properties
DO $$ 
BEGIN
    -- Check if 'order' column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'iavolution' AND table_name = 'quiz_questions' AND column_name = 'order') THEN
        -- Set default value to 0 if it's missing
        ALTER TABLE iavolution.quiz_questions ALTER COLUMN "order" SET DEFAULT 0;
        
        -- Update any existing NULL values to 0 before applying NOT NULL constraint
        UPDATE iavolution.quiz_questions SET "order" = 0 WHERE "order" IS NULL;
        
        -- Ensure it's NOT NULL
        ALTER TABLE iavolution.quiz_questions ALTER COLUMN "order" SET NOT NULL;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE iavolution.quiz_questions ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
