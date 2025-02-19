-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase's auth.users table)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  is_instructor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workspace_users table (for managing roles within workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES public.users(id) NOT NULL,
  price DECIMAL(10, 2),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, course_id)
);

-- Create progress table
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, lesson_id)
);

-- Create workshops table
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES public.users(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER,
  price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workshop_registrations table
CREATE TABLE IF NOT EXISTS public.workshop_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  workshop_id UUID REFERENCES public.workshops(id) NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, workshop_id)
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) NOT NULL,
  question TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create quiz_answers table
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_quiz_results table
CREATE TABLE IF NOT EXISTS public.user_quiz_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) NOT NULL,
  score INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, quiz_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) NOT NULL,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  recipient_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Workspace members can view workspace" ON public.workspaces FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id = id AND user_id = auth.uid())
);
CREATE POLICY "Workspace owner can update workspace" ON public.workspaces FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Workspace members can view roles" ON public.workspace_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.workspace_id = workspace_id AND wu.user_id = auth.uid())
);
CREATE POLICY "Workspace owner can manage roles" ON public.workspace_users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
);

CREATE POLICY "Workspace members can view courses" ON public.courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id = courses.workspace_id AND user_id = auth.uid())
);
CREATE POLICY "Instructors can manage their courses" ON public.courses FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Enrolled users can view lessons" ON public.lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = lessons.course_id AND user_id = auth.uid())
);
CREATE POLICY "Instructors can manage lessons" ON public.lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = lessons.course_id AND instructor_id = auth.uid())
);

CREATE POLICY "Users can view their enrollments" ON public.enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own progress" ON public.progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own progress" ON public.progress FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Workspace members can view workshops" ON public.workshops FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id = workshops.workspace_id AND user_id = auth.uid())
);
CREATE POLICY "Instructors can manage their workshops" ON public.workshops FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Users can view their workshop registrations" ON public.workshop_registrations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can register for workshops" ON public.workshop_registrations FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enrolled users can view quizzes" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments e JOIN public.lessons l ON e.course_id = l.course_id WHERE l.id = quizzes.lesson_id AND e.user_id = auth.uid())
);
CREATE POLICY "Instructors can manage quizzes" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON l.course_id = c.id WHERE l.id = quizzes.lesson_id AND c.instructor_id = auth.uid())
);

CREATE POLICY "Enrolled users can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments e JOIN public.lessons l ON e.course_id = l.course_id JOIN public.quizzes q ON l.id = q.lesson_id WHERE q.id = quiz_questions.quiz_id AND e.user_id = auth.uid())
);
CREATE POLICY "Instructors can manage quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.lessons l ON q.lesson_id = l.id JOIN public.courses c ON l.course_id = c.id WHERE q.id = quiz_questions.quiz_id AND c.instructor_id = auth.uid())
);

CREATE POLICY "Enrolled users can view quiz answers" ON public.quiz_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments e JOIN public.lessons l ON e.course_id = l.course_id JOIN public.quizzes q ON l.id = q.lesson_id JOIN public.quiz_questions qq ON q.id = qq.quiz_id WHERE qq.id = quiz_answers.question_id AND e.user_id = auth.uid())
);
CREATE POLICY "Instructors can manage quiz answers" ON public.quiz_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON qq.quiz_id = q.id JOIN public.lessons l ON q.lesson_id = l.id JOIN public.courses c ON l.course_id = c.id WHERE qq.id = quiz_answers.question_id AND c.instructor_id = auth.uid())
);

CREATE POLICY "Users can view their own quiz results" ON public.user_quiz_results FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own quiz results" ON public.user_quiz_results FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Create functions for workspace and user management
CREATE OR REPLACE FUNCTION public.create_workspace_and_assign_owner(
  p_workspace_name TEXT,
  p_subdomain TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Create the workspace
  INSERT INTO public.workspaces (name, subdomain, owner_id)
  VALUES (p_workspace_name, p_subdomain, p_user_id)
  RETURNING id INTO v_workspace_id;

  -- Assign the owner role to the user
  INSERT INTO public.workspace_users (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, 'owner');

  RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_subdomain_available(p_subdomain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE subdomain = p_subdomain
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a user record when a new auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a trigger to automatically delete related records when a user is deleted
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete user's enrollments
  DELETE FROM public.enrollments WHERE user_id = OLD.id;
  
  -- Delete user's progress
  DELETE FROM public.progress WHERE user_id = OLD.id;
  
  -- Delete user's workshop registrations
  DELETE FROM public.workshop_registrations WHERE user_id = OLD.id;
  
  -- Delete user's quiz results
  DELETE FROM public.user_quiz_results WHERE user_id = OLD.id;
  
  -- Delete user's messages
  DELETE FROM public.messages WHERE sender_id = OLD.id OR recipient_id = OLD.id;
  
  -- Delete user's notifications
  DELETE FROM public.notifications WHERE user_id = OLD.id;
  
  -- Remove user from workspaces
  DELETE FROM public.workspace_users WHERE user_id = OLD.id;
  
  -- Transfer ownership of workspaces or delete if no other members
  UPDATE public.workspaces
  SET owner_id = (
    SELECT user_id
    FROM public.workspace_users
    WHERE workspace_id = workspaces.id AND user_id != OLD.id
    ORDER BY created_at
    LIMIT 1
  )
  WHERE owner_id = OLD.id;
  
  DELETE FROM public.workspaces
  WHERE owner_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_deleted
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_id ON public.workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id ON public.workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_workspace_id ON public.courses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON public.progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_workshops_workspace_id ON public.workshops(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workshops_instructor_id ON public.workshops(instructor_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON public.workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_id ON public.workshop_registrations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON public.quiz_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_results_user_id ON public.user_quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_results_quiz_id ON public.user_quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON public.messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

