-- Create instructors table
CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  image TEXT NULL,
  bio TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT instructors_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create course_instructors junction table
CREATE TABLE IF NOT EXISTS public.course_instructors (
  course_id INTEGER NOT NULL,
  instructor_id UUID NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT course_instructors_pkey PRIMARY KEY (course_id, instructor_id),
  CONSTRAINT course_instructors_course_id_fkey FOREIGN KEY (course_id) 
    REFERENCES public.courses (id) ON DELETE CASCADE,
  CONSTRAINT course_instructors_instructor_id_fkey FOREIGN KEY (instructor_id) 
    REFERENCES public.instructors (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id 
  ON public.course_instructors USING btree (course_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor_id 
  ON public.course_instructors USING btree (instructor_id) TABLESPACE pg_default;

-- Create trigger to update updated_at for instructors
CREATE OR REPLACE FUNCTION update_instructors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instructors_updated_at
  BEFORE UPDATE ON public.instructors
  FOR EACH ROW
  EXECUTE FUNCTION update_instructors_updated_at();

-- Enable RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instructors table
-- Allow all authenticated users to read instructors
CREATE POLICY "Instructors are viewable by everyone"
  ON public.instructors FOR SELECT
  USING (true);

-- Only admins and instructors can insert/update/delete
CREATE POLICY "Only admins and instructors can manage instructors"
  ON public.instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
  );

-- RLS Policies for course_instructors table
-- Allow all authenticated users to read course instructors
CREATE POLICY "Course instructors are viewable by everyone"
  ON public.course_instructors FOR SELECT
  USING (true);

-- Only admins and instructors can manage course instructors
CREATE POLICY "Only admins and instructors can manage course instructors"
  ON public.course_instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'instructor')
    )
  );
