"use client";

import { useChat } from "@ai-sdk/react";
import { type UIMessage, DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useCallback, type FormEvent } from "react";
import { MarkdownRenderer } from "./markdown-renderer";

interface WeekInfo {
  week_number: number;
  page_count: number;
  sections: string[];
}

interface PageChunk {
  id: number;
  week_number: number;
  page_number: number;
  section_title: string;
  content: string;
  content_type: string;
  is_counterexample: boolean;
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

interface TeachingModeProps {
  onBack: () => void;
}

export function TeachingMode({ onBack }: TeachingModeProps) {
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageChunks, setPageChunks] = useState<PageChunk[]>([]);
  const [loadingPage, setLoadingPage] = useState(false);

  const [studentId] = useState(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem("laser_tutor_student_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("laser_tutor_student_id", id);
    return id;
  });

  // Fetch weeks on mount
  useEffect(() => {
    fetch("/api/lectures")
      .then((res) => res.json())
      .then((data) => {
        setWeeks(data.weeks ?? []);
        setLoadingWeeks(false);
      })
      .catch(() => setLoadingWeeks(false));
  }, []);

  // When a week is selected, determine total pages
  const handleSelectWeek = useCallback((weekNum: number) => {
    const week = weeks.find((w) => w.week_number === weekNum);
    setSelectedWeek(weekNum);
    setTotalPages(week?.page_count ?? 0);
    setCurrentPage(1);
  }, [weeks]);

  const handleBackToWeeks = useCallback(() => {
    setSelectedWeek(null);
    setCurrentPage(1);
    setPageChunks([]);
  }, []);

  // Show week selection or page viewer
  if (selectedWeek === null) {
    return (
      <WeekSelector
        weeks={weeks}
        loading={loadingWeeks}
        onSelectWeek={handleSelectWeek}
        onBack={onBack}
      />
    );
  }

  return (
    <PageViewer
      weekNumber={selectedWeek}
      currentPage={currentPage}
      totalPages={totalPages}
      pageChunks={pageChunks}
      loadingPage={loadingPage}
      studentId={studentId}
      onSetCurrentPage={setCurrentPage}
      onSetPageChunks={setPageChunks}
      onSetLoadingPage={setLoadingPage}
      onSetTotalPages={setTotalPages}
      onBackToWeeks={handleBackToWeeks}
      onBackToModes={onBack}
    />
  );
}

/* ───────────── Week Selector ───────────── */

function WeekSelector({
  weeks,
  loading,
  onSelectWeek,
  onBack,
}: {
  weeks: WeekInfo[];
  loading: boolean;
  onSelectWeek: (week: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={onBack}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          aria-label="返回"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xl">📖</span>
        <h1 className="text-lg font-semibold text-slate-800">教學模式 — 選擇週次</h1>
        <span className="text-xs text-slate-400 ml-auto">NYCU 電物系</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400">載入中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {weeks.map((week) => (
              <button
                key={week.week_number}
                onClick={() => onSelectWeek(week.week_number)}
                className="group flex flex-col text-left p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-slate-800">
                    第 {week.week_number} 週
                  </span>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                    {week.page_count} 頁
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {week.sections.slice(0, 3).map((section) => (
                    <span
                      key={section}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-[180px]"
                    >
                      {section}
                    </span>
                  ))}
                  {week.sections.length > 3 && (
                    <span className="text-xs text-slate-400">
                      +{week.sections.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Page Viewer ───────────── */

function PageViewer({
  weekNumber,
  currentPage,
  totalPages,
  pageChunks,
  loadingPage,
  studentId,
  onSetCurrentPage,
  onSetPageChunks,
  onSetLoadingPage,
  onSetTotalPages,
  onBackToWeeks,
  onBackToModes,
}: {
  weekNumber: number;
  currentPage: number;
  totalPages: number;
  pageChunks: PageChunk[];
  loadingPage: boolean;
  studentId: string;
  onSetCurrentPage: (page: number) => void;
  onSetPageChunks: (chunks: PageChunk[]) => void;
  onSetLoadingPage: (loading: boolean) => void;
  onSetTotalPages: (total: number) => void;
  onBackToWeeks: () => void;
  onBackToModes: () => void;
}) {
  const [input, setInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [chatKey, setChatKey] = useState(0);
  const hasSentInitial = useRef(false);

  // Create transport that passes teaching mode params
  const [transport, setTransport] = useState(
    () =>
      new DefaultChatTransport({
        body: () => ({
          mode: "teaching",
          weekNumber,
          pageNumber: currentPage,
          studentId,
        }),
      }),
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    id: `teaching-${weekNumber}-${currentPage}-${chatKey}`,
  });
  const isBusy = status === "streaming" || status === "submitted";

  // Fetch page content and reset chat when page changes
  useEffect(() => {
    hasSentInitial.current = false;
    onSetLoadingPage(true);

    // Recreate transport for new page
    setTransport(
      new DefaultChatTransport({
        body: () => ({
          mode: "teaching",
          weekNumber,
          pageNumber: currentPage,
          studentId,
        }),
      }),
    );
    setChatKey((k) => k + 1);

    // Fetch page chunks
    fetch(`/api/lectures?week=${weekNumber}&page=${currentPage}`)
      .then((res) => res.json())
      .then((data) => {
        onSetPageChunks(data.chunks ?? []);
        onSetLoadingPage(false);
      })
      .catch(() => onSetLoadingPage(false));

    // Also fetch total pages if we don't have it yet
    if (totalPages === 0) {
      fetch(`/api/lectures?week=${weekNumber}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.pages) {
            onSetTotalPages(data.pages.length);
          }
        });
    }
  }, [weekNumber, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send initial explanation request after page loads and chat is ready
  useEffect(() => {
    if (!loadingPage && pageChunks.length > 0 && messages.length === 0 && !hasSentInitial.current && !isBusy) {
      hasSentInitial.current = true;
      // Small delay to ensure transport is ready
      const timer = setTimeout(() => {
        sendMessage({ text: "請解說這一頁的內容" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loadingPage, pageChunks, messages.length, isBusy, sendMessage]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onSetCurrentPage(page);
    }
  };

  // Build page content markdown
  const pageContent = pageChunks
    .map((c) => {
      const prefix = c.is_counterexample ? "> ⚠️ **此為反例/錯誤示範**\n\n" : "";
      const sectionHeader = c.section_title ? `### ${c.section_title}\n\n` : "";
      return `${sectionHeader}${prefix}${c.content}`;
    })
    .join("\n\n---\n\n");

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={onBackToWeeks}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          aria-label="返回週次選擇"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xl">📖</span>
        <h1 className="text-lg font-semibold text-slate-800">第 {weekNumber} 週</h1>
        <span className="text-sm text-slate-500">
          Page {currentPage} / {totalPages || "..."}
        </span>
        <button
          onClick={onBackToModes}
          className="ml-auto text-xs text-slate-500 hover:text-indigo-600 transition-colors"
        >
          返回選擇模式
        </button>
      </header>

      {/* Main Content: Side-by-side on desktop, stacked on mobile */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Lecture Content */}
        <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <h2 className="text-sm font-medium text-slate-600">📄 講義內容</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loadingPage ? (
              <div className="flex items-center justify-center h-32 text-slate-400">載入中...</div>
            ) : pageChunks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400">此頁無內容</div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={pageContent} />
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="md:w-1/2 flex flex-col">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <h2 className="text-sm font-medium text-slate-600">🤖 AI 解說</h2>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && !isBusy ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                AI 正在準備解說...
              </div>
            ) : (
              messages.map((m) => {
                const text = getTextContent(m);
                if (!text) return null;
                return (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-white border border-slate-200 shadow-sm rounded-bl-sm"
                      }`}
                    >
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm">{text}</p>
                      ) : (
                        <MarkdownRenderer content={text} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isBusy && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat input for follow-up questions */}
          <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="追問這一頁的內容..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                disabled={isBusy}
              />
              <button
                type="submit"
                disabled={isBusy || !input.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                送出
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white shrink-0">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          上一頁
        </button>

        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                p === currentPage
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          下一頁
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
