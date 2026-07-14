"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTodo(content: string): Promise<string | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("todos")
    .insert({ user_id: user.id, content: trimmed })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/");
  return data.id as string;
}

export async function toggleTodo(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("todos").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteTodo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
