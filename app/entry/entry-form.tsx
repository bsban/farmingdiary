"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { saveEntry, type Tag, type WeatherValue } from "./actions";

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

function newId() {
  return crypto.randomUUID();
}

const WEATHER_OPTIONS: NonNullable<WeatherValue>[] = ["맑음", "흐림", "비", "눈"];

export function EntryForm({
  date,
  initialWeather,
  initialNote,
  initialLines,
  initialExpenses,
}: {
  date: string;
  initialWeather: WeatherValue;
  initialNote: string;
  initialLines: { content: string; tag: Tag }[];
  initialExpenses: { content: string; amount: string }[];
}) {
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
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lineRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  function handleSave() {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await saveEntry({
          date,
          weather,
          note,
          lines: lines.map(({ content, tag }) => ({ content, tag })),
          expenses: expenses.map(({ content, amount }) => ({
            content,
            amount: Number(amount),
          })),
        });
        setSavedAt(Date.now());
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{date}</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {WEATHER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setWeather(weather === option ? null : option)}
            className={`rounded-full border px-3 py-1 text-sm ${
              weather === option
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-400">오늘 기록</p>
        {lines.map((line) => (
          <div key={line.id} className="flex items-center gap-2 border-b border-dashed border-neutral-200 py-1">
            <span className="text-neutral-400">·</span>
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
              className={`rounded border px-2 py-0.5 text-xs whitespace-nowrap ${
                line.tag === "sow"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 text-neutral-400"
              }`}
            >
              파종
            </button>
            <button
              type="button"
              onClick={() => toggleTag(line.id, "harvest")}
              className={`rounded border px-2 py-0.5 text-xs whitespace-nowrap ${
                line.tag === "harvest"
                  ? "border-red-600 bg-red-50 text-red-700"
                  : "border-neutral-200 text-neutral-400"
              }`}
            >
              수확
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
        {!showExpenses ? (
          <button
            type="button"
            onClick={() => {
              setShowExpenses(true);
              if (expenses.length === 0) addExpense();
            }}
            className="rounded border border-dashed border-neutral-300 px-3 py-2 text-left text-sm text-neutral-500"
          >
            + 비용 추가
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
                  ✕
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
        className="mt-auto rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>

      {savedAt && !isPending && (
        <p className="text-center text-sm text-green-600">저장했습니다.</p>
      )}
      {errorMessage && (
        <p className="text-center text-sm text-red-600">{errorMessage}</p>
      )}
    </main>
  );
}
