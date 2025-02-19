-- Create users table (extends Supabase's auth.users table)
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  is_instructor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create lessons table
CREATE TABLE lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create enrollments table
CREATE TABLE enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  course_id UUID REFERENCES courses(id) NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, course_id)
);

-- Create progress table
CREATE TABLE progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  lesson_id UUID REFERENCES lessons(id) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, lesson_id)
);

-- Create workshops table
CREATE TABLE workshops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workshop_registrations table
CREATE TABLE workshop_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  workshop_id UUID REFERENCES workshops(id) NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, workshop_id)
);

-- Create quizzes table
CREATE TABLE quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create quiz_questions table
CREATE TABLE quiz_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) NOT NULL,
  question TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create quiz_answers table
CREATE TABLE quiz_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES quiz_questions(id) NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_quiz_results table
CREATE TABLE user_quiz_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) NOT NULL,
  score INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, quiz_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;

-- Create policies for each table (these are basic policies and should be adjusted based on your specific requirements)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Instructors can insert courses" ON courses FOR INSERT WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update their own courses" ON courses FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Anyone can view lessons" ON lessons FOR SELECT USING (true);
CREATE POLICY "Instructors can insert lessons" ON lessons FOR INSERT WITH CHECK (auth.uid() = (SELECT instructor_id FROM courses WHERE id = lessons.course_id));
CREATE POLICY "Instructors can update their own lessons" ON lessons FOR UPDATE USING (auth.uid() = (SELECT instructor_id FROM courses WHERE id = lessons.course_id));

CREATE POLICY "Users can view their own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own progress" ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view workshops" ON workshops FOR SELECT USING (true);
CREATE POLICY "Instructors can insert workshops" ON workshops FOR INSERT WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update their own workshops" ON workshops FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Users can view their own workshop registrations" ON workshop_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register for workshops" ON workshop_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Instructors can insert quizzes" ON quizzes FOR INSERT WITH CHECK (auth.uid() = (SELECT instructor_id FROM courses WHERE id = (SELECT course_id FROM lessons WHERE id = quizzes.lesson_id)));
CREATE POLICY "Instructors can update their own quizzes" ON quizzes FOR UPDATE USING (auth.uid() = (SELECT instructor_id FROM courses WHERE id = (SELECT course_id FROM lessons WHERE id = quizzes.lesson_id)));

CREATE POLICY "Anyone can view quiz questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Instructors can insert quiz questions" ON quiz_questions FOR INSERT WITH CHECK (auth.uid() = (SELECT instructor_id FROM courses WHERE id = (SELECT course_id FROM lessons WHERE id = (SELECT lesson_id FROM quizzes WHERE id = quiz_questions.quiz_id))));
CREATE POLICY "Instructors can update their own quiz questions" ON quiz_questions FOR UPDATE USING (auth.uid() = (SELECT instructor_id FROM courses WHERE id = (SELECT course_id FROM lessons WHERE id = (SELECT lesson_id FROM quizzes WHERE id = quiz_questions.quiz_id))));

CREATE POLICY "Anyone can view quiz answers" ON quiz_answers FOR SELECT USING (true);
CREATE POLICY "Instructors can insert quiz answers" ON quiz_answers FOR INSERT WITH CHECK (auth.uid() = (SELECT instructor_id FROM courses WHERE id = (SELECT course_id FROM lessons WHERE id = (SELECT lesson_id FROM quizzes WHERE id = (SELECT quiz_id FROM quiz_questions WHERE id = quiz_answers.question_id)))));
CREATE POLICY "Instructors can update their own quiz answers" ON quiz_answers FOR UPDATE USING (auth.uid() = (SELECT instructor_id FROM courses WHERE id = (SELECT course_id FROM lessons WHERE id = (SELECT lesson_id FROM quizzes WHERE id = (SELECT quiz_id FROM quiz_questions WHERE id = quiz_answers.question_id)))));

CREATE POLICY "Users can view their own quiz results" ON user_quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quiz results" ON user_quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quiz results" ON user_quiz_results FOR UPDATE USING (auth.uid() = user_id);

