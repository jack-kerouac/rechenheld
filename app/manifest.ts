import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rechenheld",
    short_name: "Rechenheld",
    description: "Mathe-Duell für die Grundschule",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/logo.png",
        sizes: "726x603",
        type: "image/png",
      },
    ],
  };
}
