"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">농사일지 로그인</h1>

      {status === "sent" ? (
        <p className="max-w-xs text-center text-sm text-neutral-500">
          {email}로 로그인 링크를 보냈습니다. 메일함을 확인해주세요.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded bg-primary-600 px-3 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {status === "sending" ? "전송 중..." : "로그인 링크 받기"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">문제가 발생했습니다. 다시 시도해주세요.</p>
          )}
        </form>
      )}
    </main>
  );
}
