import "server-only";
import { eq, ilike, or, and, desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workoutSessions, workoutSets, cardioSessions } from "@/db/schema";
import { getPrograms, getProgramWithDays } from "@/lib/actions/programs";
import { getBodyMetricHistory } from "@/lib/actions/tracking";

/** Tool names that only read data — safe to execute the moment the model
 * asks for them, no user confirmation needed. Everything else is a write
 * and goes through the pending-action / approval flow in lib/ai/agent.ts. */
export const READ_TOOLS = new Set(["search_exercises", "get_recent_workouts", "get_current_programs", "get_body_metrics"]);

/** OpenAI-style function-calling schemas, sent to whichever model the user
 * picked — the same set regardless of model, which is what makes the
 * assistant "dedicated to this site" independent of model choice. */
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_exercises",
      description:
        "Search the exercise catalog by name. Always call this before log_workout or create_program/update_program to resolve a plain-English exercise name to a real exerciseId — never invent an id.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Partial exercise name, e.g. 'bench' or 'squat'." } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_workouts",
      description: "Get the user's recent strength and cardio workout history, most recent first.",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "How many days back to look. Defaults to 30." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_current_programs",
      description: "List the user's active (non-archived) programs, each with its full day-by-day exercise breakdown.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_body_metrics",
      description: "Get the user's recent body-metric entries (weight, measurements).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "How many recent entries to return. Defaults to 10." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_workout",
      description:
        "Propose logging a completed strength workout from a description of what the user did. Every exerciseId must come from a prior search_exercises call — never invent one. This does not apply immediately; the user reviews and confirms it first.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One plain-English sentence describing what will be logged, shown to the user for approval." },
          isoDateTime: { type: "string", description: "ISO 8601 datetime the workout happened, e.g. from 'today' or 'yesterday evening'." },
          workoutType: { type: "string", description: "strength | cardio | skill | manual" },
          notes: { type: "string" },
          sets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exerciseId: { type: "string" },
                reps: { type: "number" },
                weightKg: { type: "number" },
                durationSec: { type: "number" },
                rpe: { type: "number" },
                isWarmup: { type: "boolean" },
              },
              required: ["exerciseId"],
            },
          },
        },
        required: ["summary", "isoDateTime", "sets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_program",
      description:
        "Propose creating a new custom program. Every exerciseId must come from a prior search_exercises call. Does not apply immediately — the user reviews and confirms first.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One plain-English sentence describing the program, shown to the user for approval." },
          name: { type: "string" },
          description: { type: "string" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayIndex: { type: "number" },
                title: { type: "string" },
                type: { type: "string", description: "strength | cardio | skill | rest" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      exerciseId: { type: "string" },
                      sets: { type: "number" },
                      reps: { type: "string" },
                      durationSec: { type: "number" },
                      restSec: { type: "number" },
                    },
                    required: ["exerciseId"],
                  },
                },
              },
              required: ["dayIndex", "title", "type", "exercises"],
            },
          },
        },
        required: ["summary", "name", "days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_program",
      description:
        "Propose changes to an existing custom program (only ones with source 'custom' — check get_current_programs first). Submit the FULL replacement day list, not a diff: include every day that should still exist (with its 'id' from get_current_programs to preserve history, or omit 'id' for a new day) — any existing day left out is deleted. Does not apply immediately.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One plain-English sentence describing the change, shown to the user for approval." },
          programId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Omit for a new day; include to update an existing one in place." },
                dayIndex: { type: "number" },
                title: { type: "string" },
                type: { type: "string" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      exerciseId: { type: "string" },
                      sets: { type: "number" },
                      reps: { type: "string" },
                      durationSec: { type: "number" },
                      restSec: { type: "number" },
                    },
                    required: ["exerciseId"],
                  },
                },
              },
              required: ["dayIndex", "title", "type", "exercises"],
            },
          },
        },
        required: ["summary", "programId", "name", "days"],
      },
    },
  },
] as const;

export async function executeReadTool(userId: string, timezone: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_exercises": {
      const query = String(args.query ?? "");
      return db
        .select({ id: exercises.id, name: exercises.name, category: exercises.category, equipment: exercises.equipment, trackingType: exercises.trackingType })
        .from(exercises)
        .where(or(ilike(exercises.name, `%${query}%`), eq(exercises.userId, userId)))
        .limit(15);
    }
    case "get_recent_workouts": {
      const days = Number(args.days ?? 30);
      const cutoff = new Date(Date.now() - days * 86_400_000);

      const rows = await db
        .select({
          sessionId: workoutSessions.id,
          date: workoutSessions.date,
          workoutType: workoutSessions.workoutType,
          notes: workoutSessions.notes,
          exerciseName: exercises.name,
          reps: workoutSets.reps,
          weightKg: workoutSets.weightKg,
          durationSec: workoutSets.durationSec,
          isWarmup: workoutSets.isWarmup,
        })
        .from(workoutSessions)
        .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
        .leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
        .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, cutoff)))
        .orderBy(desc(workoutSessions.date));

      type RawSet = { reps: number | null; weightKg: number | null; durationSec: number | null; isWarmup: boolean };
      const sessionsMap = new Map<
        string,
        { date: Date; workoutType: string | null; notes: string | null; exercises: Map<string, RawSet[]> }
      >();

      for (const r of rows) {
        if (!sessionsMap.has(r.sessionId)) {
          sessionsMap.set(r.sessionId, { date: r.date, workoutType: r.workoutType, notes: r.notes, exercises: new Map() });
        }
        const session = sessionsMap.get(r.sessionId)!;
        if (r.exerciseName) {
          if (!session.exercises.has(r.exerciseName)) session.exercises.set(r.exerciseName, []);
          session.exercises.get(r.exerciseName)!.push({
            reps: r.reps,
            weightKg: r.weightKg,
            durationSec: r.durationSec,
            isWarmup: r.isWarmup ?? false,
          });
        }
      }

      const round1 = (n: number) => Math.round(n * 10) / 10;

      const strength = Array.from(sessionsMap.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((s) => {
          const exerciseSummaries = Array.from(s.exercises.entries()).map(([name, sets]) => {
            // Volume = sum of reps x weight across working (non-warmup) sets —
            // the standard training-load definition, computed here rather
            // than left for the model to add up so it can't get it wrong.
            const volumeKg = sets
              .filter((x) => !x.isWarmup)
              .reduce((sum, x) => sum + (x.weightKg && x.reps ? x.weightKg * x.reps : 0), 0);
            return {
              name,
              totalSets: sets.length,
              volumeKg: round1(volumeKg),
              sets: sets.map((x) => ({ reps: x.reps, weightKg: x.weightKg, durationSec: x.durationSec, warmup: x.isWarmup })),
            };
          });
          return {
            date: s.date.toISOString(),
            workoutType: s.workoutType,
            notes: s.notes,
            totalSets: exerciseSummaries.reduce((n, e) => n + e.totalSets, 0),
            totalVolumeKg: round1(exerciseSummaries.reduce((n, e) => n + e.volumeKg, 0)),
            exercises: exerciseSummaries,
          };
        });

      const cardioRows = await db
        .select()
        .from(cardioSessions)
        .where(and(eq(cardioSessions.userId, userId), gte(cardioSessions.date, cutoff)))
        .orderBy(desc(cardioSessions.date));

      const cardio = cardioRows.map((c) => ({ date: c.date.toISOString(), type: c.type, distanceKm: c.distanceKm, durationSec: c.durationSec }));

      return { strength, cardio };
    }
    case "get_current_programs": {
      const list = await getPrograms(userId);
      return Promise.all(list.map((p) => getProgramWithDays(userId, p.id)));
    }
    case "get_body_metrics": {
      const limit = Number(args.limit ?? 10);
      return getBodyMetricHistory(userId, limit);
    }
    default:
      throw new Error(`Unknown read tool: ${name}`);
  }
}
