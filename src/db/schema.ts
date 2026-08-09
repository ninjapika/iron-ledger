// Iron Ledger — database schema (Drizzle ORM)
//
// Design intent: every log table (sets, cardio sessions, body metrics)
// points back to a small set of catalog tables (exercises, programs) so the
// dashboard can join across strength + cardio + body history without
// duplicating "what is this exercise" or "what program is this" anywhere.

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Auth ----------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
  sessions: many(sessions),
  exercises: many(exercises),
  workoutSessions: many(workoutSessions),
  cardioSessions: many(cardioSessions),
  bodyMetrics: many(bodyMetrics),
  programs: many(programs),
  aiConversations: many(aiConversations),
}));

// Long-lived "remember me" sessions. Only a hash of the token is stored, so
// a stolen DB dump can't be replayed as a live cookie.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)]
);

// ---------- Profile & equipment ----------

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  displayName: text("display_name"),
  age: integer("age"),
  heightCm: doublePrecision("height_cm"),
  startingWeightKg: doublePrecision("starting_weight_kg"),
  goal: text("goal"), // strength | hypertrophy | endurance | general_fitness
  experienceLevel: text("experience_level"), // beginner | intermediate | advanced

  // Home-gym equipment — pre-populates weight pickers instead of guessing
  dumbbellMinKg: doublePrecision("dumbbell_min_kg"),
  dumbbellMaxKg: doublePrecision("dumbbell_max_kg"),
  dumbbellStepKg: doublePrecision("dumbbell_step_kg").default(2.5),
  barbellWeightKg: doublePrecision("barbell_weight_kg"),
  availablePlatesKg: text("available_plates_kg"), // JSON array e.g. "[1.25,2.5,5,10,15,20]"
  ezBarWeightKg: doublePrecision("ez_bar_weight_kg"),
  bandMinKg: doublePrecision("band_min_kg"),
  bandMaxKg: doublePrecision("band_max_kg"),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  themePreset: text("theme_preset").default("graphite-rust").notNull(),
  autoRotateTheme: boolean("auto_rotate_theme").default(false).notNull(),
  units: text("units").default("metric").notNull(),
  restTimerDefaultSec: integer("rest_timer_default_sec").default(90).notNull(),
  // IANA name, e.g. "Asia/Kolkata". Every "which calendar day is this" call
  // in the dashboard (heatmap, weekly volume, streaks) uses this — without
  // it, calendar-day bucketing silently depends on whatever timezone the
  // Node process happens to be running in, which differs between a
  // Windows dev machine and a UTC-default VPS and produces wrong results
  // on either. Auto-detected client-side and synced on first load.
  timezone: text("timezone").default("UTC").notNull(),
  // Encrypted OpenRouter API key — never stored in plaintext. Format is
  // "iv.authTag.ciphertext" (all base64), see lib/ai/encryption.ts for the
  // AES-256-GCM implementation. Only ever decrypted server-side, right
  // before an outbound call to OpenRouter — never sent back to the client.
  openrouterKeyEncrypted: text("openrouter_key_encrypted"),
  // A safe-to-display fragment (e.g. "sk-or-••••ab12") computed once at
  // save time, so the settings page never needs to decrypt the real key
  // just to render something on screen.
  openrouterKeyPreview: text("openrouter_key_preview"),
  // OpenRouter model slug, e.g. "z-ai/glm-5.2" — which model the AI
  // Assistant uses for this user. Null until they pick one.
  preferredAiModel: text("preferred_ai_model"),
});

// ---------- Exercise catalog ----------

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(), // push | pull | legs | core | full_body | cardio | skill
    equipment: text("equipment").notNull(), // dumbbell | barbell | ez_bar | band | bodyweight | cardio
    trackingType: text("tracking_type").default("reps").notNull(), // reps | duration
    isCustom: boolean("is_custom").default(false).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = shared catalog
    defaultRestSec: integer("default_rest_sec").default(90).notNull(),
  },
  (t) => [index("exercises_user_id_idx").on(t.userId)]
);

// ---------- Strength training ----------

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
    mode: text("mode").notNull(), // live | logged
    workoutType: text("workout_type"), // cardio | strength | skill | manual
    timeOfDay: text("time_of_day"), // morning | afternoon | evening | null (unspecified)
    programId: uuid("program_id").references(() => programs.id),
    programDayId: uuid("program_day_id").references(() => programDays.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("workout_sessions_user_date_idx").on(t.userId, t.date)]
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps"),
    durationSec: integer("duration_sec"), // for time-based exercises (planks, holds) instead of reps
    weightKg: doublePrecision("weight_kg"),
    rpe: doublePrecision("rpe"),
    isWarmup: boolean("is_warmup").default(false).notNull(),
    restSec: integer("rest_sec"), // planned/target rest
    restTakenSec: integer("rest_taken_sec"), // actual elapsed rest before this set — powers the live-mode time breakdown
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("workout_sets_exercise_id_idx").on(t.exerciseId),
    index("workout_sets_session_id_idx").on(t.sessionId),
  ]
);

// ---------- Cardio ----------

export const cardioSessions = pgTable(
  "cardio_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
    type: text("type").notNull(), // outdoor_run | treadmill | cycling — distance-based only; other cardio (jump rope, circuits) logs through workoutSessions with workoutType='cardio' instead
    timeOfDay: text("time_of_day"), // morning | afternoon | evening | null
    distanceKm: doublePrecision("distance_km"),
    durationSec: integer("duration_sec"),
    avgPaceSecKm: doublePrecision("avg_pace_sec_km"),
    programId: uuid("program_id").references(() => programs.id),
    notes: text("notes"),
  },
  (t) => [index("cardio_sessions_user_date_idx").on(t.userId, t.date)]
);

// ---------- Body metrics ----------

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
    weightKg: doublePrecision("weight_kg"),
    measurements: text("measurements"), // JSON: {arms,chest,waist,thighs,...} cm
    photoPath: text("photo_path"), // stored on-disk on the VPS only
  },
  (t) => [index("body_metrics_user_date_idx").on(t.userId, t.date)]
);

// ---------- Programs (self-curated; may also hold already-imported legacy programs) ----------

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  source: text("source").notNull(), // darebee | custom
  sourcePdfName: text("source_pdf_name"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export const programDays = pgTable(
  "program_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    title: text("title"),
    type: text("type").notNull(), // strength | cardio | skill | rest
    completedAt: timestamp("completed_at", { withTimezone: true }), // set when a linked session finishes; cleared by "reset progress"
  },
  (t) => [index("program_days_program_id_idx").on(t.programId)]
);

export const programExercises = pgTable("program_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: uuid("day_id").notNull().references(() => programDays.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").references(() => exercises.id),
  freeText: text("free_text"), // raw name from an already-imported legacy program, pre-matching
  sets: integer("sets"),
  reps: text("reps"), // "12" | "AMRAP" | "30s" — all valid
  durationSec: integer("duration_sec"),
  rounds: integer("rounds"),
  restSec: integer("rest_sec"),
  orderIndex: integer("order_index").default(0).notNull(),
});

// ---------- Relations (for db.query.* nested fetches) ----------

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  user: one(users, { fields: [exercises.userId], references: [users.id] }),
  sets: many(workoutSets),
  programExercises: many(programExercises),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one, many }) => ({
  user: one(users, { fields: [workoutSessions.userId], references: [users.id] }),
  program: one(programs, { fields: [workoutSessions.programId], references: [programs.id] }),
  sets: many(workoutSets),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  session: one(workoutSessions, { fields: [workoutSets.sessionId], references: [workoutSessions.id] }),
  exercise: one(exercises, { fields: [workoutSets.exerciseId], references: [exercises.id] }),
}));

export const cardioSessionsRelations = relations(cardioSessions, ({ one }) => ({
  user: one(users, { fields: [cardioSessions.userId], references: [users.id] }),
  program: one(programs, { fields: [cardioSessions.programId], references: [programs.id] }),
}));

export const bodyMetricsRelations = relations(bodyMetrics, ({ one }) => ({
  user: one(users, { fields: [bodyMetrics.userId], references: [users.id] }),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  user: one(users, { fields: [programs.userId], references: [users.id] }),
  days: many(programDays),
  workoutSessions: many(workoutSessions),
  cardioSessions: many(cardioSessions),
}));

export const programDaysRelations = relations(programDays, ({ one, many }) => ({
  program: one(programs, { fields: [programDays.programId], references: [programs.id] }),
  exercises: many(programExercises),
}));

export const programExercisesRelations = relations(programExercises, ({ one }) => ({
  day: one(programDays, { fields: [programExercises.dayId], references: [programDays.id] }),
  exercise: one(exercises, { fields: [programExercises.exerciseId], references: [exercises.id] }),
}));

// ---------- AI Assistant ----------
// Conversations and their messages live here, keyed to the user — never to
// whichever OpenRouter key was active when they were sent. That's what
// makes swapping the key later a non-event: nothing here needs migrating.
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"), // null until there's enough context to summarize one
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant | tool
    content: text("content"), // null for an assistant turn that's pure tool_calls
    toolCalls: jsonb("tool_calls"), // assistant-role only: [{id, name, arguments}]
    toolCallId: text("tool_call_id"), // tool-role only — which call this answers
    toolName: text("tool_name"), // tool-role only, so the UI can label it without a join
    reasoning: text("reasoning"), // assistant-role only — the model's thinking trace, when it returns one (see lib/ai/agent.ts)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_messages_conversation_idx").on(t.conversationId, t.createdAt)]
);

// A write tool the model wants to call (log a workout, create/edit a
// program) sits here, unexecuted, until the user approves it from the
// chat UI — see lib/ai/agent.ts. "summary" is written by the model itself
// as part of the tool call, not derived from the args afterward, so what's
// shown for approval is exactly what the model intended to do.
export const aiPendingActions = pgTable("ai_pending_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  toolCallId: text("tool_call_id").notNull(),
  toolName: text("tool_name").notNull(),
  toolArgs: jsonb("tool_args").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
  messages: many(aiMessages),
  pendingActions: many(aiPendingActions),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
}));

export const aiPendingActionsRelations = relations(aiPendingActions, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiPendingActions.conversationId], references: [aiConversations.id] }),
}));
