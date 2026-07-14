"use client";

import { useState } from "react";
import { TodoList } from "../todo-list";
import { EntryForm } from "./entry-form";
import type { Tag, WeatherValue } from "./actions";

interface Photo {
  id: string;
  path: string;
  url: string;
}

interface Todo {
  id: string;
  content: string;
  done: boolean;
}

export function EntryScreen({
  date,
  initialEntryId,
  initialWeather,
  initialNote,
  initialLines,
  initialExpenses,
  initialPhotos,
  initialTodos,
}: {
  date: string;
  initialEntryId: string | null;
  initialWeather: WeatherValue;
  initialNote: string;
  initialLines: { content: string; tag: Tag }[];
  initialExpenses: { content: string; amount: string }[];
  initialPhotos: Photo[];
  initialTodos: Todo[];
}) {
  const [injectedLine, setInjectedLine] = useState<{ content: string; nonce: number } | null>(
    null,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:flex-row md:items-start">
      <EntryForm
        date={date}
        initialEntryId={initialEntryId}
        initialWeather={initialWeather}
        initialNote={initialNote}
        initialLines={initialLines}
        initialExpenses={initialExpenses}
        initialPhotos={initialPhotos}
        injectedLine={injectedLine}
        onInjectedLineConsumed={() => setInjectedLine(null)}
      />
      <TodoList
        className="md:order-first"
        initialTodos={initialTodos}
        onComplete={(content) => setInjectedLine({ content, nonce: Date.now() })}
      />
    </div>
  );
}
