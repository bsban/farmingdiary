import { createClient } from "@/lib/supabase/server";
import { todayKST } from "@/lib/dates";
import { EntryScreen } from "./entry-screen";
import type { Tag, WeatherValue } from "./actions";

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
    .select(
      "id, weather, note, work_items(content, tag, position), expenses(content, amount), photos(id, storage_path, position)",
    )
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

  const photoRows = entry?.photos?.slice().sort((a, b) => a.position - b.position) ?? [];
  const initialPhotos = await Promise.all(
    photoRows.map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("entry-photos")
        .createSignedUrl(photo.storage_path as string, 3600);
      return {
        id: photo.id as string,
        path: photo.storage_path as string,
        url: signed?.signedUrl ?? "",
      };
    }),
  );

  const { data: todos } = await supabase
    .from("todos")
    .select("id, content, done")
    .order("created_at", { ascending: true });

  return (
    <EntryScreen
      date={targetDate}
      initialEntryId={(entry?.id as string) ?? null}
      initialWeather={(entry?.weather as WeatherValue) ?? []}
      initialNote={(entry?.note as string) ?? ""}
      initialLines={initialLines}
      initialExpenses={initialExpenses}
      initialPhotos={initialPhotos}
      initialTodos={(todos ?? []).map((t) => ({
        id: t.id as string,
        content: t.content as string,
        done: t.done as boolean,
      }))}
    />
  );
}
