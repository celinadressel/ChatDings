import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z.string().email("Ungültige E-Mail-Adresse"),
    username: z
      .string()
      .min(3, "Nutzername muss mindestens 3 Zeichen haben")
      .max(30, "Nutzername darf maximal 30 Zeichen haben")
      .regex(/^[a-zA-Z0-9_]+$/, "Nur Buchstaben, Zahlen und _ erlaubt"),
    display_name: z
      .string()
      .min(1, "Anzeigename darf nicht leer sein")
      .max(50),
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

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Nachricht darf nicht leer sein")
    .max(4000, "Nachricht darf maximal 4000 Zeichen lang sein"),
  chat_id: z.string().uuid("Ungültige Chat-ID"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const createChatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_group: z.boolean().default(false),
  member_ids: z
    .array(z.string().uuid())
    .min(1, "Mindestens ein Mitglied nötig"),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Nutzername muss mindestens 3 Zeichen haben")
    .max(30, "Nutzername darf maximal 30 Zeichen haben")
    .regex(/^[a-zA-Z0-9_]+$/, "Nur Buchstaben, Zahlen und _ erlaubt"),
  display_name: z
    .string()
    .min(1, "Anzeigename darf nicht leer sein")
    .max(50, "Anzeigename darf maximal 50 Zeichen haben"),
  status: z
    .string()
    .max(120, "Status darf maximal 120 Zeichen haben")
    .transform((value) => value.trim())
    .optional(),
  avatar_url: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Profilbild muss eine gültige URL sein"
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const sendFileMessageSchema = z.object({ //upload file message validation schema
  chat_id: z.string().uuid("Ungültige Chat-ID"),
  content: z.string().max(4000).optional(),
  file_url: z.string().min(1, "Datei-Pfad fehlt"),
  file_name: z.string().min(1).max(255),
  file_type: z.string().min(1),
  file_size: z.number().int().positive().max(20 * 1024 * 1024, "Datei zu groß (max. 20 MB)"),
});

export type SendFileMessageInput = z.infer<typeof sendFileMessageSchema>;