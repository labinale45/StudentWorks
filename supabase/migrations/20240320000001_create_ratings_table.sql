-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for all users" ON ratings
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated users" ON ratings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ratings_student_id_idx ON ratings(student_id);
CREATE INDEX IF NOT EXISTS ratings_user_email_idx ON ratings(user_email);

-- Grant necessary permissions
GRANT ALL ON ratings TO authenticated;
GRANT ALL ON ratings TO service_role; 