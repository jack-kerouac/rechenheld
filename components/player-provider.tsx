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

type PlayerContextType = {
  player: Player | null;
  login: (name: string) => Promise<void>;
  logout: () => void;
};

const PlayerContext = createContext<PlayerContextType>({
  player: null,
  login: async () => {},
  logout: () => {},
});

export function usePlayer() {
  return useContext(PlayerContext);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
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

    if (existing) {
      setPlayer(existing);
      localStorage.setItem("rechenheld_player", JSON.stringify(existing));
      return;
    }

    // Create new player
    const { data: created, error } = await supabase
      .from("players")
      .insert({ name: trimmed })
      .select("id, name")
      .single();

    if (error) throw error;

    setPlayer(created);
    localStorage.setItem("rechenheld_player", JSON.stringify(created));
  }

  function logout() {
    setPlayer(null);
    localStorage.removeItem("rechenheld_player");
  }

  return (
    <PlayerContext.Provider value={{ player, login, logout }}>
      {children}
    </PlayerContext.Provider>
  );
}
