import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),

  displayName: z.string().min(1, "Enter a name").max(80),
  age: z.coerce.number().int().min(10).max(100).optional(),
  heightCm: z.coerce.number().min(100).max(250).optional(),
  startingWeightKg: z.coerce.number().min(30).max(300).optional(),
  goal: z.enum(["strength", "hypertrophy", "endurance", "general_fitness"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),

  dumbbellMinKg: z.coerce.number().min(0).max(100).optional(),
  dumbbellMaxKg: z.coerce.number().min(0).max(150).optional(),
  dumbbellStepKg: z.coerce.number().min(0.5).max(10).optional(),
  barbellWeightKg: z.coerce.number().min(0).max(50).optional(),
  availablePlatesKg: z.string().optional(), // comma-separated, parsed to JSON before storage
  ezBarWeightKg: z.coerce.number().min(0).max(30).optional(),
  bandMinKg: z.coerce.number().min(0).max(150).optional(),
  bandMaxKg: z.coerce.number().min(0).max(150).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type LogInInput = z.infer<typeof logInSchema>;
