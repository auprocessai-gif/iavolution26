-- User Management Updates: Adding Status Column
-- This column allows blocking users from accessing the platform.

-- 1. Add status column to iavolution.profiles
ALTER TABLE iavolution.profiles 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked'));

-- 2. Update existing users to 'active' (though DEFAULT handles it for new ones)
UPDATE iavolution.profiles SET status = 'active' WHERE status IS NULL;

-- 3. Ensure the management queries/views consider this if applicable
-- (In this case, we'll handle the block at the Auth level in the frontend)
