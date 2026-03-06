"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { ModeSelector } from "@/components/mode-selector";
import { TeachingMode } from "@/components/teaching-mode";

export default function Home() {
  const [mode, setMode] = useState<"teaching" | "qa" | null>(null);

  if (mode === "qa") {
    return <Chat onBack={() => setMode(null)} />;
  }

  if (mode === "teaching") {
    return <TeachingMode onBack={() => setMode(null)} />;
  }

  return <ModeSelector onSelectMode={setMode} />;
}
