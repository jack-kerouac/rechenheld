"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "@/components/player-provider";
import { supabase } from "@/lib/supabase";
import { Round } from "@/lib/types";
import { ResultScreen } from "@/components/result-screen";
import Link from "next/link";

export default function RoundResultPage() {
  const { id } = useParams<{ id: string }>();
  const { player } = usePlayer();
  const [round, setRound] = useState<Round | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
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
          if (rank !== -1) setLeaderboardRank(rank + 1);
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
        numberRange={round.number_range}
        opMode={round.op_mode}
      />
    </div>
  );
}
