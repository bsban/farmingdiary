"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { addTodo, deleteTodo, toggleTodo } from "./todo-actions";

interface Todo {
  id: string;
  content: string;
  done: boolean;
}

export function TodoList({
  initialTodos,
  className = "",
  onComplete,
}: {
  initialTodos: Todo[];
  className?: string;
  onComplete?: (content: string) => void;
}) {
  const [todos, setTodos] = useState(initialTodos);
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    const tempId = crypto.randomUUID();
    setTodos((prev) => [...prev, { id: tempId, content, done: false }]);
    setText("");
    startTransition(async () => {
      try {
        const realId = await addTodo(content);
        if (realId) {
          setTodos((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
        }
      } catch {
        setTodos((prev) => prev.filter((t) => t.id !== tempId));
      }
    });
  }

  function handleToggle(id: string, done: boolean, content: string) {
    if (done && onComplete) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      onComplete(content);
      startTransition(async () => {
        await deleteTodo(id);
      });
      return;
    }
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    startTransition(async () => {
      await toggleTodo(id, done);
    });
  }

  function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await deleteTodo(id);
    });
  }

  return (
    <aside className={`flex w-full flex-col gap-2 md:w-56 md:shrink-0 ${className}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-400">할일</p>
      <form onSubmit={handleAdd} className="flex gap-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="할일 추가"
          className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          aria-label="추가"
          className="rounded bg-primary-600 px-2 text-white hover:bg-primary-700"
        >
          <Plus size={14} />
        </button>
      </form>
      <ul className="flex flex-col gap-1">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => handleToggle(todo.id, e.target.checked, todo.content)}
              className="accent-primary-600"
            />
            <span
              className={`flex-1 ${todo.done ? "text-neutral-300 line-through" : "text-neutral-700"}`}
            >
              {todo.content}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(todo.id)}
              aria-label="삭제"
              className="text-neutral-300 hover:text-neutral-500"
            >
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
