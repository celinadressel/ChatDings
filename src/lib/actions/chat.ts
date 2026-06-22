"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  sendMessageSchema,
  createChatSchema,
  sendFileMessageSchema,
  type SendFileMessageInput,
} from "@/lib/validations";

export async function sendMessage(formData: FormData) {
  const raw = {
    content: formData.get("content"),
    chat_id: formData.get("chat_id"),
  };

  const parsed = sendMessageSchema.safeParse(raw);
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

  const { error } = await supabase.from("messages").insert({
    chat_id: parsed.data.chat_id,
    sender_id: user.id,
    content: parsed.data.content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/chat/${parsed.data.chat_id}`);
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

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .insert({ is_group: false, created_by: user.id })
    .select()
    .single();

  if (chatError || !chat) {
    return { error: chatError?.message ?? "Fehler beim Erstellen des Chats" };
  }

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

export async function sendFileMessage(input: SendFileMessageInput) { //server action to send a message with a file attachment
  const parsed = sendFileMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient(); //create supabase client with server-side authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const { error } = await supabase.from("messages").insert({ //insert new message with file attachment into the database
    chat_id: parsed.data.chat_id,
    sender_id: user.id,
    content: parsed.data.content ?? "",
    file_url: parsed.data.file_url,
    file_name: parsed.data.file_name,
    file_type: parsed.data.file_type,
    file_size: parsed.data.file_size,
  });

  if (error) return { error: error.message };

  revalidatePath(`/chat/${parsed.data.chat_id}`); //revalidate the chat page to show the new message
  return { success: true };
}