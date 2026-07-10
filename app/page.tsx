import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">농사일지</h1>
      <p className="text-sm text-neutral-500">달력 뷰는 Phase 3에서 만듭니다. 지금은 오늘 기록만 써볼 수 있어요.</p>
      <Link href="/entry" className="rounded bg-neutral-900 px-4 py-2 text-white">
        오늘 기록 쓰기
      </Link>
    </main>
  );
}
