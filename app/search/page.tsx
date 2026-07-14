import Link from "next/link";
import { Receipt, Sprout, Wheat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayKST, startOfMonth, endOfMonth, formatMD, shiftDate } from "@/lib/dates";

type Filter = "all" | "sow" | "harvest" | "cost";
type Range = "all" | "this-month" | "last-month" | "custom";

interface Result {
  date: string;
  content: string;
  tag: "sow" | "harvest" | null;
  amount: number | null;
}

function buildUrl(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/search?${qs}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const filter: Filter = (["all", "sow", "harvest", "cost"] as const).includes(params.filter as Filter)
    ? (params.filter as Filter)
    : "all";
  const range: Range = (["all", "this-month", "last-month", "custom"] as const).includes(
    params.range as Range,
  )
    ? (params.range as Range)
    : "all";

  const today = todayKST();
  const [ty, tm] = today.split("-").map(Number);

  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;
  if (range === "this-month") {
    rangeStart = startOfMonth(ty, tm);
    rangeEnd = endOfMonth(ty, tm);
  } else if (range === "last-month") {
    const lastMonthDate = shiftDate(startOfMonth(ty, tm), -1);
    const [ly, lm] = lastMonthDate.split("-").map(Number);
    rangeStart = startOfMonth(ly, lm);
    rangeEnd = endOfMonth(ly, lm);
  } else if (range === "custom") {
    rangeStart = params.from ?? null;
    rangeEnd = params.to ?? null;
  }

  const supabase = await createClient();
  let query = supabase
    .from("entries")
    .select("entry_date, note, work_items(content, tag), expenses(content, amount)");
  if (rangeStart) query = query.gte("entry_date", rangeStart);
  if (rangeEnd) query = query.lte("entry_date", rangeEnd);
  const { data: entries } = await query.order("entry_date", { ascending: false });

  const keyword = q.toLowerCase();
  const results: Result[] = [];

  for (const entry of entries ?? []) {
    const date = entry.entry_date as string;

    if (filter === "all" || filter === "sow" || filter === "harvest") {
      for (const item of entry.work_items ?? []) {
        const content = item.content as string;
        const tag = item.tag as "sow" | "harvest" | null;
        if (filter === "sow" && tag !== "sow") continue;
        if (filter === "harvest" && tag !== "harvest") continue;
        if (keyword && !content.toLowerCase().includes(keyword)) continue;
        results.push({ date, content, tag, amount: null });
      }
    }

    if (filter === "all" || filter === "cost") {
      for (const expense of entry.expenses ?? []) {
        const content = expense.content as string;
        if (keyword && !content.toLowerCase().includes(keyword)) continue;
        results.push({ date, content, tag: null, amount: expense.amount as number });
      }
    }

    if (filter === "all" && entry.note) {
      const note = entry.note as string;
      if (!keyword || note.toLowerCase().includes(keyword)) {
        results.push({ date, content: note, tag: null, amount: null });
      }
    }
  }

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "sow", label: "파종" },
    { value: "harvest", label: "수확" },
    { value: "cost", label: "비용" },
  ];

  const RANGES: { value: Range; label: string }[] = [
    { value: "all", label: "전체 기간" },
    { value: "this-month", label: "이번 달" },
    { value: "last-month", label: "지난 달" },
    { value: "custom", label: "직접 지정" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">검색</h1>

      <form className="flex gap-2">
        <input type="hidden" name="filter" value={filter} />
        <input type="hidden" name="range" value={range} />
        {range === "custom" && (
          <>
            <input type="hidden" name="from" value={params.from ?? ""} />
            <input type="hidden" name="to" value={params.to ?? ""} />
          </>
        )}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="검색어를 입력하세요"
          className="flex-1 rounded border border-neutral-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-primary-600 px-4 text-sm text-white hover:bg-primary-700">
          검색
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl({ q, filter: f.value, range, from: params.from, to: params.to })}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f.value
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-neutral-200 text-neutral-500"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={buildUrl({ q, filter, range: r.value })}
            className={`rounded-full border px-3 py-1 text-xs ${
              range === r.value
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-neutral-200 text-neutral-400"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {range === "custom" && (
        <form className="flex items-center gap-2">
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="filter" value={filter} />
          <input type="hidden" name="range" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={params.from}
            className="rounded border border-neutral-200 px-2 py-1 text-sm"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="date"
            name="to"
            defaultValue={params.to}
            className="rounded border border-neutral-200 px-2 py-1 text-sm"
          />
          <button type="submit" className="rounded border border-neutral-200 px-3 py-1 text-sm text-neutral-600">
            적용
          </button>
        </form>
      )}

      <p className="text-xs text-neutral-400">{results.length}건</p>

      <ul className="flex flex-col gap-1">
        {results.map((r, idx) => (
          <li key={idx}>
            <Link
              href={`/entry?date=${r.date}`}
              className="flex items-center gap-2 border-b border-dashed border-neutral-200 py-2 text-sm"
            >
              <span className="tabular-nums text-neutral-400">{formatMD(r.date)}</span>
              <span className="flex-1 text-neutral-700">{r.content}</span>
              {r.tag === "sow" && <Sprout size={13} className="text-sow" />}
              {r.tag === "harvest" && <Wheat size={13} className="text-harvest" />}
              {r.amount !== null && (
                <span className="flex items-center gap-1 text-cost">
                  <Receipt size={13} />
                  {r.amount.toLocaleString()}원
                </span>
              )}
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-300">검색 결과가 없습니다</p>
        )}
      </ul>
    </main>
  );
}
