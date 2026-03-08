"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { Battle, Player } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const { player, login, logout } = usePlayer();
  const [name, setName] = useState("");
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
      .eq("opponent_id", player.id)
      .in("status", ["pending", "accepted"]);
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
    } finally {
      setLoading(false);
    }
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center gap-6 pt-8">
        <Image src="/logo.png" alt="Rechenheld" width={300} height={300} priority />
        <p className="text-xl text-gray-600">Wie heißt du?</p>
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
          href="/bestenliste"
          className="block w-full py-5 text-2xl font-bold text-center bg-amber-400 rounded-xl active:bg-amber-500"
        >
          🏆 Bestenliste
        </Link>
      </div>

      <button
        onClick={logout}
        className="mt-8 text-gray-400 underline text-sm"
      >
        Abmelden
      </button>
    </div>
  );
}
