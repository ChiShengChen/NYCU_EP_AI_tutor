"use client";

interface ModeSelectorProps {
  onSelectMode: (mode: "teaching" | "qa" | "quiz") => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <span className="text-xl">⚡</span>
        <h1 className="text-lg font-semibold text-slate-800">雷射導論 AI 助教</h1>
        <span className="text-xs text-slate-400 ml-auto">NYCU 電物系</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-3xl mb-3">👋</p>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">歡迎使用雷射導論 AI 助教</h2>
          <p className="text-slate-500">請選擇學習模式</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* Teaching Mode Card */}
          <button
            onClick={() => onSelectMode("teaching")}
            className="group flex flex-col items-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📖</span>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">教學模式</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              按照講義一週一章，逐頁學習，AI 為你解說每一頁的內容
            </p>
            <span className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium group-hover:bg-indigo-700 transition-colors">
              開始學習
            </span>
          </button>

          {/* Free Q&A Card */}
          <button
            onClick={() => onSelectMode("qa")}
            className="group flex flex-col items-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">💬</span>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">自由問答</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              自由提問任何雷射物理的問題，AI 根據教材內容回答
            </p>
            <span className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium group-hover:bg-indigo-700 transition-colors">
              開始提問
            </span>
          </button>

          {/* Quiz Mode Card */}
          <button
            onClick={() => onSelectMode("quiz")}
            className="group flex flex-col items-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📝</span>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">自動測驗</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              AI 根據你的薄弱概念自動生成測驗，針對性練習
            </p>
            <span className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium group-hover:bg-indigo-700 transition-colors">
              開始測驗
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
