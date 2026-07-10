# 농사일지 — 개발 체크리스트

- 기준 아키텍처: Next.js (App Router, 모놀리식 풀스택) + Supabase (DB·인증·스토리지) + PWA
- 배포: Vercel
- 참고: [features.md](features.md), [wireframes/](wireframes/farm-journal-wireframes.html)
- 우선순위는 위에서 아래 순서. 각 Phase는 이전 Phase가 끝나야 의미가 있음.

## Phase 0 — 프로젝트 셋업

- [x] Next.js 프로젝트 초기화 (App Router, TypeScript, Tailwind CSS, ESLint) — `npm run build` 확인 완료
- [x] Supabase 클라이언트 스캐폴드 (`lib/supabase/client.ts`, `server.ts`) + 로컬 `supabase init` 완료
- [x] Supabase 클라우드 프로젝트 생성 및 연결 — `.env.local`에 URL/publishable key 설정, Auth 헬스체크로 연결 확인 완료
- [ ] Vercel 배포 파이프라인 연결 — **사용자 액션 필요** (아래 참고)
- [x] PWA 매니페스트 및 기본 아이콘 설정 (`public/manifest.json`, `public/icon.svg` — 추후 실제 아이콘으로 교체 필요)

### 남은 사용자 액션 (계정 로그인이 필요해 직접 못 하는 부분)

1. **Vercel**: 이 폴더를 GitHub 저장소로 올린 뒤 [vercel.com](https://vercel.com)에서 저장소 연결 (또는 `vercel` CLI로 로그인 후 `vercel` 실행). `.env.local`의 Supabase 환경변수를 Vercel 프로젝트 설정에도 동일하게 등록.

## Phase 1 — 데이터 모델 & DB

- [ ] `entries`(일지: 날짜, 날씨, 비고) 테이블 설계
- [ ] `work_items`(작업 기록: entry_id, 내용, 태그[파종/수확/없음]) 테이블 설계
- [ ] `expenses`(비용 기록: entry_id, 내용, 금액) 테이블 설계
- [ ] 마이그레이션 파일 작성 및 적용
- [ ] 개인용 1계정 로그인만 우선 적용 (다중 사용자/공개는 후순위)

## Phase 2 — 오늘 기록 작성 화면 (MVP 핵심)

- [ ] 날짜(기본 오늘) / 날씨 칩 선택 UI
- [ ] 작업 내용 줄 단위 자유 입력 UI (엔터로 줄 추가)
- [ ] 줄 단위 "파종/수확" 태그 토글 UI
- [ ] "+ 비용 추가" 접이식 입력 UI
- [ ] "+ 특이사항/비고" 입력 UI
- [ ] 저장 로직 연결 (Supabase insert/update)

## Phase 3 — 달력 뷰

- [ ] 월 단위 데이터 조회 쿼리
- [ ] 기록 없는 날 완전히 비우기
- [ ] 데스크톱: 셀 내 텍스트 미리보기 UI
- [ ] 모바일: 색상 점 표시 UI (파종/수확/비용/일반)
- [ ] 반응형 분기 처리 (데스크톱 ↔ 모바일)
- [ ] 날짜 클릭/탭 이벤트 연결

## Phase 4 — 날짜 상세보기

- [ ] 데스크톱 우측 상세 패널 UI
- [ ] 모바일 하단시트 UI
- [ ] 작업 기록 → 비용 → 비고 순서로 표시

## Phase 5 — 목록 / 검색

- [ ] 전체 텍스트 키워드 검색 쿼리
- [ ] 필터 UI: 전체 / 파종 / 수확 / 비용
- [ ] 기간 필터 (이번 달 / 지난 달 / 직접 지정)

## Phase 6 — 개인 사용 검증

- [ ] 실제 데이터로 1~2주 사용
- [ ] 불편한 점 / 버그 수집 및 정리

---

## 후순위 — 확장 기능 (Phase 6 검증 이후 재우선순위 결정)

- [ ] 작물/밭 마스터 관리, 파종일 기준 경과일 자동 계산
- [ ] 날씨 자동 연동 (위치·날짜 기준 API)
- [ ] 통계/리포트 (작업 빈도, 지출 추이)
- [ ] 오프라인 지원 강화 (PWA 캐싱/동기화)
- [ ] 리마인더/알림
- [ ] 데이터 내보내기 (엑셀/PDF)

## 후순위 — 공개 전환 단계

- [ ] 로그인/권한 분리 (소유자 편집, 방문자 열람)
- [ ] 게시글 단위 공개/비공개 토글
- [ ] 댓글 또는 소통 기능
- [ ] SEO, 공유 링크
