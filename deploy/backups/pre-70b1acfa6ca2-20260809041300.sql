--
-- PostgreSQL database dump
--

\restrict lhhCrAmbzjXulCOWnJ3KUGFkuVjiphLOQ3Jc7Gxz4BUscb9g3q45iAfoql1gaeM

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: iron_ledger
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO iron_ledger;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: iron_ledger
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO iron_ledger;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: iron_ledger
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO iron_ledger;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: iron_ledger
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: body_metrics; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.body_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    weight_kg double precision,
    measurements text,
    photo_path text
);


ALTER TABLE public.body_metrics OWNER TO iron_ledger;

--
-- Name: cardio_sessions; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.cardio_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    time_of_day text,
    distance_km double precision,
    duration_sec integer,
    avg_pace_sec_km double precision,
    program_id uuid,
    notes text
);


ALTER TABLE public.cardio_sessions OWNER TO iron_ledger;

--
-- Name: exercises; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    equipment text NOT NULL,
    tracking_type text DEFAULT 'reps'::text NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    user_id uuid,
    default_rest_sec integer DEFAULT 90 NOT NULL
);


ALTER TABLE public.exercises OWNER TO iron_ledger;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    age integer,
    height_cm double precision,
    starting_weight_kg double precision,
    goal text,
    experience_level text,
    dumbbell_min_kg double precision,
    dumbbell_max_kg double precision,
    dumbbell_step_kg double precision DEFAULT 2.5,
    barbell_weight_kg double precision,
    available_plates_kg text,
    ez_bar_weight_kg double precision,
    band_min_kg double precision,
    band_max_kg double precision,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profiles OWNER TO iron_ledger;

--
-- Name: program_days; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.program_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    day_index integer NOT NULL,
    title text,
    type text NOT NULL,
    completed_at timestamp with time zone
);


ALTER TABLE public.program_days OWNER TO iron_ledger;

--
-- Name: program_exercises; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.program_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_id uuid NOT NULL,
    exercise_id uuid,
    free_text text,
    sets integer,
    reps text,
    duration_sec integer,
    rounds integer,
    rest_sec integer,
    order_index integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.program_exercises OWNER TO iron_ledger;

--
-- Name: programs; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    source text NOT NULL,
    source_pdf_name text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    archived boolean DEFAULT false NOT NULL
);


ALTER TABLE public.programs OWNER TO iron_ledger;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO iron_ledger;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    theme_preset text DEFAULT 'graphite-rust'::text NOT NULL,
    auto_rotate_theme boolean DEFAULT false NOT NULL,
    units text DEFAULT 'metric'::text NOT NULL,
    rest_timer_default_sec integer DEFAULT 90 NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL
);


ALTER TABLE public.user_settings OWNER TO iron_ledger;

--
-- Name: users; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO iron_ledger;

--
-- Name: workout_sessions; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.workout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    mode text NOT NULL,
    workout_type text,
    time_of_day text,
    program_id uuid,
    program_day_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


ALTER TABLE public.workout_sessions OWNER TO iron_ledger;

--
-- Name: workout_sets; Type: TABLE; Schema: public; Owner: iron_ledger
--

CREATE TABLE public.workout_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    set_number integer NOT NULL,
    reps integer,
    duration_sec integer,
    weight_kg double precision,
    rpe double precision,
    is_warmup boolean DEFAULT false NOT NULL,
    rest_sec integer,
    rest_taken_sec integer,
    completed_at timestamp with time zone
);


ALTER TABLE public.workout_sets OWNER TO iron_ledger;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: iron_ledger
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: iron_ledger
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	d06273467628ccb0085e2cafa06ccf3ed06750cf83827ab1dc60de384d4a2885	1785320930810
2	baseline	1785320930810
\.


--
-- Data for Name: body_metrics; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.body_metrics (id, user_id, date, weight_kg, measurements, photo_path) FROM stdin;
\.


--
-- Data for Name: cardio_sessions; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.cardio_sessions (id, user_id, date, type, time_of_day, distance_km, duration_sec, avg_pace_sec_km, program_id, notes) FROM stdin;
\.


--
-- Data for Name: exercises; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.exercises (id, name, category, equipment, tracking_type, is_custom, user_id, default_rest_sec) FROM stdin;
852ceb08-7a10-40f8-8478-f1bfd5673437	Dumbbell Bench Press	push	dumbbell	reps	f	\N	90
0b039e58-a9b3-4c59-aba2-9f03aa7e4fef	Dumbbell Incline Press	push	dumbbell	reps	f	\N	90
6f9344e1-b432-4262-8809-9e7e9bf1c773	Dumbbell Shoulder Press	push	dumbbell	reps	f	\N	90
74401ede-a79f-40e2-90a7-ec51cadbf0c3	Dumbbell Lateral Raise	push	dumbbell	reps	f	\N	60
6151c394-e7ed-4749-93d6-97698fecb839	Dumbbell Front Raise	push	dumbbell	reps	f	\N	60
3f1585fe-b7a7-41b8-9dff-d5a0f1609f12	Dumbbell Tricep Extension	push	dumbbell	reps	f	\N	60
8ef6559c-8e67-44aa-b1ce-aad9e6bfbcf8	Dumbbell Floor Press	push	dumbbell	reps	f	\N	90
5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	Dumbbell Row	pull	dumbbell	reps	f	\N	90
895407b2-6f54-4734-9631-c0aa064469c8	Dumbbell Rear Delt Fly	pull	dumbbell	reps	f	\N	60
2b13b6fa-1483-44da-b4be-cdeafa1f1992	Dumbbell Bicep Curl	pull	dumbbell	reps	f	\N	60
447d2c4c-55eb-4702-a27d-97e34ff7435a	Dumbbell Hammer Curl	pull	dumbbell	reps	f	\N	60
e7344cc2-abad-48e1-9578-1608229042d0	Dumbbell Shrug	pull	dumbbell	reps	f	\N	60
1664c4ee-df4d-4252-9eec-6ccb3552c83a	Dumbbell Goblet Squat	legs	dumbbell	reps	f	\N	90
08ee3f24-c349-4ef4-87d5-4b460fa685cc	Dumbbell Romanian Deadlift	legs	dumbbell	reps	f	\N	90
0490f019-7017-45ba-90a1-ac0e06a5159f	Dumbbell Lunge	legs	dumbbell	reps	f	\N	90
6aed4e41-da06-4503-bbb2-186ffae42e6e	Dumbbell Bulgarian Split Squat	legs	dumbbell	reps	f	\N	90
f6578181-60ba-4bc4-aa1c-f77be2c57542	Dumbbell Step-Up	legs	dumbbell	reps	f	\N	90
f80f0b73-b0eb-4ffd-9586-a341cdd94ccf	Dumbbell Calf Raise	legs	dumbbell	reps	f	\N	60
72ba4fdf-5770-4612-8508-5c9fd494ce7d	Barbell Back Squat	legs	barbell	reps	f	\N	150
8b0cd41b-0660-4ace-a3d4-9aba0561f3b6	Barbell Deadlift	legs	barbell	reps	f	\N	180
8ac68bc4-bc5e-4028-8722-a3a98b80956d	Barbell Bench Press	push	barbell	reps	f	\N	150
0ac6682f-4c44-48e1-9363-cb38407eb070	Barbell Overhead Press	push	barbell	reps	f	\N	120
a8c64815-f8b0-4e7c-b3f8-232b84183a7c	Barbell Row	pull	barbell	reps	f	\N	120
b107e4db-caf5-401c-932d-200d3308b9de	Barbell Romanian Deadlift	legs	barbell	reps	f	\N	150
8ed5bf56-e305-42e9-9494-8ba25f94b9be	Barbell Front Squat	legs	barbell	reps	f	\N	150
d1169fd7-ce80-45cc-8d7b-d821c18f84a2	Barbell Hip Thrust	legs	barbell	reps	f	\N	120
17f8d0e4-3b32-4591-9c58-582890a383c3	EZ Bar Bicep Curl	pull	ez_bar	reps	f	\N	75
dd753060-41b3-41d6-80f5-1618630871b7	EZ Bar Skull Crusher	push	ez_bar	reps	f	\N	75
658dbda5-8cee-4e11-9e10-b1c5ab30a573	EZ Bar Preacher Curl	pull	ez_bar	reps	f	\N	75
fc40ccc4-d150-4647-9e9f-cc42f4f1abd8	EZ Bar Upright Row	pull	ez_bar	reps	f	\N	75
341ec423-8927-4d37-8b7a-82254adddb8c	EZ Bar Reverse Curl	pull	ez_bar	reps	f	\N	60
f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	Band Pull-Apart	pull	band	reps	f	\N	45
7430b937-8ced-4d7b-8c1d-89e196e1fe4c	Band Face Pull	pull	band	reps	f	\N	45
8f81affc-d783-44a8-9466-15dafb70ed2f	Band Assisted Pull-Up	pull	band	reps	f	\N	90
01766f68-59c4-45cf-8070-422bf87cf420	Band Squat	legs	band	reps	f	\N	60
0c35f199-467c-47f6-a0b5-e1d3249576a7	Band Row	pull	band	reps	f	\N	60
bf793c65-ae93-4097-9149-1e74cb40308a	Band Tricep Pushdown	push	band	reps	f	\N	45
6ed84507-4619-457b-a616-8ac667726f10	Band Lateral Walk	legs	band	reps	f	\N	45
7122732a-dd40-434d-ad9f-2a078d27d20c	Push-Up	push	bodyweight	reps	f	\N	45
82a3f251-52c1-4c75-8b76-5cd70974b752	Pull-Up	pull	bodyweight	reps	f	\N	90
2e636faf-6afe-4641-b07b-45b4f5cb2141	Bodyweight Squat	legs	bodyweight	reps	f	\N	30
a20f92f9-2861-46f0-8ab6-35ba53d2e44b	Plank	core	bodyweight	duration	f	\N	30
644b6497-357d-4a28-abeb-8e1d97951ac1	Side Plank	core	bodyweight	duration	f	\N	30
f4924ca0-048f-4565-81e0-99a640b2e116	Lunges	legs	bodyweight	reps	f	\N	30
90372cff-e606-4c72-9f24-82ddacee7c17	Sit-Ups	core	bodyweight	reps	f	\N	30
dd2f0c1a-3a31-4b1c-969a-6d0d91f0233c	Bicycle Crunches	core	bodyweight	reps	f	\N	30
0cd5c742-3d36-456a-badc-3ba87c460270	Superman	core	bodyweight	reps	f	\N	30
1126f107-56e1-4087-ac4b-3145ee849380	Jumping Jacks	cardio	bodyweight	reps	f	\N	20
47728d2c-aa43-4b94-b843-c5f09b56936a	High Knees	cardio	bodyweight	reps	f	\N	20
945d25e1-627d-48f2-9fb0-c97ee251dfbc	Burpees	cardio	bodyweight	reps	f	\N	45
7ad707fd-6b68-4d50-9215-94405b55a1ba	Mountain Climbers	cardio	bodyweight	reps	f	\N	30
42f009d2-a239-422f-815e-0599966a113f	Handstand Hold	skill	bodyweight	duration	f	\N	60
e64a2f2e-568d-4899-8639-93ba7cf20c8f	Wall Handstand Hold	skill	bodyweight	duration	f	\N	60
5538005c-5f1a-4377-8396-2bbb7aee370a	L-Sit Hold	skill	bodyweight	duration	f	\N	60
9615709c-9c7e-4c2e-9e08-b4cb78e78311	Bridge Hold	skill	bodyweight	duration	f	\N	45
153f9f36-d506-4eb0-820e-de2d328cccb1	Crow Pose Hold	skill	bodyweight	duration	f	\N	45
85c8a032-12b8-4377-ae19-1873bf6ea573	Single-Leg Balance	skill	bodyweight	duration	f	\N	30
712ecb9d-7d5b-49d9-8d96-185c439928a0	Pistol Squat Practice	skill	bodyweight	reps	f	\N	60
50ab1b04-a534-43ec-8c29-0cd00e67dafe	Outdoor Run	cardio	cardio	reps	f	\N	90
ca7a6681-e355-4263-a7fc-18aacdcc8b16	Cycling	cardio	cardio	reps	f	\N	90
5500b72a-33b1-41c4-930b-3330e3daa8d8	Jump Rope	cardio	bodyweight	duration	f	\N	30
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.profiles (id, user_id, display_name, age, height_cm, starting_weight_kg, goal, experience_level, dumbbell_min_kg, dumbbell_max_kg, dumbbell_step_kg, barbell_weight_kg, available_plates_kg, ez_bar_weight_kg, band_min_kg, band_max_kg, updated_at) FROM stdin;
dba573b8-f0c4-4fa2-b486-e51c0429a756	1e7fe9c9-d676-4b88-866a-8b89945ce42d	Ninjapika	19	175	98	general_fitness	intermediate	0	0	2.5	0	\N	0	40	60	2026-07-29 22:48:39.110185+00
\.


--
-- Data for Name: program_days; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.program_days (id, program_id, day_index, title, type, completed_at) FROM stdin;
4e0b5b8c-176e-48ad-8d37-597635bb49e5	69657f4c-ad5c-40c2-b9c1-8cc7caf8d0b7	1	Day 1	strength	\N
\.


--
-- Data for Name: program_exercises; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.program_exercises (id, day_id, exercise_id, free_text, sets, reps, duration_sec, rounds, rest_sec, order_index) FROM stdin;
\.


--
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.programs (id, user_id, name, source, source_pdf_name, description, created_at, archived) FROM stdin;
69657f4c-ad5c-40c2-b9c1-8cc7caf8d0b7	1e7fe9c9-d676-4b88-866a-8b89945ce42d	oyoyo	custom	\N		2026-08-08 09:27:52.431002+00	f
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.sessions (id, user_id, token_hash, expires_at, created_at) FROM stdin;
df6f26eb-29e8-4df3-9d75-7f872f19fbaa	1e7fe9c9-d676-4b88-866a-8b89945ce42d	013ed546a45ebbe51896a0597f306f13dc535ab88a3f10b59beed17c28df755d	2026-08-28 22:48:39.132+00	2026-07-29 22:48:39.133222+00
4b123f5c-87c4-4fbd-b199-95658490231f	1e7fe9c9-d676-4b88-866a-8b89945ce42d	99f558c5c00ecf6d176a16c6d5fc64d66bb101d2124e64c993c937782beef62b	2026-08-28 22:58:03.93+00	2026-07-29 22:58:03.931102+00
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.user_settings (id, user_id, theme_preset, auto_rotate_theme, units, rest_timer_default_sec, timezone) FROM stdin;
1fa35718-7edb-4b4e-82b8-040be2ad5dca	1e7fe9c9-d676-4b88-866a-8b89945ce42d	gotham-watch	f	metric	90	Asia/Calcutta
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.users (id, email, password_hash, created_at) FROM stdin;
1e7fe9c9-d676-4b88-866a-8b89945ce42d	deveshkrishn@gmail.com	$2b$12$s29oYwIqIyj8BA0iqi97Gu9REQrjINc7OcMAvQwfdK5UEhNZWrw/u	2026-07-29 22:48:39.110185+00
\.


--
-- Data for Name: workout_sessions; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.workout_sessions (id, user_id, date, mode, workout_type, time_of_day, program_id, program_day_id, notes, created_at, finished_at) FROM stdin;
f44632a7-c420-4c9c-bac5-f63f037867a4	1e7fe9c9-d676-4b88-866a-8b89945ce42d	2026-07-31 12:45:44.634593+00	live	strength	afternoon	\N	\N	\N	2026-07-31 12:45:44.634593+00	2026-07-31 13:36:09.61+00
1176657c-f2d1-453a-bb6b-c03bd76ef2a5	1e7fe9c9-d676-4b88-866a-8b89945ce42d	2026-08-04 12:34:28.730362+00	live	strength	afternoon	\N	\N	\N	2026-08-04 12:34:28.730362+00	2026-08-04 13:13:36.521+00
bf88664b-81f0-49ff-9fde-96e11590379f	1e7fe9c9-d676-4b88-866a-8b89945ce42d	2026-08-07 12:51:56.010171+00	live	strength	afternoon	\N	\N	\N	2026-08-07 12:51:56.010171+00	2026-08-07 13:37:45.068+00
\.


--
-- Data for Name: workout_sets; Type: TABLE DATA; Schema: public; Owner: iron_ledger
--

COPY public.workout_sets (id, session_id, exercise_id, set_number, reps, duration_sec, weight_kg, rpe, is_warmup, rest_sec, rest_taken_sec, completed_at) FROM stdin;
5ef70d5c-b7a6-4c9c-9042-953000754298	f44632a7-c420-4c9c-bac5-f63f037867a4	1664c4ee-df4d-4252-9eec-6ccb3552c83a	3	6	\N	4	\N	f	90	90	2026-07-31 12:52:33.863+00
4affe7c2-52f8-4b4c-8721-f7b63193bd06	f44632a7-c420-4c9c-bac5-f63f037867a4	08ee3f24-c349-4ef4-87d5-4b460fa685cc	1	10	\N	4	\N	f	90	90	2026-07-31 12:56:35.786+00
d495e953-3402-461d-9a39-7d07f036550c	f44632a7-c420-4c9c-bac5-f63f037867a4	08ee3f24-c349-4ef4-87d5-4b460fa685cc	2	8	\N	4	\N	f	90	42	2026-07-31 12:59:10.318+00
29f09b0f-dc65-4eac-b05f-682841b649b8	f44632a7-c420-4c9c-bac5-f63f037867a4	08ee3f24-c349-4ef4-87d5-4b460fa685cc	3	6	\N	4	\N	f	90	60	2026-07-31 13:01:36.502+00
93cc1994-3564-45f5-9133-4afbaa66dccf	f44632a7-c420-4c9c-bac5-f63f037867a4	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	2	10	\N	4	\N	f	90	81	2026-07-31 13:07:49.36+00
0cdcfea3-eca8-482a-8a63-cbc5c33799d0	f44632a7-c420-4c9c-bac5-f63f037867a4	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	3	8	\N	4	\N	f	90	90	2026-07-31 13:10:52.225+00
94da6fc1-e383-43f9-966b-40d5ee3c3540	f44632a7-c420-4c9c-bac5-f63f037867a4	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	1	8	\N	40	\N	f	45	120	2026-07-31 13:16:14.305+00
76a551f8-1c37-4b7c-9e04-0b1a23bedc72	f44632a7-c420-4c9c-bac5-f63f037867a4	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	2	6	\N	40	\N	f	45	29	2026-07-31 13:17:54.618+00
efd7311b-91a4-4925-a420-b7af79ef2e07	f44632a7-c420-4c9c-bac5-f63f037867a4	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	3	6	\N	40	\N	f	45	45	2026-07-31 13:20:12.603+00
8a6cf626-e446-4d80-a8a5-98be8cd7828c	f44632a7-c420-4c9c-bac5-f63f037867a4	2b13b6fa-1483-44da-b4be-cdeafa1f1992	1	12	\N	4	\N	f	60	45	2026-07-31 13:23:41.228+00
c22b730b-1468-4467-9b50-28e8e044e36a	f44632a7-c420-4c9c-bac5-f63f037867a4	2b13b6fa-1483-44da-b4be-cdeafa1f1992	2	10	\N	4	\N	f	60	60	2026-07-31 13:26:55.939+00
7b47b678-3c77-4536-8990-7e61012c1b7a	f44632a7-c420-4c9c-bac5-f63f037867a4	2b13b6fa-1483-44da-b4be-cdeafa1f1992	3	8	\N	4	\N	f	60	60	2026-07-31 13:29:28.743+00
ceaa11e8-43be-4ca5-924d-abe4392c17d6	f44632a7-c420-4c9c-bac5-f63f037867a4	a20f92f9-2861-46f0-8ab6-35ba53d2e44b	1	\N	30	\N	\N	f	30	60	2026-07-31 13:31:17.813+00
dbc19695-dcf6-4b9e-982d-7be58f6377e4	f44632a7-c420-4c9c-bac5-f63f037867a4	a20f92f9-2861-46f0-8ab6-35ba53d2e44b	2	\N	25	\N	\N	f	30	30	2026-07-31 13:32:17.316+00
0dd32730-6dc7-45ce-b30b-28e46dd8bb01	f44632a7-c420-4c9c-bac5-f63f037867a4	1664c4ee-df4d-4252-9eec-6ccb3552c83a	1	10	\N	4	\N	f	90	0	2026-07-31 12:48:14.444+00
8c99a53b-0612-420e-91eb-fb1e9278df90	f44632a7-c420-4c9c-bac5-f63f037867a4	1664c4ee-df4d-4252-9eec-6ccb3552c83a	2	8	\N	4	\N	f	90	58	2026-07-31 12:50:36.282+00
9912cbd5-7fac-4148-8d57-730998203cab	f44632a7-c420-4c9c-bac5-f63f037867a4	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	1	12	\N	4	\N	f	90	72	2026-07-31 13:04:54.813+00
a3171103-d45d-4e9a-9103-1bdd4bdc186f	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	1664c4ee-df4d-4252-9eec-6ccb3552c83a	1	10	\N	4	\N	f	90	0	2026-08-04 12:36:52.326+00
09dc773b-0701-49a7-8e5a-140a09c9365e	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	1664c4ee-df4d-4252-9eec-6ccb3552c83a	2	8	\N	4	\N	f	90	52	2026-08-04 12:38:56.204+00
e203ee4e-4a0f-4b78-b24d-62c4fa3c7bcf	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	1664c4ee-df4d-4252-9eec-6ccb3552c83a	3	6	\N	4	\N	f	90	51	2026-08-04 12:40:40.897+00
6324d72a-c3d1-481b-b336-fa3596859d43	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	08ee3f24-c349-4ef4-87d5-4b460fa685cc	1	12	\N	4	\N	f	90	91	2026-08-04 12:44:19.681+00
58901719-0975-463f-8c9c-d1e425b79064	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	08ee3f24-c349-4ef4-87d5-4b460fa685cc	2	10	\N	4	\N	f	90	61	2026-08-04 12:47:13.923+00
6cb69444-9127-4901-82dd-417d302804d4	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	08ee3f24-c349-4ef4-87d5-4b460fa685cc	3	8	\N	4	\N	f	90	61	2026-08-04 12:49:44.717+00
40706499-b426-4845-a762-1a8806a01a27	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	1	12	\N	4	\N	f	90	90	2026-08-04 12:52:59.07+00
c769672d-2fcb-4c2d-ac0c-755410b443ca	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	2	10	\N	4	\N	f	90	74	2026-08-04 12:55:20.51+00
f907d7ae-0651-4428-a2fb-19c01806be2a	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	3	8	\N	4	\N	f	90	90	2026-08-04 12:58:03.599+00
1ea6f89e-f0b4-4cb2-b702-8f5e6b9224be	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	1	10	\N	40	\N	f	45	90	2026-08-04 13:01:45.531+00
cc073568-4171-4ce5-bb48-e277d1e860c4	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	2	8	\N	40	\N	f	45	75	2026-08-04 13:04:02.167+00
9f29a75b-ab4b-466e-9430-b47fc8a0d8a6	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	3	6	\N	40	\N	f	45	45	2026-08-04 13:05:33.591+00
54f6df36-cbc4-4a79-95bc-1276769e5ea2	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	2b13b6fa-1483-44da-b4be-cdeafa1f1992	1	12	\N	4	\N	f	60	60	2026-08-04 13:07:48.397+00
8249ec6a-fcda-4feb-91f1-95a1bbc4d7d3	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	2b13b6fa-1483-44da-b4be-cdeafa1f1992	2	12	\N	4	\N	f	60	60	2026-08-04 13:10:10.461+00
d2a33df7-84eb-4868-81aa-4e8160a3ad59	1176657c-f2d1-453a-bb6b-c03bd76ef2a5	2b13b6fa-1483-44da-b4be-cdeafa1f1992	3	12	\N	4	\N	f	60	60	2026-08-04 13:12:31.79+00
a48efd8a-e2f6-43ef-aee3-271094b0c294	bf88664b-81f0-49ff-9fde-96e11590379f	1664c4ee-df4d-4252-9eec-6ccb3552c83a	1	12	\N	4	\N	f	90	0	2026-08-07 12:54:07.309+00
8fff5ef8-5b4b-4d38-a1ab-728cc6ae67ed	bf88664b-81f0-49ff-9fde-96e11590379f	1664c4ee-df4d-4252-9eec-6ccb3552c83a	2	10	\N	4	\N	f	90	35	2026-08-07 12:56:15.087+00
9510b47d-405a-4640-a90a-09a6df5cac40	bf88664b-81f0-49ff-9fde-96e11590379f	1664c4ee-df4d-4252-9eec-6ccb3552c83a	3	8	\N	4	\N	f	90	90	2026-08-07 12:58:50.622+00
0cfbeb3e-f1a7-4a12-a63e-d87915a2c4e0	bf88664b-81f0-49ff-9fde-96e11590379f	08ee3f24-c349-4ef4-87d5-4b460fa685cc	1	12	\N	4	\N	f	90	90	2026-08-07 13:02:47.383+00
2bf6490a-1821-418d-92a9-7294872d0123	bf88664b-81f0-49ff-9fde-96e11590379f	08ee3f24-c349-4ef4-87d5-4b460fa685cc	2	12	\N	4	\N	f	90	36	2026-08-07 13:05:35.446+00
9c76476b-3077-48be-bcf5-5a16b7cf9376	bf88664b-81f0-49ff-9fde-96e11590379f	08ee3f24-c349-4ef4-87d5-4b460fa685cc	3	12	\N	4	\N	f	90	90	2026-08-07 13:09:25.937+00
f168a358-88c4-4729-adc7-510fc39021ec	bf88664b-81f0-49ff-9fde-96e11590379f	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	1	12	\N	6	\N	f	90	367	2026-08-07 13:16:57.417+00
6cf2f575-46a7-479f-b9c6-750860d7025c	bf88664b-81f0-49ff-9fde-96e11590379f	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	2	10	\N	6	\N	f	90	41	2026-08-07 13:18:40.993+00
22044e0e-9627-4257-ad90-3083d261be0e	bf88664b-81f0-49ff-9fde-96e11590379f	5d07bea3-ed39-4314-a9d1-42a86c0a4d1e	3	8	\N	6	\N	f	90	90	2026-08-07 13:21:10.004+00
50024d4e-e906-4707-b047-8bafd6710d34	bf88664b-81f0-49ff-9fde-96e11590379f	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	1	10	\N	40	\N	f	45	90	2026-08-07 13:24:38.948+00
c067db08-b6c8-4eef-b770-e2cab96b846f	bf88664b-81f0-49ff-9fde-96e11590379f	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	2	8	\N	40	\N	f	45	45	2026-08-07 13:26:38.515+00
cc2b0603-8d5c-4fa4-b249-89974a4ca524	bf88664b-81f0-49ff-9fde-96e11590379f	f43049ff-fb60-4f24-b1d5-6c9cb1e4cd70	3	6	\N	40	\N	f	45	75	2026-08-07 13:28:55.055+00
2789bd15-6053-4a9f-991e-8196ebae430c	bf88664b-81f0-49ff-9fde-96e11590379f	2b13b6fa-1483-44da-b4be-cdeafa1f1992	1	10	\N	6	\N	f	60	150	2026-08-07 13:33:04.966+00
3a138895-e5aa-41d1-a8b0-c42e008e7a8c	bf88664b-81f0-49ff-9fde-96e11590379f	2b13b6fa-1483-44da-b4be-cdeafa1f1992	2	8	\N	6	\N	f	60	60	2026-08-07 13:35:20.636+00
0edf4db5-61af-44ef-8da3-e955d604fc66	bf88664b-81f0-49ff-9fde-96e11590379f	2b13b6fa-1483-44da-b4be-cdeafa1f1992	3	6	\N	6	\N	f	60	60	2026-08-07 13:37:30.493+00
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: iron_ledger
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 2, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: iron_ledger
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: body_metrics body_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.body_metrics
    ADD CONSTRAINT body_metrics_pkey PRIMARY KEY (id);


--
-- Name: cardio_sessions cardio_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.cardio_sessions
    ADD CONSTRAINT cardio_sessions_pkey PRIMARY KEY (id);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


--
-- Name: program_days program_days_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.program_days
    ADD CONSTRAINT program_days_pkey PRIMARY KEY (id);


--
-- Name: program_exercises program_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.program_exercises
    ADD CONSTRAINT program_exercises_pkey PRIMARY KEY (id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workout_sessions workout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT workout_sessions_pkey PRIMARY KEY (id);


--
-- Name: workout_sets workout_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sets
    ADD CONSTRAINT workout_sets_pkey PRIMARY KEY (id);


--
-- Name: body_metrics_user_date_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX body_metrics_user_date_idx ON public.body_metrics USING btree (user_id, date);


--
-- Name: cardio_sessions_user_date_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX cardio_sessions_user_date_idx ON public.cardio_sessions USING btree (user_id, date);


--
-- Name: exercises_user_id_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX exercises_user_id_idx ON public.exercises USING btree (user_id);


--
-- Name: program_days_program_id_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX program_days_program_id_idx ON public.program_days USING btree (program_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: workout_sessions_user_date_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX workout_sessions_user_date_idx ON public.workout_sessions USING btree (user_id, date);


--
-- Name: workout_sets_exercise_id_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX workout_sets_exercise_id_idx ON public.workout_sets USING btree (exercise_id);


--
-- Name: workout_sets_session_id_idx; Type: INDEX; Schema: public; Owner: iron_ledger
--

CREATE INDEX workout_sets_session_id_idx ON public.workout_sets USING btree (session_id);


--
-- Name: body_metrics body_metrics_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.body_metrics
    ADD CONSTRAINT body_metrics_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cardio_sessions cardio_sessions_program_id_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.cardio_sessions
    ADD CONSTRAINT cardio_sessions_program_id_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.programs(id);


--
-- Name: cardio_sessions cardio_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.cardio_sessions
    ADD CONSTRAINT cardio_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exercises exercises_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: program_days program_days_program_id_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.program_days
    ADD CONSTRAINT program_days_program_id_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: program_exercises program_exercises_day_id_program_days_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.program_exercises
    ADD CONSTRAINT program_exercises_day_id_program_days_id_fk FOREIGN KEY (day_id) REFERENCES public.program_days(id) ON DELETE CASCADE;


--
-- Name: program_exercises program_exercises_exercise_id_exercises_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.program_exercises
    ADD CONSTRAINT program_exercises_exercise_id_exercises_id_fk FOREIGN KEY (exercise_id) REFERENCES public.exercises(id);


--
-- Name: programs programs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workout_sessions workout_sessions_program_day_id_program_days_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT workout_sessions_program_day_id_program_days_id_fk FOREIGN KEY (program_day_id) REFERENCES public.program_days(id);


--
-- Name: workout_sessions workout_sessions_program_id_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT workout_sessions_program_id_programs_id_fk FOREIGN KEY (program_id) REFERENCES public.programs(id);


--
-- Name: workout_sessions workout_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT workout_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workout_sets workout_sets_exercise_id_exercises_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sets
    ADD CONSTRAINT workout_sets_exercise_id_exercises_id_fk FOREIGN KEY (exercise_id) REFERENCES public.exercises(id);


--
-- Name: workout_sets workout_sets_session_id_workout_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: iron_ledger
--

ALTER TABLE ONLY public.workout_sets
    ADD CONSTRAINT workout_sets_session_id_workout_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lhhCrAmbzjXulCOWnJ3KUGFkuVjiphLOQ3Jc7Gxz4BUscb9g3q45iAfoql1gaeM

