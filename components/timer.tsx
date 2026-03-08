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

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      const tick = () => {
        const ms = Date.now() - startRef.current!;
        setElapsed(ms);
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
