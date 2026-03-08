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
          <main className="max-w-md mx-auto px-4 py-8">{children}</main>
        </PlayerProvider>
      </body>
    </html>
  );
}
