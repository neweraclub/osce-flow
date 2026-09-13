-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.faculties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  address text,
  phone_number character varying,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT faculties_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  faculty_id uuid,
  email USER-DEFINED NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'admin'::app_role_enum,
  is_active boolean NOT NULL DEFAULT true,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculties(id)
);
CREATE TABLE public.academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year_label character varying NOT NULL CHECK (year_label::text ~ '^[0-9]{4}-[0-9]{4}$'::text),
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  faculty_id uuid NOT NULL,
  CONSTRAINT academic_years_pkey PRIMARY KEY (id),
  CONSTRAINT academic_years_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculties(id)
);
CREATE TABLE public.study_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_name character varying NOT NULL CHECK (level_name::text = ANY (ARRAY['4th Year'::character varying, '5th Year'::character varying, '6th Year'::character varying]::text[])),
  academic_year_id uuid NOT NULL,
  CONSTRAINT study_levels_pkey PRIMARY KEY (id),
  CONSTRAINT study_levels_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id)
);
CREATE TABLE public.sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_name character varying NOT NULL,
  level_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT sections_pkey PRIMARY KEY (id),
  CONSTRAINT sections_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.study_levels(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_name character varying NOT NULL,
  section_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id)
);
CREATE TABLE public.professors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT professors_pkey PRIMARY KEY (id),
  CONSTRAINT professors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.students (
  matricule character varying NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  group_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  import_index integer NOT NULL DEFAULT 0,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_name character varying NOT NULL,
  level_id uuid NOT NULL,
  responsible_prof_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT modules_pkey PRIMARY KEY (id),
  CONSTRAINT modules_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.study_levels(id),
  CONSTRAINT modules_responsible_prof_id_fkey FOREIGN KEY (responsible_prof_id) REFERENCES public.professors(id)
);
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_type USER-DEFINED NOT NULL DEFAULT 'regular'::session_type_enum,
  exam_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  station_id uuid NOT NULL,
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id)
);
CREATE TABLE public.stations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  station_number integer NOT NULL CHECK (station_number >= 1),
  title character varying NOT NULL,
  access_pin character varying NOT NULL UNIQUE CHECK (length(access_pin::text) >= 4),
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  weightage_percentage numeric DEFAULT 0.00 CHECK (weightage_percentage >= 0.00 AND weightage_percentage <= 100.00),
  module_id uuid NOT NULL,
  CONSTRAINT stations_pkey PRIMARY KEY (id),
  CONSTRAINT stations_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_type USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  max_scale_value integer DEFAULT 10 CHECK (max_scale_value >= 1),
  exam_id uuid NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id)
);
CREATE TABLE public.exam_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  final_score numeric NOT NULL DEFAULT 0.00 CHECK (final_score >= 0.00),
  status USER-DEFINED NOT NULL DEFAULT 'passed'::attempt_status_enum,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  student_id uuid NOT NULL,
  CONSTRAINT exam_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT exam_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT fk_exam_attempts_student FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.student_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  station_id uuid NOT NULL,
  question_id uuid NOT NULL,
  evaluation_score numeric,
  points_awarded numeric NOT NULL DEFAULT 0.00 CHECK (points_awarded >= 0.00),
  graded_by_prof_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
  selected_options jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT student_answers_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ans_attempt FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id),
  CONSTRAINT fk_ans_station FOREIGN KEY (station_id) REFERENCES public.stations(id),
  CONSTRAINT fk_ans_question FOREIGN KEY (question_id) REFERENCES public.questions(id),
  CONSTRAINT fk_ans_prof FOREIGN KEY (graded_by_prof_id) REFERENCES public.professors(id)
);
CREATE TABLE public.station_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  points numeric NOT NULL CHECK (points < 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT station_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT station_criteria_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id)
);
CREATE TABLE public.candidate_penalties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_attempt_id uuid NOT NULL,
  points numeric NOT NULL CHECK (points < 0::numeric),
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT clock_timestamp(),
  CONSTRAINT candidate_penalties_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_penalties_attempt_fkey FOREIGN KEY (exam_attempt_id) REFERENCES public.exam_attempts(id)
);