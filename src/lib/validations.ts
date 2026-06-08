import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signUpSchema = z
  .object({
    email: z.string().email("Ungültige E-Mail-Adresse"),
    username: z
      .string()
      .min(3, "Nutzername muss mindestens 3 Zeichen haben")
      .max(30, "Nutzername darf maximal 30 Zeichen haben")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Nur Buchstaben, Zahlen und _ erlaubt"
      ),
    display_name: z.string().min(1, "Anzeigename darf nicht leer sein").max(50),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort darf nicht leer sein"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// ─── Messages ─────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Nachricht darf nicht leer sein")
    .max(4000, "Nachricht darf maximal 4000 Zeichen lang sein"),
  chat_id: z.string().uuid("Ungültige Chat-ID"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const createChatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_group: z.boolean().default(false),
  member_ids: z.array(z.string().uuid()).min(1, "Mindestens ein Mitglied nötig"),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
