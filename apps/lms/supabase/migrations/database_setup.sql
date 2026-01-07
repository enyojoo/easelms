-- EaseLMS Initial Database Schema
-- This migration creates all necessary tables for the EaseLMS application
-- Based on the actual Supabase schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing (if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update instructors updated_at
CREATE OR REPLACE FUNCTION update_instructors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update quiz_questions updated_at
CREATE OR REPLACE FUNCTION update_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'learner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE
-- Stores user profile information linked to Supabase Auth users
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'learner' CHECK (user_type IN ('user', 'admin')),
  profile_image TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  email_verified BOOLEAN DEFAULT FALSE,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COURSES TABLE
-- Stores course information
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  enrolled_students INTEGER DEFAULT 0,
  requirements TEXT,
  who_is_this_for TEXT,
  preview_video TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  requires_sequential_progress BOOLEAN DEFAULT FALSE,
  minimum_quiz_score INTEGER,
  enrollment_mode TEXT NOT NULL DEFAULT 'free' CHECK (enrollment_mode IN ('free', 'buy', 'recurring')),
  recurring_price NUMERIC(10, 2),
  certificate_enabled BOOLEAN DEFAULT FALSE,
  certificate_template TEXT,
  certificate_title TEXT,
  certificate_description TEXT,
  signature_image TEXT,
  signature_title TEXT,
  additional_text TEXT,
  certificate_type TEXT CHECK (certificate_type IN ('completion', 'achievement', 'participation')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  signature_name TEXT
);

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LESSONS TABLE
-- Stores lesson information within courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'text', 'mixed')),
  content JSONB,
  order_index INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  video_progression BOOLEAN DEFAULT FALSE,
  allow_skip BOOLEAN DEFAULT FALSE,
  time_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  video_url TEXT,
  text_content TEXT,
  estimated_duration INTEGER DEFAULT 0
);

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RESOURCES TABLE
-- Stores downloadable resources (standalone table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('document', 'link')),
  url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  s3_key TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  file_hash TEXT,
  UNIQUE(url, created_by)
);

-- ============================================================================
-- LESSON_RESOURCES TABLE
-- Junction table linking lessons to resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_resources (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, resource_id)
);

-- ============================================================================
-- QUIZ_QUESTIONS TABLE
-- Stores quiz questions for lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question_type VARCHAR(50) NOT NULL DEFAULT 'multiple-choice',
  question_text TEXT NOT NULL,
  question_data JSONB NOT NULL DEFAULT '{}',
  points INTEGER DEFAULT 1,
  explanation TEXT,
  difficulty VARCHAR(20),
  time_limit INTEGER,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_quiz_questions_updated_at();

-- ============================================================================
-- QUIZ_SETTINGS TABLE
-- Stores quiz settings for lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_settings (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  shuffle_quiz BOOLEAN NOT NULL DEFAULT FALSE,
  max_attempts INTEGER DEFAULT 3,
  show_correct_answers BOOLEAN NOT NULL DEFAULT TRUE,
  allow_multiple_attempts BOOLEAN NOT NULL DEFAULT TRUE,
  time_limit INTEGER,
  passing_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id)
);

-- ============================================================================
-- QUIZ_ATTEMPTS TABLE
-- Tracks quiz attempts by users
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  question_order INTEGER[] NOT NULL,
  answer_orders JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id, attempt_number)
);

-- ============================================================================
-- QUIZ_RESULTS TABLE
-- Stores individual quiz question results
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  quiz_question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
  attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER NOT NULL DEFAULT 0,
  shuffled_question_order INTEGER[],
  shuffled_answer_orders JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENROLLMENTS TABLE
-- Tracks user enrollments in courses
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- ============================================================================
-- PROGRESS TABLE
-- Tracks detailed progress for individual lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  time_spent INTEGER DEFAULT 0,
  quiz_score INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id),
  UNIQUE(user_id, course_id, lesson_id)
);

CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PAYMENTS TABLE
-- Stores payment transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  amount_usd NUMERIC(10, 2) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  exchange_rate NUMERIC(10, 4) NOT NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'flutterwave')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- CERTIFICATES TABLE
-- Stores generated certificates
-- ============================================================================
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  course_title TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_url TEXT,
  template TEXT
);

-- ============================================================================
-- INSTRUCTORS TABLE
-- Stores instructor information
-- ============================================================================
CREATE TABLE IF NOT EXISTS instructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors
  FOR EACH ROW EXECUTE FUNCTION update_instructors_updated_at();

-- ============================================================================
-- PLATFORM_SETTINGS TABLE
-- Stores platform-wide settings including branding and notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  default_currency TEXT DEFAULT 'USD',
  course_enrollment_notifications BOOLEAN DEFAULT true,
  course_completion_notifications BOOLEAN DEFAULT true,
  platform_announcements BOOLEAN DEFAULT true,
  user_email_notifications BOOLEAN DEFAULT true,
  -- Brand settings (defaults are hardcoded in application code)
  platform_name TEXT,
  platform_description TEXT,
  logo_black TEXT,
  logo_white TEXT,
  favicon TEXT,
  -- SEO settings
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  seo_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COURSE_INSTRUCTORS TABLE
-- Junction table for courses and instructors (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_instructors (
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, instructor_id)
);

-- ============================================================================
-- COURSE_PREREQUISITES TABLE
-- Defines course prerequisites
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, prerequisite_course_id),
  CHECK (course_id != prerequisite_course_id)
);

-- ============================================================================
-- INDEXES for better query performance
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_mode ON courses(enrollment_mode);

-- Lessons indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);

-- Resources indexes
CREATE INDEX IF NOT EXISTS idx_resources_created_by ON resources(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_title ON resources(title);
CREATE INDEX IF NOT EXISTS idx_resources_file_hash ON resources(file_hash);

-- Lesson resources indexes
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_resource ON lesson_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson_id ON lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_resource_id ON lesson_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_order_index ON lesson_resources(lesson_id, order_index);

-- Quiz questions indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_id ON quiz_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(lesson_id, order_index);

-- Quiz settings indexes
CREATE INDEX IF NOT EXISTS idx_quiz_settings_lesson ON quiz_settings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_settings_enabled ON quiz_settings(enabled);

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_lesson ON quiz_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lookup ON quiz_attempts(user_id, lesson_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson ON quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON quiz_attempts(course_id);

-- Quiz results indexes
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_course_id ON quiz_results(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_lesson_id ON quiz_results(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_course ON quiz_results(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_question_id_new ON quiz_results(quiz_question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_attempt ON quiz_results(attempt_id);

-- Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_completed_at ON enrollments(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Progress indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course_id ON progress(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);

-- Certificates indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);

-- Course instructors indexes
CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor_id ON course_instructors(instructor_id);

-- Course prerequisites indexes
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_id ON course_prerequisites(prerequisite_course_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Courses policies
CREATE POLICY "Anyone can view published courses"
  ON courses FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Users can view their own courses"
  ON courses FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can create courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Course creators can update their courses"
  ON courses FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Admins can update any course"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Lessons policies
CREATE POLICY "Users can view lessons for enrolled courses"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE course_id = lessons.course_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all lessons"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can create lessons"
  ON lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Course creators can update their lessons"
  ON lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = lessons.course_id AND created_by = auth.uid()
    )
  );

-- Resources policies
CREATE POLICY "Users can view their own resources"
  ON resources FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view all resources"
  ON resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can create resources"
  ON resources FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Lesson resources policies
CREATE POLICY "Users can view lesson resources for enrolled courses"
  ON lesson_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN enrollments ON enrollments.course_id = lessons.course_id
      WHERE lessons.id = lesson_resources.lesson_id AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all lesson resources"
  ON lesson_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Quiz questions policies
CREATE POLICY "Users can view quiz questions for enrolled courses"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN enrollments ON enrollments.course_id = lessons.course_id
      WHERE lessons.id = quiz_questions.lesson_id AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all quiz questions"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Quiz settings policies
CREATE POLICY "Users can view quiz settings for enrolled courses"
  ON quiz_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN enrollments ON enrollments.course_id = lessons.course_id
      WHERE lessons.id = quiz_settings.lesson_id AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all quiz settings"
  ON quiz_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Quiz attempts policies
CREATE POLICY "Users can view their own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Quiz results policies
CREATE POLICY "Users can view their own quiz results"
  ON quiz_results FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own quiz results"
  ON quiz_results FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments"
  ON enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollments"
  ON enrollments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Progress policies
CREATE POLICY "Users can view their own progress"
  ON progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own progress"
  ON progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON progress FOR UPDATE
  USING (user_id = auth.uid());

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own payments"
  ON payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Certificates policies
CREATE POLICY "Users can view their own certificates"
  ON certificates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all certificates"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Instructors policies
CREATE POLICY "Anyone can view instructors"
  ON instructors FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage instructors"
  ON instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Course instructors policies
CREATE POLICY "Anyone can view course instructors"
  ON course_instructors FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage course instructors"
  ON course_instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Course prerequisites policies
CREATE POLICY "Anyone can view course prerequisites"
  ON course_prerequisites FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage course prerequisites"
  ON course_prerequisites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Platform settings policies
CREATE POLICY "Anyone can view platform settings"
  ON platform_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can delete platform settings"
  ON platform_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
