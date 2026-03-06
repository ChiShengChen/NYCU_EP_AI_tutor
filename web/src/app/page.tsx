"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { ModeSelector } from "@/components/mode-selector";
import { TeachingMode } from "@/components/teaching-mode";
import { QuizMode } from "@/components/quiz-mode";
export default function Home() {
  const [mode, setMode] = useState<"teaching" | "qa" | "quiz" | null>(null);

  if (mode === "qa") {
    return <Chat onBack={() => setMode(null)} />;
  }

  if (mode === "quiz") {
    return <QuizMode onBack={() => setMode(null)} />;
  }

  if (mode === "teaching") {
    return <TeachingMode onBack={() => setMode(null)} />;
  }

  return <ModeSelector onSelectMode={setMode} />;
}
