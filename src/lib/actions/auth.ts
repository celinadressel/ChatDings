"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, signInSchema } from "@/lib/validations";

export async function signUp(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, username, display_name, password } = parsed.data;
  const supabase = await createClient();

  // 1. Auth-User anlegen
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name } },
  });

  if (authError) {
    return { error: authError.message };
  }

  // 2. Das Profil wird automatisch per PostgreSQL-Trigger (on_auth_user_created) in der DB angelegt.
  
  revalidatePath("/", "layout");
  redirect("/chat");
}

export async function signIn(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/chat");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
