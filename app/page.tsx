import Link from "next/link";
import { ChevronLeft, ChevronRight, Sprout, Wheat, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TodoList } from "./todo-list";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

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

function toISODate(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

function addDays(utcMs: number, days: number): number {
  return utcMs + days * 86400000;
}

function parseISODate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function startOfWeek(dateStr: string): string {
  const t = parseISODate(dateStr);
  const dow = new Date(t).getUTCDay();
  return toISODate(addDays(t, -dow));
}

function formatMD(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

interface WorkItem {
  content: string;
  tag: "sow" | "harvest" | null;
}
interface Expense {
  content: string;
  amount: number;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const today = todayKST();
  const weekStart = startOfWeek(weekParam ?? today);
  const weekStartMs = parseISODate(weekStart);

  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStartMs, i)));
  const rangeStart = days[0];
  const rangeEnd = days[6];

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("entries")
    .select(
      "entry_date, weather, note, work_items(content, tag, position), expenses(content, amount)",
    )
    .gte("entry_date", rangeStart)
    .lte("entry_date", rangeEnd);

  const { data: todos } = await supabase
    .from("todos")
    .select("id, content, done")
    .order("created_at", { ascending: true });

  const byDate = new Map<
    string,
    { weather: string | null; note: string | null; items: WorkItem[]; expenses: Expense[] }
  >();

  for (const entry of entries ?? []) {
    const items = (entry.work_items ?? [])
      .slice()
      .sort((a, b) => (a.position as number) - (b.position as number))
      .map((item) => ({ content: item.content as string, tag: item.tag as WorkItem["tag"] }));
    const expenses = (entry.expenses ?? []).map((e) => ({
      content: e.content as string,
      amount: e.amount as number,
    }));
    byDate.set(entry.entry_date as string, {
      weather: entry.weather as string | null,
      note: entry.note as string | null,
      items,
      expenses,
    });
  }

  const prevWeek = toISODate(addDays(weekStartMs, -7));
  const nextWeek = toISODate(addDays(weekStartMs, 7));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:flex-row md:items-start">
      <TodoList
        initialTodos={(todos ?? []).map((t) => ({
          id: t.id as string,
          content: t.content as string,
          done: t.done as boolean,
        }))}
      />
      <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link
          href={`/?week=${prevWeek}`}
          aria-label="이전 주"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
        >
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold">
          {formatMD(days[0])} – {formatMD(days[6])}
        </h1>
        <Link
          href={`/?week=${nextWeek}`}
          aria-label="다음 주"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
        >
          <ChevronRight size={18} />
        </Link>
      </header>

      <div className="flex flex-col gap-2">
        {days.map((date, i) => {
          const record = byDate.get(date);
          const hasContent =
            record && (record.items.length > 0 || record.expenses.length > 0 || record.note);
          return (
            <Link
              key={date}
              href={`/entry?date=${date}`}
              className={`flex flex-col gap-2 rounded border p-3 ${
                date === today ? "border-primary-500 ring-1 ring-primary-500" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                <span className="tabular-nums">{formatMD(date)}</span>
                <span className="text-neutral-400">({WEEKDAYS[i]})</span>
                {record?.weather && <span className="text-neutral-400">· {record.weather}</span>}
              </div>

              {hasContent && (
                <div className="flex flex-col gap-1">
                  {record!.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-sm text-neutral-700">
                      <span className="text-neutral-300">·</span>
                      <span>{item.content}</span>
                      {item.tag === "sow" && <Sprout size={13} className="text-sow" />}
                      {item.tag === "harvest" && <Wheat size={13} className="text-harvest" />}
                    </div>
                  ))}
                  {record!.expenses.map((expense, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-sm text-cost">
                      <Receipt size={13} />
                      <span>
                        {expense.content} · {expense.amount.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                  {record!.note && (
                    <p className="text-sm text-neutral-500">{record!.note}</p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <Link
        href="/entry"
        className="mt-auto self-center rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
      >
        오늘 기록 쓰기
      </Link>
      </main>
    </div>
  );
}
