CREATE TABLE "body_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"weight_kg" double precision,
	"measurements" text,
	"photo_path" text
);
--> statement-breakpoint
CREATE TABLE "cardio_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"time_of_day" text,
	"distance_km" double precision,
	"duration_sec" integer,
	"avg_pace_sec_km" double precision,
	"program_id" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"equipment" text NOT NULL,
	"tracking_type" text DEFAULT 'reps' NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"default_rest_sec" integer DEFAULT 90 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"age" integer,
	"height_cm" double precision,
	"starting_weight_kg" double precision,
	"goal" text,
	"experience_level" text,
	"dumbbell_min_kg" double precision,
	"dumbbell_max_kg" double precision,
	"dumbbell_step_kg" double precision DEFAULT 2.5,
	"barbell_weight_kg" double precision,
	"available_plates_kg" text,
	"ez_bar_weight_kg" double precision,
	"band_min_kg" double precision,
	"band_max_kg" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "program_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"title" text,
	"type" text NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "program_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"exercise_id" uuid,
	"free_text" text,
	"sets" integer,
	"reps" text,
	"duration_sec" integer,
	"rounds" integer,
	"rest_sec" integer,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"source_pdf_name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme_preset" text DEFAULT 'graphite-rust' NOT NULL,
	"auto_rotate_theme" boolean DEFAULT false NOT NULL,
	"units" text DEFAULT 'metric' NOT NULL,
	"rest_timer_default_sec" integer DEFAULT 90 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" text NOT NULL,
	"workout_type" text,
	"time_of_day" text,
	"program_id" uuid,
	"program_day_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer,
	"duration_sec" integer,
	"weight_kg" double precision,
	"rpe" double precision,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"rest_sec" integer,
	"rest_taken_sec" integer,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardio_sessions" ADD CONSTRAINT "cardio_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardio_sessions" ADD CONSTRAINT "cardio_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_day_id_program_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."program_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_day_id_program_days_id_fk" FOREIGN KEY ("program_day_id") REFERENCES "public"."program_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_metrics_user_date_idx" ON "body_metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "cardio_sessions_user_date_idx" ON "cardio_sessions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "exercises_user_id_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "program_days_program_id_idx" ON "program_days" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_date_idx" ON "workout_sessions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_id_idx" ON "workout_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sets_session_id_idx" ON "workout_sets" USING btree ("session_id");