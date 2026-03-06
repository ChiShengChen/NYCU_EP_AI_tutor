"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { ModeSelector } from "@/components/mode-selector";
import { TeachingMode } from "@/components/teaching-mode";
import { QuizMode } from "@/components/quiz-mode";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const [mode, setMode] = useState<"teaching" | "qa" | "quiz" | "dashboard" | null>(null);

  if (mode === "qa") {
    return <Chat onBack={() => setMode(null)} />;
  }

  if (mode === "teaching") {
    return <TeachingMode onBack={() => setMode(null)} />;
  }

  if (mode === "quiz") {
    return <QuizMode onBack={() => setMode(null)} />;
  }

  if (mode === "dashboard") {
    return <Dashboard onBack={() => setMode(null)} />;
  }

  return <ModeSelector onSelectMode={setMode} />;
}
