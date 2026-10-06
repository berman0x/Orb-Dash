import { createFileRoute } from "@tanstack/react-router";
import { OrbDash } from "@/components/game/OrbDash";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Orb Dash — 3D Mobile Runner" },
      { name: "description", content: "Swipe, dodge and jump through a pastel 3D world. A fast, fun mobile runner." },
      { property: "og:title", content: "Orb Dash — 3D Mobile Runner" },
      { property: "og:description", content: "Swipe, dodge and jump through a pastel 3D world." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrbDash,
});
