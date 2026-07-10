import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "./entry-form";
import type { Tag, WeatherValue } from "./actions";

function todayKST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const targetDate = date ?? todayKST();

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("entries")
    .select("weather, note, work_items(content, tag, position), expenses(content, amount)")
    .eq("entry_date", targetDate)
    .maybeSingle();

  const initialLines =
    entry?.work_items
      ?.slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ content: item.content as string, tag: item.tag as Tag })) ?? [];

  const initialExpenses =
    entry?.expenses?.map((expense) => ({
      content: expense.content as string,
      amount: String(expense.amount),
    })) ?? [];

  return (
    <EntryForm
      date={targetDate}
      initialWeather={(entry?.weather as WeatherValue) ?? null}
      initialNote={(entry?.note as string) ?? ""}
      initialLines={initialLines}
      initialExpenses={initialExpenses}
    />
  );
}
