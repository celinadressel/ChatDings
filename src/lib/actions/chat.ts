"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createChatSchema } from "@/lib/validations";

export async function sendMessage(formData: FormData) {
  const content = (formData.get("content") as string | null)?.trim() || null;
  const chat_id = formData.get("chat_id") as string | null;
  const file_url = formData.get("file_url") as string | null;
  const file_name = formData.get("file_name") as string | null;
  const file_type = formData.get("file_type") as string | null;
  const file_size_raw = formData.get("file_size") as string | null;
  const file_size = file_size_raw ? parseInt(file_size_raw, 10) : null;

  if (!chat_id) return { error: "Ungültige Chat-ID" };
  if (!content && !file_url) return { error: "Nachricht oder Datei erforderlich" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht authentifiziert" };

  const { error } = await supabase.from("messages").insert({
    chat_id,
    sender_id: user.id,
    content: content ?? "",
    file_url: file_url ?? null,
    file_name: file_name ?? null,
    file_type: file_type ?? null,
    file_size: file_size ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/chat/${chat_id}`);
  return { success: true };
}

export async function createDirectChat(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert" };
  }

  // Prüfen ob bereits ein DM Chat existiert
  const { data: existingChats } = await supabase
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", user.id);

  if (existingChats && existingChats.length > 0) {
    const chatIds = existingChats.map((c) => c.chat_id);
    const { data: dmChats } = await supabase
      .from("chats")
      .select("id, chat_members!inner(user_id)")
      .in("id", chatIds)
      .eq("is_group", false)
      .eq("chat_members.user_id", otherUserId);

    if (dmChats && dmChats.length > 0) {
      return { chat_id: dmChats[0].id };
    }
  }

  // Neuen Chat anlegen
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .insert({ is_group: false, created_by: user.id })
    .select()
    .single();

  if (chatError || !chat) {
    return { error: chatError?.message ?? "Fehler beim Erstellen des Chats" };
  }

  // Beide Nutzer als Mitglieder eintragen
  const { error: memberError } = await supabase.from("chat_members").insert([
    { chat_id: chat.id, user_id: user.id, role: "admin" },
    { chat_id: chat.id, user_id: otherUserId, role: "member" },
  ]);

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/chat");
  return { chat_id: chat.id };
}

export async function createGroupChat(data: {
  name: string;
  member_ids: string[];
}) {
  const parsed = createChatSchema.safeParse({ ...data, is_group: true });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert" };
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .insert({
      name: parsed.data.name,
      is_group: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (chatError || !chat) {
    return { error: chatError?.message ?? "Fehler" };
  }

  const members = [
    { chat_id: chat.id, user_id: user.id, role: "admin" as const },
    ...parsed.data.member_ids
      .filter((id) => id !== user.id)
      .map((id) => ({
        chat_id: chat.id,
        user_id: id,
        role: "member" as const,
      })),
  ];

  const { error: memberError } = await supabase
    .from("chat_members")
    .insert(members);

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/chat");
  return { chat_id: chat.id };
}

export async function addChatMember(chatId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert" };
  }

  const { error } = await supabase.from("chat_members").insert({
    chat_id: chatId,
    user_id: userId,
    role: "member",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/chat/${chatId}`);
  return { success: true };
}

export async function removeChatMember(chatId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert" };
  }

  const { error } = await supabase
    .from("chat_members")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/chat/${chatId}`);
  revalidatePath("/chat");
  return { success: true };
}