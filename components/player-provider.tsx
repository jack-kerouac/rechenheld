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
  logout: () => Promise<void>;
  notificationsEnabled: boolean;
  subscribeToNotifications: () => Promise<boolean>;
};

const PlayerContext = createContext<PlayerContextType>({
  player: null,
  knownNames: [],
  login: async () => {},
  logout: async () => {},
  notificationsEnabled: false,
  subscribeToNotifications: async () => false,
});

export function usePlayer() {
  return useContext(PlayerContext);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [knownNames, setKnownNames] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    setKnownNames(getKnownNames());
    const stored = localStorage.getItem("rechenheld_player");
    if (stored) {
      setPlayer(JSON.parse(stored));
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  async function login(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

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

  async function logout() {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    }
    setNotificationsEnabled(false);
    setPlayer(null);
    localStorage.removeItem("rechenheld_player");
  }

  async function subscribeToNotifications(): Promise<boolean> {
    if (!player || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: player.id, subscription: sub }),
      });

      if (!res.ok) return false;

      setNotificationsEnabled(true);
      return true;
    } catch (err) {
      console.error("[push] subscribeToNotifications error:", err);
      return false;
    }
  }

  return (
    <PlayerContext.Provider
      value={{ player, knownNames, login, logout, notificationsEnabled, subscribeToNotifications }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
