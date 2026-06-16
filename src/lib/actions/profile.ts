"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations";

export async function updateProfile(formData: FormData) {
  const raw = {
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    status: formData.get("status"),
    avatar_url: formData.get("avatar_url"),
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: undefined };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert", success: undefined };
  }

  const updates = {
    username: parsed.data.username,
    display_name: parsed.data.display_name,
    status: parsed.data.status || null,
    avatar_url: parsed.data.avatar_url || null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    const { error: fallbackError } = await supabase
      .from("profiles")
      .update({
        username: parsed.data.username,
        display_name: parsed.data.display_name,
        avatar_url: parsed.data.avatar_url || null,
      })
      .eq("id", user.id);

    if (!fallbackError) {
      revalidatePath("/chat", "layout");
      revalidatePath("/chat/profile");

      return {
        error: undefined,
        success:
          "Profil gespeichert. Status wird aktiv, sobald die Datenbankspalte angelegt ist.",
      };
    }

    return { error: error.message, success: undefined };
  }

  revalidatePath("/chat", "layout");
  revalidatePath("/chat/profile");

  return { error: undefined, success: "Profil gespeichert" };
}
