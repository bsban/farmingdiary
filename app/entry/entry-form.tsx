"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudRain,
  ImagePlus,
  Receipt,
  Snowflake,
  Sprout,
  Sun,
  Wheat,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { todayKST, shiftDate } from "@/lib/dates";
import { saveEntry, type Tag, type WeatherOption, type WeatherValue } from "./actions";

interface Line {
  id: string;
  content: string;
  tag: Tag;
}

interface Expense {
  id: string;
  content: string;
  amount: string;
}

interface Photo {
  id: string;
  path: string;
  url: string;
}

function newId() {
  return crypto.randomUUID();
}

const WEATHER_OPTIONS: { value: WeatherOption; Icon: typeof Sun }[] = [
  { value: "맑음", Icon: Sun },
  { value: "흐림", Icon: Cloud },
  { value: "비", Icon: CloudRain },
  { value: "눈", Icon: Snowflake },
];

export function EntryForm({
  date,
  initialEntryId,
  initialWeather,
  initialNote,
  initialLines,
  initialExpenses,
  initialPhotos,
  injectedLine,
  onInjectedLineConsumed,
}: {
  date: string;
  initialEntryId: string | null;
  initialWeather: WeatherValue;
  initialNote: string;
  initialLines: { content: string; tag: Tag }[];
  initialExpenses: { content: string; amount: string }[];
  initialPhotos: Photo[];
  injectedLine?: { content: string; nonce: number } | null;
  onInjectedLineConsumed?: () => void;
}) {
  const router = useRouter();
  const [entryId, setEntryId] = useState(initialEntryId);
  const [weather, setWeather] = useState<WeatherValue>(initialWeather);
  const [lines, setLines] = useState<Line[]>(
    initialLines.length > 0
      ? initialLines.map((line) => ({ id: newId(), ...line }))
      : [{ id: newId(), content: "", tag: null }],
  );
  const [showExpenses, setShowExpenses] = useState(initialExpenses.length > 0);
  const [expenses, setExpenses] = useState<Expense[]>(
    initialExpenses.map((expense) => ({ id: newId(), ...expense })),
  );
  const [showNote, setShowNote] = useState(initialNote.trim().length > 0);
  const [note, setNote] = useState(initialNote);
  const [showPhotos, setShowPhotos] = useState(initialPhotos.length > 0);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lineRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function toggleWeather(value: WeatherOption) {
    setWeather((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function goToDate(newDate: string) {
    router.push(newDate === todayKST() ? "/entry" : `/entry?date=${newDate}`);
  }

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function addLineAfter(id: string) {
    const newLine: Line = { id: newId(), content: "", tag: null };
    setLines((prev) => {
      const index = prev.findIndex((line) => line.id === id);
      const next = [...prev];
      next.splice(index + 1, 0, newLine);
      return next;
    });
    requestAnimationFrame(() => lineRefs.current[newLine.id]?.focus());
  }

  function appendLine(content: string) {
    setLines((prev) => {
      if (prev.length === 1 && prev[0].content === "") {
        return [{ id: newId(), content, tag: null }];
      }
      return [...prev, { id: newId(), content, tag: null }];
    });
  }

  useEffect(() => {
    if (injectedLine) {
      appendLine(injectedLine.content);
      onInjectedLineConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedLine]);

  function removeLine(id: string) {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      const index = prev.findIndex((line) => line.id === id);
      const next = prev.filter((line) => line.id !== id);
      const focusTarget = next[Math.max(0, index - 1)];
      requestAnimationFrame(() => {
        const el = lineRefs.current[focusTarget.id];
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      });
      return next;
    });
  }

  function handleLineKeyDown(e: KeyboardEvent<HTMLInputElement>, line: Line) {
    if (e.key === "Enter") {
      e.preventDefault();
      addLineAfter(line.id);
    } else if (e.key === "Backspace" && line.content === "" && lines.length > 1) {
      e.preventDefault();
      removeLine(line.id);
    }
  }

  function toggleTag(id: string, tag: NonNullable<Tag>) {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, tag: line.tag === tag ? null : tag } : line,
      ),
    );
  }

  function addExpense() {
    setExpenses((prev) => [...prev, { id: newId(), content: "", amount: "" }]);
  }

  function updateExpense(id: string, patch: Partial<Expense>) {
    setExpenses((prev) =>
      prev.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)),
    );
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  }

  async function ensureEntryId(): Promise<string> {
    if (entryId) return entryId;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const { data, error } = await supabase
      .from("entries")
      .upsert(
        {
          user_id: user.id,
          entry_date: date,
          weather: weather.length > 0 ? weather : null,
          note: note.trim() || null,
        },
        { onConflict: "user_id,entry_date" },
      )
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "일지 생성에 실패했습니다.");
    setEntryId(data.id as string);
    return data.id as string;
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const id = await ensureEntryId();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      let nextPosition = photos.length;
      for (const file of Array.from(files)) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
        const path = `${user.id}/${id}/${newId()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("entry-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: row, error: insertError } = await supabase
          .from("photos")
          .insert({ entry_id: id, storage_path: path, position: nextPosition })
          .select("id")
          .single();
        if (insertError) throw insertError;

        nextPosition += 1;
        setPhotos((prev) => [
          ...prev,
          { id: row.id as string, path, url: URL.createObjectURL(file) },
        ]);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(photo: Photo) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    const supabase = createClient();
    await supabase.storage.from("entry-photos").remove([photo.path]);
    await supabase.from("photos").delete().eq("id", photo.id);
  }

  function handleSave() {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result = await saveEntry({
          date,
          weather,
          note,
          lines: lines.map(({ content, tag }) => ({ content, tag })),
          expenses: expenses.map(({ content, amount }) => ({
            content,
            amount: Number(amount),
          })),
        });
        setEntryId(result.entryId);
        setSavedAt(Date.now());
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-5">
      <Link
        href={`/?week=${date}`}
        className="flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <CalendarDays size={16} /> 달력으로
      </Link>

      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToDate(shiftDate(date, -1))}
          aria-label="전날"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && goToDate(e.target.value)}
          className="rounded border border-neutral-200 px-2 py-1 text-sm font-medium text-neutral-900"
        />
        <button
          type="button"
          onClick={() => goToDate(shiftDate(date, 1))}
          aria-label="다음날"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
        >
          <ChevronRight size={18} />
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {WEATHER_OPTIONS.map(({ value, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleWeather(value)}
            aria-pressed={weather.includes(value)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
              weather.includes(value)
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-neutral-200 text-neutral-500"
            }`}
          >
            <Icon size={15} />
            {value}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-400">오늘 기록</p>
        {lines.map((line) => (
          <div
            key={line.id}
            className="flex items-center gap-2 border-b border-dashed border-neutral-200 py-1"
          >
            <span className="text-neutral-300">·</span>
            <input
              ref={(el) => {
                lineRefs.current[line.id] = el;
              }}
              value={line.content}
              onChange={(e) => updateLine(line.id, { content: e.target.value })}
              onKeyDown={(e) => handleLineKeyDown(e, line)}
              placeholder="오늘 한 일을 적어보세요"
              className="flex-1 py-1 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => toggleTag(line.id, "sow")}
              aria-label="파종"
              aria-pressed={line.tag === "sow"}
              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs whitespace-nowrap ${
                line.tag === "sow"
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-neutral-200 text-neutral-400"
              }`}
            >
              <Sprout size={13} /> <span className="hidden sm:inline">파종</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTag(line.id, "harvest")}
              aria-label="수확"
              aria-pressed={line.tag === "harvest"}
              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs whitespace-nowrap ${
                line.tag === "harvest"
                  ? "border-harvest bg-harvest/10 text-harvest"
                  : "border-neutral-200 text-neutral-400"
              }`}
            >
              <Wheat size={13} /> <span className="hidden sm:inline">수확</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addLineAfter(lines[lines.length - 1].id)}
          className="py-1 text-left text-sm text-neutral-400"
        >
          + 줄 추가
        </button>
      </section>

      <section className="flex flex-col gap-2">
        {!showPhotos ? (
          <button
            type="button"
            onClick={() => {
              setShowPhotos(true);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-2 rounded border border-dashed border-neutral-300 px-3 py-2 text-left text-sm text-neutral-500"
          >
            <ImagePlus size={15} /> 사진 추가
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-neutral-400">사진</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative h-20 w-20 overflow-hidden rounded border border-neutral-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo)}
                    aria-label="사진 삭제"
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-neutral-300 text-neutral-400 disabled:opacity-50"
              >
                {uploading ? "..." : <ImagePlus size={20} />}
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="hidden"
        />
      </section>

      <section className="flex flex-col gap-2">
        {!showExpenses ? (
          <button
            type="button"
            onClick={() => {
              setShowExpenses(true);
              if (expenses.length === 0) addExpense();
            }}
            className="flex items-center gap-2 rounded border border-dashed border-neutral-300 px-3 py-2 text-left text-sm text-neutral-500"
          >
            <Receipt size={15} /> 비용 추가
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded border border-neutral-200 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">비용</p>
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-2">
                <input
                  value={expense.content}
                  onChange={(e) => updateExpense(expense.id, { content: e.target.value })}
                  placeholder="예: 엔진 예초기 수리"
                  className="flex-1 rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <input
                  value={expense.amount}
                  onChange={(e) =>
                    updateExpense(expense.id, { amount: e.target.value.replace(/[^0-9]/g, "") })
                  }
                  inputMode="numeric"
                  placeholder="금액"
                  className="w-24 rounded border border-neutral-200 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeExpense(expense.id)}
                  className="text-neutral-400"
                  aria-label="비용 삭제"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addExpense} className="text-left text-sm text-neutral-400">
              + 비용 줄 추가
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        {!showNote ? (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="rounded border border-dashed border-neutral-300 px-3 py-2 text-left text-sm text-neutral-500"
          >
            + 특이사항 / 비고
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-neutral-400">특이사항 / 비고</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="농사와 무관한 메모 (예: 선거일, 서류 처리)"
              rows={3}
              className="rounded border border-neutral-200 px-2 py-1 text-sm"
            />
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-auto rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>

      {savedAt && !isPending && (
        <p className="text-center text-sm text-green-600">저장했습니다.</p>
      )}
      {errorMessage && <p className="text-center text-sm text-harvest">{errorMessage}</p>}
    </main>
  );
}
