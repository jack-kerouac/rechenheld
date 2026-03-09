# Rechenheld – Code Walkthrough

*2026-03-08T21:23:52Z by Showboat 0.6.1*
<!-- showboat-id: 6bf3087e-a592-4583-bfb0-cdcd079c9669 -->

Rechenheld is a German-language math practice app for elementary school students. Kids practice addition and subtraction problems, compete in real-time duels, and climb a leaderboard. It's built with Next.js 15, React 19, TypeScript, Tailwind CSS 4, and Supabase (Postgres + Realtime).

This walkthrough covers every layer of the codebase from bottom to top: data types, math generation, database schema, Supabase client, React components, and finally the four app pages.

## Project Structure

Let's start with what's in the repo.

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" -o -name "*.css" \) | grep -v node_modules | grep -v .next | sort
```

```output
./app/bestenliste/page.tsx
./app/duell/[id]/page.tsx
./app/duell/page.tsx
./app/globals.css
./app/layout.tsx
./app/page.tsx
./app/ueben/[id]/page.tsx
./app/ueben/page.tsx
./components/calculation-card.tsx
./components/player-provider.tsx
./components/result-screen.tsx
./components/timer.tsx
./lib/math.test.ts
./lib/math.ts
./lib/supabase.ts
./lib/types.ts
./supabase-schema.sql
./supabase/migrations/20260308000000_init.sql
./supabase/migrations/20260308010000_add_op_mode.sql
./supabase/migrations/20260308020000_leaderboard_date.sql
./supabase/migrations/20260308030000_drop_battle_status.sql
./supabase/migrations/20260308030000_leaderboard_datetime.sql
./vitest.config.ts
```

Four layers:
- **lib/** – Types, math logic, Supabase client (pure logic, no React)
- **components/** – Reusable React components (player context, calculation card, timer, result screen)
- **app/** – Next.js 15 App Router pages (home, practice, battle, leaderboard)
- **supabase/** – Database migrations (Postgres schema)

We'll walk through them in that order.

---

## Layer 1: Types (`lib/types.ts`)

The type system is the backbone. Every calculation, round, battle, and player has a precise TypeScript definition.

```bash
cat lib/types.ts
```

```output
export type Op = "+" | "-";

export type OpMode = "plus" | "plus-minus";

export type Calculation = {
  a: number;
  b: number;
  op: Op;
  answer: number;
};

export type CalculationWithInput = Calculation & {
  playerAnswer?: number;
};

export type Player = {
  id: string;
  name: string;
};

export type Round = {
  id: string;
  player_id: string;
  number_range: number;
  op_mode: OpMode;
  started_at: string;
  finished_at: string | null;
  correct_count: number | null;
  calculations: CalculationWithInput[];
  battle_id: string | null;
};

export type Battle = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  number_range: number;
  op_mode: OpMode;
  calculations: Calculation[];
  created_at: string;
};

export type LeaderboardEntry = {
  player_id: string;
  name: string;
  number_range: number;
  op_mode: OpMode;
  best_time: string;
  best_date: string;
};
```

Key design choices:
- `Calculation` holds the math problem and its correct answer. `CalculationWithInput` extends it with an optional `playerAnswer` — this is what gets stored in the database after a student completes a round.
- `Round` is the central record. It tracks who played, what settings were used, timestamps, score, and the full list of calculations with answers. When `battle_id` is null, it's a practice round; otherwise it's part of a duel.
- `Battle` links two players together and holds the shared set of calculations they both solve.
- `OpMode` controls whether problems include subtraction: `"plus"` means addition only, `"plus-minus"` includes both.

---

## Layer 2: Math Generation (`lib/math.ts`)

This is where problems come from. The algorithm builds a pool of all valid problems for the given range, shuffles it, and picks the requested count.

```bash
cat lib/math.ts
```

```output
import { Calculation, Op, OpMode } from "./types";

export function generateCalculations(
  range: number,
  count: number,
  opMode: OpMode = "plus-minus"
): Calculation[] {
  const pool = buildPool(range, opMode);
  shuffle(pool);
  return pool.slice(0, count);
}

function buildPool(range: number, opMode: OpMode): Calculation[] {
  const pool: Calculation[] = [];

  if (opMode === "plus" || opMode === "plus-minus") {
    for (let a = 0; a <= range; a++) {
      for (let b = 0; b <= range - a; b++) {
        pool.push({ a, b, op: "+", answer: a + b });
      }
    }
  }

  if (opMode === "plus-minus") {
    for (let a = 0; a <= range; a++) {
      for (let b = 0; b <= a; b++) {
        pool.push({ a, b, op: "-", answer: a - b });
      }
    }
  }

  return pool;
}

function shuffle(arr: unknown[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
```

The `buildPool` function generates every valid problem within the constraints:
- **Addition**: all `a + b` where both operands are non-negative and the sum doesn't exceed `range`. For range 10, this gives 66 problems (0+0 through 10+0).
- **Subtraction** (plus-minus mode only): all `a - b` where `b ≤ a` so the result is never negative. For range 10, this adds 66 more problems.

Fisher-Yates shuffle ensures uniform randomness. The app always picks 10 problems from this pool.

The test suite validates the constraints:

```bash
cat lib/math.test.ts
```

```output
import { describe, it, expect } from "vitest";
import { generateCalculations } from "./math";

describe("generateCalculations", () => {
  it("generates the requested number of calculations", () => {
    const calcs = generateCalculations(10, 10);
    expect(calcs).toHaveLength(10);
  });

  it("only uses + and - operators", () => {
    const calcs = generateCalculations(20, 100);
    for (const c of calcs) {
      expect(["+", "-"]).toContain(c.op);
    }
  });

  it("all values and results are within [0, range]", () => {
    for (const range of [10, 20, 30]) {
      const calcs = generateCalculations(range, 200);
      for (const c of calcs) {
        expect(c.a).toBeGreaterThanOrEqual(0);
        expect(c.a).toBeLessThanOrEqual(range);
        expect(c.b).toBeGreaterThanOrEqual(0);
        expect(c.b).toBeLessThanOrEqual(range);
        expect(c.answer).toBeGreaterThanOrEqual(0);
        expect(c.answer).toBeLessThanOrEqual(range);
      }
    }
  });

  it("no results are negative", () => {
    const calcs = generateCalculations(10, 500);
    for (const c of calcs) {
      expect(c.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("answers are correct", () => {
    const calcs = generateCalculations(20, 100);
    for (const c of calcs) {
      if (c.op === "+") {
        expect(c.answer).toBe(c.a + c.b);
      } else {
        expect(c.answer).toBe(c.a - c.b);
      }
    }
  });

  it("generates both addition and subtraction", () => {
    const calcs = generateCalculations(20, 200);
    const ops = new Set(calcs.map((c) => c.op));
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
  });

  it("works with range 0", () => {
    const calcs = generateCalculations(0, 5);
    for (const c of calcs) {
      expect(c.a).toBe(0);
      expect(c.b).toBe(0);
      expect(c.answer).toBe(0);
    }
  });

  it("plus mode generates only addition", () => {
    const calcs = generateCalculations(20, 200, "plus");
    for (const c of calcs) {
      expect(c.op).toBe("+");
    }
  });

  it("plus-minus mode generates both operators", () => {
    const calcs = generateCalculations(20, 200, "plus-minus");
    const ops = new Set(calcs.map((c) => c.op));
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
  });
});
```

```bash
npx vitest run --reporter=verbose 2>&1
```

```output

 RUN  v3.2.4 /Users/florianhertnagel/src/rechenheld

 ✓ lib/math.test.ts > generateCalculations > generates the requested number of calculations 1ms
 ✓ lib/math.test.ts > generateCalculations > only uses + and - operators 2ms
 ✓ lib/math.test.ts > generateCalculations > all values and results are within [0, range] 20ms
 ✓ lib/math.test.ts > generateCalculations > no results are negative 1ms
 ✓ lib/math.test.ts > generateCalculations > answers are correct 1ms
 ✓ lib/math.test.ts > generateCalculations > generates both addition and subtraction 0ms
 ✓ lib/math.test.ts > generateCalculations > works with range 0 0ms
 ✓ lib/math.test.ts > generateCalculations > plus mode generates only addition 1ms
 ✓ lib/math.test.ts > generateCalculations > plus-minus mode generates both operators 0ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  22:25:05
   Duration  440ms (transform 26ms, setup 0ms, collect 20ms, tests 27ms, environment 0ms, prepare 58ms)

```

All 9 tests pass. The tests verify: correct count, operators match the mode, values stay within range, no negative results, correct arithmetic, and edge case handling (range=0).

---

## Layer 3: Database Schema

The app uses Supabase (hosted Postgres). Here's the initial schema that creates the three tables and the leaderboard view:

```bash
cat supabase-schema.sql
```

```output
-- Rechenheld database schema
-- Run this in your Supabase SQL editor

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references players(id),
  opponent_id uuid references players(id),
  number_range int not null,
  calculations jsonb not null,
  created_at timestamptz not null default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  number_range int not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  correct_count int,
  calculations jsonb not null,
  battle_id uuid references battles(id),
  created_at timestamptz not null default now()
);

create view leaderboard as
select
  p.id as player_id, p.name, r.number_range,
  count(*) as rounds_played,
  min(r.finished_at - r.started_at) as best_time,
  avg(r.correct_count) as avg_score
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null and r.correct_count = 10 and r.battle_id is null
group by p.id, p.name, r.number_range;

-- RLS: permissive for classroom use (no auth)
alter table players enable row level security;
alter table battles enable row level security;
alter table rounds enable row level security;

create policy "Anyone can read players" on players for select using (true);
create policy "Anyone can insert players" on players for insert with check (true);

create policy "Anyone can read battles" on battles for select using (true);
create policy "Anyone can insert battles" on battles for insert with check (true);

create policy "Anyone can read rounds" on rounds for select using (true);
create policy "Anyone can insert rounds" on rounds for insert with check (true);

-- Enable Realtime for battles and rounds
alter publication supabase_realtime add table battles;
alter publication supabase_realtime add table rounds;
```

Three tables:
- **players** – Just an id and a unique name. No passwords — this is for a classroom, not Fort Knox.
- **battles** – Links a challenger to an opponent, stores the shared calculation set as JSONB so both players solve the same problems.
- **rounds** – The core record. Each time a player completes a set of problems, a round is inserted. `battle_id` is null for practice rounds. The `calculations` JSONB stores each problem plus the player's answer.

The **leaderboard** is a Postgres view that finds each player's fastest perfect round (10/10 correct, practice only) per number range and operation mode.

Row-level security is fully permissive — anyone can read and insert. Realtime subscriptions are enabled on battles and rounds so the app can push updates when an opponent finishes a duel.

The schema was later extended by migrations to add `op_mode` columns and date/time tracking on the leaderboard. Here's the current leaderboard view:

```bash
cat supabase/migrations/20260308030000_leaderboard_datetime.sql
```

```output
-- Change best_date from date to full timestamp so the leaderboard can show time of day
drop view leaderboard;

create view leaderboard as
select distinct on (p.id, r.number_range, r.op_mode)
  p.id as player_id, p.name, r.number_range, r.op_mode,
  (r.finished_at - r.started_at) as best_time,
  r.finished_at as best_date
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null and r.correct_count = 10 and r.battle_id is null
order by p.id, r.number_range, r.op_mode, (r.finished_at - r.started_at) asc;
```

The final leaderboard view uses `DISTINCT ON` to pick each player's single fastest perfect round per (number_range, op_mode) combination, ordered by elapsed time ascending.

---

## Layer 4: Supabase Client (`lib/supabase.ts`)

The thinnest layer — just initializes the Supabase JS client.

```bash
cat lib/supabase.ts
```

```output
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Uses the `NEXT_PUBLIC_` prefix so these values are available in the browser. The anon key is safe to expose — row-level security controls access.

---

## Layer 5: React Components

### Player Provider (`components/player-provider.tsx`)

This is the auth system — a React context that manages the current player and persists their identity in localStorage.

```bash
cat components/player-provider.tsx
```

```output
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Player } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const NAMES_KEY = "rechenheld_known_names";

function getKnownNames(): string[] {
  const stored = localStorage.getItem(NAMES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function addKnownName(name: string) {
  const names = getKnownNames();
  if (!names.includes(name)) {
    names.push(name);
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  }
}

type PlayerContextType = {
  player: Player | null;
  knownNames: string[];
  login: (name: string) => Promise<void>;
  logout: () => void;
};

const PlayerContext = createContext<PlayerContextType>({
  player: null,
  knownNames: [],
  login: async () => {},
  logout: () => {},
});

export function usePlayer() {
  return useContext(PlayerContext);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [knownNames, setKnownNames] = useState<string[]>([]);

  useEffect(() => {
    setKnownNames(getKnownNames());
    const stored = localStorage.getItem("rechenheld_player");
    if (stored) {
      setPlayer(JSON.parse(stored));
    }
  }, []);

  async function login(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Try to find existing player
    const { data: existing } = await supabase
      .from("players")
      .select("id, name")
      .eq("name", trimmed)
      .single();

    let p: Player;
    if (existing) {
      p = existing;
    } else {
      const { data: created, error } = await supabase
        .from("players")
        .insert({ name: trimmed })
        .select("id, name")
        .single();
      if (error) throw error;
      p = created;
    }

    setPlayer(p);
    localStorage.setItem("rechenheld_player", JSON.stringify(p));
    addKnownName(trimmed);
    setKnownNames(getKnownNames());
  }

  function logout() {
    setPlayer(null);
    localStorage.removeItem("rechenheld_player");
  }

  return (
    <PlayerContext.Provider value={{ player, knownNames, login, logout }}>
      {children}
    </PlayerContext.Provider>
  );
}
```

The player provider does three things:
1. **Persistence**: On mount, loads the current player from `localStorage`. No server-side session needed.
2. **Login**: Looks up the player by name in Supabase. If not found, creates one. Stores the result in context + localStorage.
3. **Known names**: Remembers every name that's been used on this device so returning students can tap their name instead of retyping it.

The `usePlayer()` hook gives any component access to the current player and the login/logout functions.

### Timer (`components/timer.tsx`)

A stopwatch that displays elapsed time with tenth-of-second precision.

```bash
cat components/timer.tsx
```

```output
"use client";

import { useState, useEffect, useRef } from "react";

export function Timer({
  running,
  onElapsed,
}: {
  running: boolean;
  onElapsed?: (ms: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const lastTenthRef = useRef(-1);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      lastTenthRef.current = -1;
      const tick = () => {
        const ms = Date.now() - startRef.current!;
        const tenth = Math.floor(ms / 100);
        if (tenth !== lastTenthRef.current) {
          lastTenthRef.current = tenth;
          setElapsed(ms);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else if (startRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      const finalMs = Date.now() - startRef.current;
      setElapsed(finalMs);
      onElapsed?.(finalMs);
    }

    return () => cancelAnimationFrame(rafRef.current);
    // onElapsed is stable from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const seconds = Math.floor(elapsed / 1000);
  const tenths = Math.floor((elapsed % 1000) / 100);

  return (
    <div className="text-4xl font-bold tabular-nums text-center">
      {seconds},{tenths}s
    </div>
  );
}
```

The timer uses `requestAnimationFrame` for smooth updates but only re-renders when the tenth-of-second digit changes — not on every frame. This avoids unnecessary React renders while keeping the display smooth. When stopped, it fires `onElapsed` with the final millisecond count.

Note the German decimal comma in the display: `{seconds},{tenths}s` renders as "12,3s".

### Calculation Card (`components/calculation-card.tsx`)

This is the core interaction widget — it displays a math problem and captures the student's answer via an on-screen keypad.

```bash
cat components/calculation-card.tsx
```

```output
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Calculation } from "@/lib/types";

export function CalculationCard({
  calculation,
  index,
  total,
  onAnswer,
}: {
  calculation: Calculation;
  index: number;
  total: number;
  onAnswer: (answer: number) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const handleKey = useCallback((key: string) => {
    if (key === "backspace") {
      setInput((prev) => prev.slice(0, -1));
    } else if (key === "ok") {
      if (inputRef.current !== "") {
        onAnswerRef.current(parseInt(inputRef.current, 10));
        setInput("");
      }
    } else {
      // Max 2 digits (range up to 30)
      setInput((prev) => (prev.length < 2 ? prev + key : prev));
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        handleKey(e.key);
      } else if (e.key === "Backspace") {
        handleKey("backspace");
      } else if (e.key === "Enter") {
        handleKey("ok");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-lg text-gray-500">
        Aufgabe {index + 1} von {total}
      </div>

      <div className="text-5xl font-bold">
        {calculation.a} {calculation.op} {calculation.b} ={" "}
        <span className="inline-block min-w-[2ch] border-b-4 border-sky-400 text-center">
          {input || "\u00A0"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 w-[320px] mt-4" style={{ touchAction: "none" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleKey(String(n))}
            className="h-[84px] text-4xl font-bold rounded-xl bg-gray-100 active:bg-gray-300 transition-colors"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleKey("backspace")}
          className="h-[84px] text-3xl font-bold rounded-xl bg-red-100 active:bg-red-300 transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => handleKey("0")}
          className="h-[84px] text-4xl font-bold rounded-xl bg-gray-100 active:bg-gray-300 transition-colors"
        >
          0
        </button>
        <div />
        <button
          onClick={() => handleKey("ok")}
          className="col-span-3 h-[84px] text-3xl font-bold rounded-xl bg-green-200 active:bg-green-400 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
```

Design details:
- **Refs for stability**: `onAnswerRef` and `inputRef` let the keyboard event handler access current values without re-creating the callback. This avoids adding/removing event listeners on every render.
- **Two-digit limit**: Input is capped at 2 characters since the maximum answer is 30.
- **Touch-friendly**: The keypad uses 84px tall buttons with `touch-action: none` on the grid container to prevent iPad's touch-scroll from stealing taps.
- **Dual input**: Works with both the on-screen keypad (primary for tablets) and physical keyboard (for desktop).

### Result Screen (`components/result-screen.tsx`)

Shown after a practice round completes. Displays score, time, leaderboard position, and a breakdown of each problem.

```bash
cat components/result-screen.tsx
```

```output
"use client";

import { CalculationWithInput, OpMode } from "@/lib/types";
import Link from "next/link";

export function ResultScreen({
  calculations,
  elapsedMs,
  battleMode,
  leaderboardRank,
  bestTimeDiffMs,
  numberRange,
  opMode,
}: {
  calculations: CalculationWithInput[];
  elapsedMs: number;
  battleMode?: boolean;
  leaderboardRank?: number | null;
  bestTimeDiffMs?: number | null;
  numberRange?: number;
  opMode?: OpMode;
}) {
  const correct = calculations.filter(
    (c) => c.playerAnswer === c.answer
  ).length;
  const total = calculations.length;
  const seconds = (elapsedMs / 1000).toFixed(1).replace(".", ",");
  const perfect = correct === total;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-5xl font-bold">
        {perfect ? "🏆" : correct >= 7 ? "⭐" : "💪"}
      </div>
      <div className="text-3xl font-bold">
        {correct} von {total} richtig
      </div>
      <div className="text-2xl text-gray-600">{seconds} Sekunden</div>

      {leaderboardRank != null && (
        <div className="px-4 py-3 bg-yellow-100 border-2 border-yellow-400 rounded-xl text-center">
          <div className="text-2xl font-bold">
            {leaderboardRank === 1 ? "🥇" : leaderboardRank === 2 ? "🥈" : leaderboardRank === 3 ? "🥉" : "🎉"}{" "}
            Neue Bestzeit! Platz {leaderboardRank} in der Bestenliste!
          </div>
        </div>
      )}

      {bestTimeDiffMs != null && bestTimeDiffMs > 0 && (
        <div className="px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-center">
          <div className="text-xl text-gray-600">
            {(bestTimeDiffMs / 1000).toFixed(1).replace(".", ",")} Sekunden langsamer als deine Bestzeit
          </div>
        </div>
      )}

      <div className="w-full max-w-xs space-y-2 mt-4">
        {calculations.map((c, i) => {
          const isCorrect = c.playerAnswer === c.answer;
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-2 rounded-lg text-xl ${
                isCorrect ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <span>
                {c.a} {c.op} {c.b} = {c.playerAnswer}
              </span>
              <span>
                {isCorrect ? (
                  "✓"
                ) : (
                  <span className="text-red-600">✗ {c.answer}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {!battleMode && (
        <div className="flex gap-4 mt-6">
          <Link
            href="/ueben"
            className="px-6 py-3 bg-sky-500 text-white text-xl font-bold rounded-xl"
          >
            Nochmal!
          </Link>
          <Link
            href={
              numberRange && opMode
                ? `/bestenliste?range=${numberRange}&op=${opMode}`
                : "/bestenliste"
            }
            className="px-6 py-3 bg-yellow-400 text-xl font-bold rounded-xl"
          >
            Bestenliste
          </Link>
        </div>
      )}
    </div>
  );
}
```

The result screen adapts based on performance:
- **Perfect score**: Trophy emoji + leaderboard rank badge (gold/silver/bronze) if it's a new personal best
- **Good score** (7+): Star emoji
- **Lower score**: Muscle emoji (encouraging, not punishing)

If the student got a perfect score but was slower than their previous best, it shows the time difference ("2,3 Sekunden langsamer als deine Bestzeit"). Each problem is listed with a green or red background showing what was right/wrong.

In battle mode, the navigation links are hidden (the battle page handles its own UI).

---

## Layer 6: App Pages

### Root Layout (`app/layout.tsx`)

```bash
cat app/layout.tsx
```

```output
import type { Metadata } from "next";
import { PlayerProvider } from "@/components/player-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rechenheld",
  description: "Mathe-Duell für die Grundschule",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-white">
        <PlayerProvider>
          <main className="max-w-xl mx-auto px-4 py-8">{children}</main>
        </PlayerProvider>
      </body>
    </html>
  );
}
```

Simple and clean. The `PlayerProvider` wraps everything so player state is available on every page. The `max-w-xl mx-auto` constrains the layout to a mobile-friendly width centered on screen.

### Home Page (`app/page.tsx`)

This is the dashboard — login, see incoming challenges, and navigate to the three main features.

```bash
cat app/page.tsx
```

```output
"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { Battle, Player } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const { player, knownNames, login, logout } = usePlayer();
  const [name, setName] = useState("");
  const [showNewName, setShowNewName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [challenges, setChallenges] = useState<
    (Battle & { challenger: Player })[]
  >([]);

  useEffect(() => {
    if (!player) return;
    loadChallenges();
    // Subscribe to new challenges via Realtime
    const channel = supabase
      .channel("challenges")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battles",
          filter: `opponent_id=eq.${player.id}`,
        },
        () => loadChallenges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  async function loadChallenges() {
    if (!player) return;
    const { data: battles } = await supabase
      .from("battles")
      .select("*, challenger:players!battles_challenger_id_fkey(*)")
      .eq("opponent_id", player.id);
    if (!battles || battles.length === 0) {
      setChallenges([]);
      return;
    }
    // Filter out battles where the opponent already has a round
    const { data: myRounds } = await supabase
      .from("rounds")
      .select("battle_id")
      .eq("player_id", player.id)
      .in("battle_id", battles.map((b) => b.id));
    const playedIds = new Set(myRounds?.map((r) => r.battle_id));
    setChallenges(
      (battles as (Battle & { challenger: Player })[]).filter(
        (b) => !playedIds.has(b.id)
      )
    );
  }

  async function handleLogin() {
    setLoading(true);
    try {
      await login(name);
      setName("");
      setShowNewName(false);
    } finally {
      setLoading(false);
    }
  }

  if (!player) {
    const showNameInput = showNewName || knownNames.length === 0;

    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        <Image src="/logo.png" alt="Rechenheld" width={300} height={300} priority />
        <p className="text-xl text-gray-600">Wie heißt du?</p>

        {!showNameInput && (
          <div className="w-full space-y-3">
            {knownNames.map((n) => (
              <button
                key={n}
                onClick={() => { setName(n); login(n).finally(() => setLoading(false)); setLoading(true); }}
                disabled={loading}
                className="w-full py-4 text-2xl font-bold bg-sky-500 text-white rounded-xl disabled:opacity-50 active:bg-sky-600"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setShowNewName(true)}
              className="w-full py-4 text-2xl font-bold bg-white text-sky-500 border-2 border-sky-300 rounded-xl active:bg-sky-50"
            >
              Neuer Rechenheld…
            </button>
          </div>
        )}

        {showNameInput && (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Dein Name"
              className="w-full text-2xl text-center py-4 px-6 border-2 border-sky-300 rounded-xl focus:outline-none focus:border-sky-500"
              autoFocus
            />
            <button
              onClick={handleLogin}
              disabled={!name.trim() || loading}
              className="w-full py-4 text-2xl font-bold bg-sky-500 text-white rounded-xl disabled:opacity-50 active:bg-sky-600"
            >
              Los geht&apos;s!
            </button>
            {knownNames.length > 0 && (
              <button
                onClick={() => setShowNewName(false)}
                className="px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300"
              >
                Zurück zur Liste
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <Image src="/logo.png" alt="Rechenheld" width={300} height={300} priority />
      <p className="text-xl">
        Hallo, <span className="font-bold">{player.name}</span>!
      </p>

      {challenges.length > 0 && (
        <div className="w-full space-y-3">
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={`/duell/${c.id}`}
              className="block w-full p-4 bg-yellow-100 border-2 border-yellow-400 rounded-xl text-center"
            >
              <div className="text-xl font-bold">
                {c.challenger.name} hat dich herausgefordert!
              </div>
              <div className="text-lg mt-1">
                Zahlenraum bis {c.number_range}
              </div>
              <div className="mt-2 inline-block px-6 py-2 bg-yellow-400 font-bold text-xl rounded-xl">
                Annehmen!
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="w-full space-y-4 mt-4">
        <Link
          href="/ueben"
          className="block w-full py-5 text-2xl font-bold text-center bg-sky-400 text-white rounded-xl active:bg-sky-500"
        >
          ✏️ Üben
        </Link>
        <Link
          href="/duell"
          className="relative block w-full py-5 text-2xl font-bold text-center bg-amber-500 text-white rounded-xl active:bg-amber-600"
        >
          ⚔️ Duell
          {challenges.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-base w-8 h-8 flex items-center justify-center rounded-full">
              {challenges.length}
            </span>
          )}
        </Link>
        <Link
          href="/bestenliste?range=10&op=plus"
          className="block w-full py-5 text-2xl font-bold text-center bg-amber-400 rounded-xl active:bg-amber-500"
        >
          🏆 Bestenliste
        </Link>
      </div>

      <button
        onClick={logout}
        className="mt-8 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300"
      >
        Abmelden
      </button>
    </div>
  );
}
```

The home page has two states:

**Logged out**: Shows the logo and asks "Wie heißt du?" (What's your name?). If names are stored in localStorage from previous sessions, they appear as quick-select buttons. Otherwise, shows a text input. "Neuer Rechenheld…" lets returning users add a new name.

**Logged in**: Shows a greeting and three navigation buttons:
- **Üben** (Practice) — solve problems solo
- **Duell** (Battle) — challenge another player
- **Bestenliste** (Leaderboard) — see top scores

Incoming challenges appear as yellow cards with the challenger's name and a notification badge on the Duell button. The challenge list updates in real-time via a Supabase Realtime subscription filtered to `opponent_id=eq.{player.id}`.

The `loadChallenges` function does a two-step filter: fetches all battles where this player is the opponent, then removes any where they've already played (by checking for existing rounds).

### Practice Page (`app/ueben/page.tsx`)

Where students solve math problems. This page handles the full flow: setup → solving → save → redirect to results.

```bash
cat app/ueben/page.tsx
```

```output
"use client";

import { useState } from "react";
import { usePlayer } from "@/components/player-provider";
import { generateCalculations } from "@/lib/math";
import { CalculationWithInput, OpMode } from "@/lib/types";
import { CalculationCard } from "@/components/calculation-card";
import { Timer } from "@/components/timer";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Phase = "setup" | "solving";

const RANGES = [10, 20, 30];
const COUNT = 10;

export default function UebenPage() {
  const { player } = usePlayer();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [opMode, setOpMode] = useState<OpMode | "">("");
  const [calculations, setCalculations] = useState<CalculationWithInput[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [numberRange, setNumberRange] = useState(0);

  function startRound() {
    if (!opMode || !numberRange) return;
    const calcs = generateCalculations(numberRange, COUNT, opMode);
    setCalculations(calcs.map((c) => ({ ...c })));
    setCurrentIndex(0);
    setStartedAt(new Date());
    setPhase("solving");
  }

  async function handleAnswer(answer: number) {
    const updated = [...calculations];
    updated[currentIndex] = { ...updated[currentIndex], playerAnswer: answer };
    setCalculations(updated);

    if (currentIndex + 1 < COUNT) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const finishedAt = new Date();

      const correctCount = updated.filter(
        (c) => c.playerAnswer === c.answer
      ).length;

      if (player) {
        const { data } = await supabase.from("rounds").insert({
          player_id: player.id,
          number_range: numberRange,
          op_mode: opMode,
          started_at: startedAt!.toISOString(),
          finished_at: finishedAt.toISOString(),
          correct_count: correctCount,
          calculations: updated,
        }).select("id").single();

        if (data) {
          router.push(`/ueben/${data.id}`);
          return;
        }
      }
    }
  }

  if (!player) {
    return (
      <div className="text-center pt-12">
        <p className="text-xl mb-4">Bitte melde dich zuerst an!</p>
        <Link href="/" className="text-blue-500 underline text-xl">
          Zur Startseite
        </Link>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        <h1 className="text-3xl font-bold">Üben</h1>
        <div className="w-full space-y-4 p-4 bg-amber-50 rounded-xl">
          <h2 className="text-xl font-bold">Rechenart:</h2>
          <div className="flex gap-2">
            {([["plus", "Nur +"], ["plus-minus", "+ und −"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setOpMode(mode)}
                className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                  opMode === mode
                    ? "bg-amber-500 text-white"
                    : "bg-white active:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {opMode && (
            <>
              <h2 className="text-xl font-bold mt-4">Zahlenraum:</h2>
              <div className="flex gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setNumberRange(r)}
                    className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                      numberRange === r
                        ? "bg-amber-500 text-white"
                        : "bg-white active:bg-gray-100"
                    }`}
                  >
                    bis {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {opMode && numberRange > 0 && (
            <button
              onClick={startRound}
              className="w-full py-4 text-xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
            >
              ✏️ Los geht&apos;s!
            </button>
          )}
        </div>
        <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
          Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <Timer running={phase === "solving"} />
      <CalculationCard
        key={currentIndex}
        calculation={calculations[currentIndex]}
        index={currentIndex}
        total={COUNT}
        onAnswer={handleAnswer}
      />
      <button
        onClick={() => setPhase("setup")}
        className="px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300"
      >
        Abbrechen
      </button>
    </div>
  );
}
```

The practice page has two phases:

**Setup**: Progressive disclosure — first choose operation mode, then number range appears, then the start button. Each selection highlights in amber.

**Solving**: The timer starts, and calculations appear one at a time. The `key={currentIndex}` prop on `CalculationCard` is important — it forces React to create a fresh component for each problem, resetting the input field.

When the last answer is submitted, the page:
1. Counts correct answers
2. Inserts the round into Supabase with timestamps and all calculations (including player answers)
3. Redirects to `/ueben/{round_id}` for the result view

### Practice Results Page (`app/ueben/[id]/page.tsx`)

Fetches the completed round from the database and checks the leaderboard for context.

```bash
cat "app/ueben/[id]/page.tsx"
```

```output
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { Round } from "@/lib/types";
import { ResultScreen } from "@/components/result-screen";
import Link from "next/link";

function parseIntervalMs(interval: string): number {
  const match = interval.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
  if (!match) return 0;
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const frac = match[4] ? parseInt(match[4].padEnd(3, "0").slice(0, 3)) : 0;
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + frac;
}

export default function RoundResultPage() {
  const { id } = useParams<{ id: string }>();
  const { player } = usePlayer();
  const [round, setRound] = useState<Round | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [bestTimeDiffMs, setBestTimeDiffMs] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("rounds")
        .select("*")
        .eq("id", id)
        .is("battle_id", null)
        .single();

      if (!data) {
        setNotFound(true);
        return;
      }

      setRound(data as Round);

      if (data.correct_count === 10 && player) {
        const { data: board } = await supabase
          .from("leaderboard")
          .select("player_id, best_time")
          .eq("number_range", data.number_range)
          .eq("op_mode", data.op_mode)
          .order("best_time", { ascending: true });
        if (board) {
          const rank = board.findIndex((e) => e.player_id === player.id);
          if (rank !== -1) {
            const bestTimeMs = parseIntervalMs(board[rank].best_time);
            const roundMs =
              new Date(data.finished_at).getTime() -
              new Date(data.started_at).getTime();
            const diff = roundMs - bestTimeMs;
            if (diff <= 0) {
              // New best or first entry — show rank
              setLeaderboardRank(rank + 1);
            } else {
              setBestTimeDiffMs(diff);
            }
          }
        }
      }
    }
    load();
  }, [id, player]);

  if (notFound) {
    return (
      <div className="text-center pt-12">
        <p className="text-xl mb-4">Runde nicht gefunden.</p>
        <Link href="/ueben" className="text-blue-500 underline text-xl">
          Zurück zum Üben
        </Link>
      </div>
    );
  }

  if (!round) {
    return null;
  }

  const elapsedMs =
    new Date(round.finished_at!).getTime() -
    new Date(round.started_at).getTime();

  return (
    <div className="pt-8">
      <ResultScreen
        calculations={round.calculations}
        elapsedMs={elapsedMs}
        leaderboardRank={leaderboardRank}
        bestTimeDiffMs={bestTimeDiffMs}
        numberRange={round.number_range}
        opMode={round.op_mode}
      />
    </div>
  );
}
```

This page does the post-round analysis:

1. Fetches the round by ID from Supabase
2. If the student got 10/10 correct, queries the leaderboard view for their number range and operation mode
3. Finds the student's entry and compares:
   - If this round's time matches (or beats) their leaderboard best → show the rank badge ("Neue Bestzeit! Platz X")
   - If slower → show the time difference ("X Sekunden langsamer als deine Bestzeit")
4. Delegates all rendering to the `ResultScreen` component

The `parseIntervalMs` function converts Postgres interval strings like `"00:00:12.345"` to milliseconds for comparison.

### Battle Pages

The battle system has two pages: an overview/creation page and the individual battle page.

#### Battle Overview (`app/duell/page.tsx")

```bash
cat app/duell/page.tsx
```

```output
"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { generateCalculations } from "@/lib/math";
import { Battle, OpMode, Player, Round } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RANGES = [10, 20, 30];

export default function DuellPage() {
  const { player } = usePlayer();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [battles, setBattles] = useState<
    (Battle & { challenger: Player; opponent: Player | null; rounds: Round[] })[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<number>(0);
  const [selectedOpMode, setSelectedOpMode] = useState<OpMode | "">("");

  useEffect(() => {
    if (!player) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  async function loadData() {
    const [{ data: playersData }, { data: battlesData }] = await Promise.all([
      supabase.from("players").select("id, name").order("name"),
      supabase
        .from("battles")
        .select(
          "*, challenger:players!battles_challenger_id_fkey(*), opponent:players!battles_opponent_id_fkey(*), rounds(*)"
        )
        .or(`challenger_id.eq.${player!.id},opponent_id.eq.${player!.id}`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (playersData)
      setPlayers(playersData.filter((p: Player) => p.id !== player!.id));
    if (battlesData)
      setBattles(
        battlesData as (Battle & {
          challenger: Player;
          opponent: Player | null;
          rounds: Round[];
        })[]
      );
  }

  async function createChallenge() {
    if (!selectedOpponent || !selectedRange || !selectedOpMode || !player)
      return;

    const calcs = generateCalculations(selectedRange, 10, selectedOpMode);
    const { data, error } = await supabase
      .from("battles")
      .insert({
        challenger_id: player.id,
        opponent_id: selectedOpponent,
        number_range: selectedRange,
        op_mode: selectedOpMode,
        calculations: calcs,
      })
      .select("id")
      .single();

    if (error || !data) return;

    router.push(`/duell/${data.id}`);
  }

  if (!player) {
    return (
      <div className="text-center pt-12">
        <p className="text-xl mb-4">Bitte melde dich zuerst an!</p>
        <Link href="/" className="text-blue-500 underline text-xl">
          Zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-3xl font-bold">Duell</h1>

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full py-4 text-xl font-bold bg-amber-500 text-white rounded-xl active:bg-amber-600"
        >
          ⚔️ Neues Duell
        </button>
      ) : (
        <div className="w-full space-y-4 p-4 bg-amber-50 rounded-xl">
          <h2 className="text-xl font-bold">Gegner wählen:</h2>
          <div className="space-y-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedOpponent(p.id)}
                className={`block w-full py-3 text-xl text-center rounded-xl ${
                  selectedOpponent === p.id
                    ? "bg-amber-500 text-white"
                    : "bg-white active:bg-gray-100"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedOpponent && (
            <>
              <h2 className="text-xl font-bold mt-4">Rechenart:</h2>
              <div className="flex gap-2">
                {([["plus", "Nur +"], ["plus-minus", "+ und −"]] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedOpMode(mode)}
                    className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                      selectedOpMode === mode
                        ? "bg-amber-500 text-white"
                        : "bg-white active:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedOpponent && selectedOpMode && (
            <>
              <h2 className="text-xl font-bold mt-4">Zahlenraum:</h2>
              <div className="flex gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRange(r)}
                    className={`flex-1 py-3 text-xl font-bold rounded-xl ${
                      selectedRange === r
                        ? "bg-amber-500 text-white"
                        : "bg-white active:bg-gray-100"
                    }`}
                  >
                    bis {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedOpponent && selectedOpMode && selectedRange > 0 && (
            <button
              onClick={createChallenge}
              className="w-full py-4 text-xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
            >
              ⚔️ Herausfordern!
            </button>
          )}

          <button
            onClick={() => {
              setCreating(false);
              setSelectedOpponent("");
              setSelectedOpMode("");
              setSelectedRange(0);
            }}
            className="w-full py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300"
          >
            Abbrechen
          </button>
        </div>
      )}

      {battles.length > 0 && (
        <div className="w-full space-y-2 mt-4">
          <h2 className="text-xl font-bold">Letzte Duelle</h2>
          {battles.map((b) => {
            const isChallenger = b.challenger_id === player.id;
            const otherName = isChallenger
              ? b.opponent?.name
              : b.challenger.name;
            const iPlayed = b.rounds.some((r) => r.player_id === player.id);
            const opponentPlayed = b.rounds.some((r) => r.player_id !== player.id);
            const bothPlayed = iPlayed && opponentPlayed;

            let badgeClass: string;
            let badgeLabel: string;
            if (bothPlayed) {
              badgeClass = "bg-green-200";
              badgeLabel = "Fertig";
            } else if (iPlayed) {
              badgeClass = "bg-blue-200";
              badgeLabel = `Warte auf ${otherName}`;
            } else if (opponentPlayed) {
              badgeClass = "bg-orange-200";
              badgeLabel = "Du bist dran!";
            } else {
              badgeClass = "bg-yellow-200";
              badgeLabel = "Offen";
            }

            return (
              <Link
                key={b.id}
                href={`/duell/${b.id}`}
                className="block w-full px-4 py-3 bg-gray-100 rounded-xl"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg">
                      {isChallenger ? "Du" : b.challenger.name} gegen{" "}
                      {isChallenger ? otherName : "Dich"}
                    </span>
                    <div className="flex gap-1 mt-1">
                      <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">{b.op_mode === "plus" ? "Nur +" : "+ und −"}</span>
                      <span className="text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">Bis {b.number_range}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(b.created_at).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
                    </div>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
        Zurück
      </Link>
    </div>
  );
}
```

The battle overview page does two things:

**Challenge creation** (progressive disclosure again): Pick an opponent → pick operation mode → pick number range → "Herausfordern!" (Challenge!). The calculations are generated upfront and stored with the battle so both players solve identical problems.

**Battle history**: Shows the last 20 battles involving this player. Each entry has a color-coded status badge:
- **Yellow (Offen)**: Neither player has solved it yet
- **Orange (Du bist dran!)**: Opponent solved it, your turn
- **Blue (Warte auf X)**: You solved it, waiting for opponent
- **Green (Fertig)**: Both players done

The status logic checks `b.rounds` to see which players have submitted a round for this battle.

#### Individual Battle Page (`app/duell/[id]/page.tsx`)

This is the most complex page — it handles the full battle lifecycle.

```bash
cat "app/duell/[id]/page.tsx"
```

```output
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { Battle, CalculationWithInput, Round } from "@/lib/types";
import { CalculationCard } from "@/components/calculation-card";
import { Timer } from "@/components/timer";
import Link from "next/link";

type Phase = "loading" | "ready" | "solving" | "done" | "waiting";

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const { player } = usePlayer();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [calculations, setCalculations] = useState<CalculationWithInput[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [myRound, setMyRound] = useState<Round | null>(null);
  const [opponentRound, setOpponentRound] = useState<Round | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const loadBattle = useCallback(async () => {
    if (!player) return;

    const { data: battleData } = await supabase
      .from("battles")
      .select("*")
      .eq("id", id)
      .single();

    if (!battleData) return;
    setBattle(battleData as Battle);

    const b = battleData as Battle;
    const opponentId =
      b.challenger_id === player.id ? b.opponent_id : b.challenger_id;

    // Load opponent name and rounds in parallel
    const [opponentResult, roundsResult] = await Promise.all([
      opponentId
        ? supabase.from("players").select("name").eq("id", opponentId).single()
        : Promise.resolve({ data: null }),
      supabase.from("rounds").select("*").eq("battle_id", id),
    ]);

    if (opponentResult.data) setOpponentName(opponentResult.data.name);
    const rounds = roundsResult.data;

    const myR = rounds?.find((r: Round) => r.player_id === player.id) ?? null;
    const opR =
      rounds?.find((r: Round) => r.player_id !== player.id) ?? null;
    setMyRound(myR);
    setOpponentRound(opR);

    if (myR?.finished_at) {
      setCalculations(myR.calculations);
      setElapsedMs(
        new Date(myR.finished_at).getTime() -
          new Date(myR.started_at).getTime()
      );
      if (opR?.finished_at) {
        setPhase("done");
      } else {
        setPhase("waiting");
      }
    } else {
      setCalculations(
        (battleData as Battle).calculations.map((c) => ({ ...c }))
      );
      setPhase("ready");
    }
  }, [player, id]);

  useEffect(() => {
    loadBattle();
  }, [loadBattle]);

  // Subscribe to round changes for this battle
  useEffect(() => {
    if (!battle || phase !== "waiting") return;

    const channel = supabase
      .channel(`battle-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `battle_id=eq.${id}`,
        },
        () => loadBattle()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle, phase, id, loadBattle]);

  function startSolving() {
    setStartedAt(new Date());
    setPhase("solving");
  }

  const handleElapsed = useCallback((ms: number) => {
    setElapsedMs(ms);
  }, []);

  async function handleAnswer(answer: number) {
    const updated = [...calculations];
    updated[currentIndex] = { ...updated[currentIndex], playerAnswer: answer };
    setCalculations(updated);

    if (currentIndex + 1 < calculations.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const finishedAt = new Date();
      const ms = finishedAt.getTime() - startedAt!.getTime();
      setElapsedMs(ms);

      const correctCount = updated.filter(
        (c) => c.playerAnswer === c.answer
      ).length;

      // Save round
      await supabase.from("rounds").insert({
        player_id: player!.id,
        number_range: battle!.number_range,
        op_mode: battle!.op_mode,
        started_at: startedAt!.toISOString(),
        finished_at: finishedAt.toISOString(),
        correct_count: correctCount,
        calculations: updated,
        battle_id: id,
      });

      await loadBattle();
    }
  }

  if (!player) {
    return (
      <div className="text-center pt-12">
        <p className="text-xl mb-4">Bitte melde dich zuerst an!</p>
        <Link href="/" className="text-blue-500 underline text-xl">
          Zur Startseite
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return <div className="text-center pt-12 text-xl">Laden...</div>;
  }

  const opModeLabel = battle?.op_mode === "plus" ? "Nur +" : "+ und −";

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center gap-6 pt-12">
        <h1 className="text-3xl font-bold">Duell</h1>
        {opponentName && (
          <p className="text-xl">
            Gegen <span className="font-bold">{opponentName}</span>
          </p>
        )}
        <div className="flex gap-2">
          <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">{opModeLabel}</span>
          <span className="text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-medium">Bis {battle?.number_range}</span>
        </div>
        <p className="text-lg text-gray-500">
          {calculations.length} Aufgaben
        </p>
        <button
          onClick={startSolving}
          className="w-full py-5 text-2xl font-bold bg-green-500 text-white rounded-xl active:bg-green-600"
        >
          Start!
        </button>
        <Link href="/duell" className="px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
          Zurück
        </Link>
      </div>
    );
  }

  if (phase === "solving") {
    return (
      <div className="flex flex-col items-center gap-6 pt-4">
        <Timer running={true} onElapsed={handleElapsed} />
        <CalculationCard
          key={currentIndex}
          calculation={calculations[currentIndex]}
          index={currentIndex}
          total={calculations.length}
          onAnswer={handleAnswer}
        />
      </div>
    );
  }

  if (phase === "waiting") {
    const myCorrect = myRound
      ? (myRound.calculations as CalculationWithInput[]).filter(
          (c) => c.playerAnswer === c.answer
        ).length
      : 0;
    const myTime = myRound
      ? (
          (new Date(myRound.finished_at!).getTime() -
            new Date(myRound.started_at).getTime()) /
          1000
        ).toFixed(1).replace(".", ",")
      : "0";

    return (
      <div className="flex flex-col items-center gap-6 pt-12">
        <h1 className="text-3xl font-bold">Warte auf Gegner...</h1>
        <p className="text-xl">
          Dein Ergebnis: {myCorrect} von 10 richtig in {myTime} Sekunden
        </p>
        <div className="animate-pulse text-4xl">⏳</div>
        <Link
          href="/"
          className="mt-4 px-6 py-3 bg-sky-500 text-white text-xl font-bold rounded-xl"
        >
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  // phase === "done" — show comparison
  const myCalcs = myRound?.calculations as CalculationWithInput[] | undefined;
  const opCalcs = opponentRound?.calculations as
    | CalculationWithInput[]
    | undefined;
  const myCorrect = myCalcs?.filter((c) => c.playerAnswer === c.answer).length ?? 0;
  const opCorrect = opCalcs?.filter((c) => c.playerAnswer === c.answer).length ?? 0;
  const myTime = myRound
    ? (new Date(myRound.finished_at!).getTime() -
        new Date(myRound.started_at).getTime()) /
      1000
    : 0;
  const opTime = opponentRound
    ? (new Date(opponentRound.finished_at!).getTime() -
        new Date(opponentRound.started_at).getTime()) /
      1000
    : 0;

  const iWon =
    myCorrect > opCorrect ||
    (myCorrect === opCorrect && myTime < opTime);
  const tie = myCorrect === opCorrect && myTime === opTime;

  const opLabel = opponentName ?? "Gegner";
  const timeDiff = myTime - opTime;

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-4xl font-bold">
        {tie ? "Unentschieden!" : iWon ? "Du hast gewonnen! 🏆" : "Knapp verloren!"}
      </h1>

      <table className="w-full text-center border-collapse rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-purple-600 text-white">
            <th className="py-2.5 text-left pl-3">Aufgabe</th>
            <th className="py-2.5">Du</th>
            <th className="py-2.5">{opLabel}</th>
          </tr>
        </thead>
        <tbody>
          {myCalcs?.map((c, i) => {
            const myOk = c.playerAnswer === c.answer;
            const opOk = opCalcs?.[i]?.playerAnswer === opCalcs?.[i]?.answer;
            return (
              <tr key={i} className={i % 2 === 0 ? "bg-purple-50" : "bg-white"}>
                <td className="py-2 text-left pl-3 font-mono text-lg">
                  {c.a} {c.op} {c.b} = {c.answer}
                </td>
                <td className={`py-2 text-xl font-bold ${myOk ? "text-green-600" : "text-red-500"}`}>{myOk ? "✓" : "✗"}</td>
                <td className={`py-2 text-xl font-bold ${opOk ? "text-green-600" : "text-red-500"}`}>{opOk ? "✓" : "✗"}</td>
              </tr>
            );
          })}
          <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
            <td className="py-2.5 text-left pl-3">Zeit</td>
            <td className="py-2.5">{myTime.toFixed(1).replace(".", ",")} Sekunden</td>
            <td className="py-2.5">{opTime.toFixed(1).replace(".", ",")} Sekunden</td>
          </tr>
          <tr className="bg-gray-100 font-bold">
            <td className="py-2.5 text-left pl-3">Richtig</td>
            <td className="py-2.5">{myCorrect}/10</td>
            <td className="py-2.5">{opCorrect}/10</td>
          </tr>
        </tbody>
      </table>

      {timeDiff !== 0 && (
        <p className="text-sm text-gray-500">
          {timeDiff < 0
            ? `Du warst ${Math.abs(timeDiff).toFixed(1).replace(".", ",")} Sekunden schneller`
            : `${opLabel} war ${timeDiff.toFixed(1).replace(".", ",")} Sekunden schneller`}
        </p>
      )}

      <div className="flex gap-4 mt-4">
        <Link
          href="/duell"
          className="px-6 py-3 bg-amber-500 text-white text-xl font-bold rounded-xl"
        >
          Alle Duelle
        </Link>
        <Link
          href="/"
          className="px-6 py-3 bg-sky-500 text-white text-xl font-bold rounded-xl"
        >
          Startseite
        </Link>
      </div>
    </div>
  );
}
```

The battle page manages five phases:

1. **Loading**: Fetches battle data, opponent name, and existing rounds in parallel
2. **Ready**: Shows opponent name and battle parameters, awaits "Start!" tap
3. **Solving**: Same calculation flow as practice (Timer + CalculationCard)
4. **Waiting**: Shows the player's own score while waiting for the opponent. Subscribes to Supabase Realtime on the rounds table filtered to this battle. When a new round appears, it reloads the battle data and transitions to "done".
5. **Done**: Full comparison table — shows all 10 problems with checkmarks/crosses for each player, time taken, and correct counts. Winner is determined by: most correct answers wins; if tied, fastest time wins.

The asynchronous design means players don't need to be online simultaneously. The challenger creates the battle, solves it, and leaves. The opponent can accept hours later. Realtime subscriptions handle the notification when both are online.

### Leaderboard (`app/bestenliste/page.tsx`)

The final page — displays the top performers.

```bash
cat app/bestenliste/page.tsx
```

```output
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LeaderboardEntry, OpMode } from "@/lib/types";
import Link from "next/link";

const RANGES = [10, 20, 30];
const OP_MODES: { value: OpMode; label: string }[] = [
  { value: "plus", label: "Nur +" },
  { value: "plus-minus", label: "+ und −" },
];

function formatInterval(interval: string): string {
  // PostgreSQL interval like "00:00:12.345" → "12,3 Sekunden"
  const match = interval.match(/(\d+):(\d+):(\d+)\.?(\d*)/);
  if (!match) return interval;
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const frac = match[4] ? match[4].slice(0, 1) : "0";
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return `${totalSeconds},${frac} Sekunden`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time} Uhr`;
}

function BestenlisteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRange = Number(searchParams.get("range")) || 10;
  const initialOp = (searchParams.get("op") as OpMode) || "plus";

  const [range, setRange] = useState(
    RANGES.includes(initialRange) ? initialRange : 10
  );
  const [opMode, setOpMode] = useState<OpMode>(
    OP_MODES.some((m) => m.value === initialOp) ? initialOp : "plus"
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  function updateFilter(newRange: number, newOp: OpMode) {
    setRange(newRange);
    setOpMode(newOp);
    router.replace(`/bestenliste?range=${newRange}&op=${newOp}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, opMode]);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("number_range", range)
      .eq("op_mode", opMode)
      .order("best_time", { ascending: true })
      .limit(20);
    if (data) setEntries(data as LeaderboardEntry[]);
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <h1 className="text-3xl font-bold">Bestenliste</h1>

      <div className="flex gap-2">
        {OP_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => updateFilter(range, m.value)}
            className={`px-4 py-2 text-lg font-bold rounded-xl ${
              opMode === m.value
                ? "bg-yellow-400"
                : "bg-gray-100 active:bg-gray-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => updateFilter(r, opMode)}
            className={`px-4 py-2 text-lg font-bold rounded-xl ${
              range === r
                ? "bg-yellow-400"
                : "bg-gray-100 active:bg-gray-200"
            }`}
          >
            bis {r}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">Nur perfekte Runden (10 von 10 richtig)</p>

      {entries.length === 0 ? (
        <p className="text-xl text-gray-400 mt-8">Noch keine Einträge!</p>
      ) : (
        <div className="w-full space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.player_id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-xl ${
                i === 0
                  ? "bg-yellow-200"
                  : i === 1
                    ? "bg-gray-200"
                    : i === 2
                      ? "bg-orange-200"
                      : "bg-white"
              }`}
            >
              <span className="font-bold w-8">{i + 1}.</span>
              <span className="flex-1">
                {entry.name}
              </span>
              <span className="text-sm text-gray-500 mr-3">
                {formatDate(entry.best_date)}
              </span>
              <span className="font-mono font-bold">
                {formatInterval(entry.best_time)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link href="/" className="mt-4 px-6 py-3 text-xl font-bold bg-gray-200 text-gray-500 rounded-xl active:bg-gray-300">
        Zurück
      </Link>
    </div>
  );
}

export default function BestenlistePage() {
  return (
    <Suspense>
      <BestenlisteContent />
    </Suspense>
  );
}
```

The leaderboard page:
- Reads initial filters from URL query parameters (`?range=10&op=plus`) so links from the result screen pre-select the right view
- Updates the URL when filters change (without scrolling) so the selection is bookmarkable
- Queries the `leaderboard` Postgres view filtered by number range and operation mode
- Displays the top 20 entries with medal-colored backgrounds (gold/silver/bronze for positions 1-3)
- Shows the date and time of each best performance in German format
- Only shows perfect rounds (10/10) — this is enforced by the database view itself

The `Suspense` wrapper is required because `useSearchParams()` needs it in Next.js 15.

---

## Summary

The architecture is straightforward:

1. **Pure logic** (`lib/`) generates math problems and defines types
2. **Components** handle input (keypad), timing (stopwatch), and display (results)
3. **Pages** orchestrate the user flow: login → practice or battle → results → leaderboard
4. **Database** stores everything in three tables with a leaderboard view, and Supabase Realtime pushes battle updates to connected clients

The whole app is about 1,800 lines of TypeScript across 16 source files. No authentication, no server-side rendering, no API routes — just a client-side React app talking directly to Supabase.
