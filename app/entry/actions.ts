"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WeatherValue = "맑음" | "흐림" | "비" | "눈" | null;
export type Tag = "sow" | "harvest" | null;

export interface SaveEntryInput {
  date: string;
  weather: WeatherValue;
  note: string;
  lines: { content: string; tag: Tag }[];
  expenses: { content: string; amount: number }[];
}

export async function saveEntry(input: SaveEntryInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const lines = input.lines.filter((line) => line.content.trim().length > 0);
  const expenses = input.expenses.filter(
    (expense) => expense.content.trim().length > 0 && Number.isFinite(expense.amount),
  );

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .upsert(
      {
        user_id: user.id,
        entry_date: input.date,
        weather: input.weather,
        note: input.note.trim() || null,
      },
      { onConflict: "user_id,entry_date" },
    )
    .select("id")
    .single();

  if (entryError || !entry) {
    throw new Error(entryError?.message ?? "일지 저장에 실패했습니다.");
  }

  const { error: deleteWorkItemsError } = await supabase
    .from("work_items")
    .delete()
    .eq("entry_id", entry.id);
  if (deleteWorkItemsError) throw new Error(deleteWorkItemsError.message);

  const { error: deleteExpensesError } = await supabase
    .from("expenses")
    .delete()
    .eq("entry_id", entry.id);
  if (deleteExpensesError) throw new Error(deleteExpensesError.message);

  if (lines.length > 0) {
    const { error } = await supabase.from("work_items").insert(
      lines.map((line, index) => ({
        entry_id: entry.id,
        content: line.content.trim(),
        tag: line.tag,
        position: index,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (expenses.length > 0) {
    const { error } = await supabase.from("expenses").insert(
      expenses.map((expense) => ({
        entry_id: entry.id,
        content: expense.content.trim(),
        amount: expense.amount,
      })),
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/entry");
  revalidatePath("/");

  return { ok: true as const, entryId: entry.id as string };
}
