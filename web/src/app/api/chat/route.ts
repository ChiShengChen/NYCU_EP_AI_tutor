import { google } from "@ai-sdk/google";
import { streamText, tool, convertToModelMessages } from "ai";
import { z } from "zod";
import { retrieveChunks, formatChunksForPrompt } from "@/lib/rag";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const SYSTEM_PROMPT = `你是交通大學電物系「雷射導論」課程的 AI 助教。

你的角色：
- 幫助學生理解雷射物理的概念、公式推導、和物理意義
- 用繁體中文回答，專有名詞可附英文
- 數學公式用 LaTeX 格式：行內 $...$ 或獨立 $$...$$
- 回答時引用具體的教材內容（Week 幾、哪個章節）

重要原則：
1. 優先根據提供的教材內容回答。如果教材中沒有相關內容，可以使用 webSearch 工具搜尋網路補充，但要標明來源
2. 如果檢索到標記為 ⚠️ 反例的內容，務必向學生說明那是錯誤示範，並解釋為什麼是錯的
3. 推導公式時，保持完整的邏輯鏈，不跳步驟
4. 如果學生的理解有誤，溫和地指出並引導到正確概念
5. 適時鼓勵學生，讓學習過程有正向回饋

以下是從教材中檢索到的相關內容：

{context}`;

export async function POST(req: Request) {
  const { messages, studentId } = await req.json();

  // Lazy-create anonymous student profile if needed
  if (studentId) {
    const supabase = createServiceClient();
    await supabase.from("student_profiles").upsert(
      { id: studentId, display_name: "匿名同學" },
      { onConflict: "id" },
    );
  }

  // v6 DefaultChatTransport sends UIMessage format (parts[]) — extract query text
  const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const query =
    typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : (lastUserMessage?.parts as { type: string; text: string }[] | undefined)
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "";

  const chunks = await retrieveChunks(query);
  const context = formatChunksForPrompt(chunks);
  const chunkIds = chunks.map((c) => c.id);

  // Convert UIMessages → ModelMessages for streamText (with fallback for robustness)
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch {
    // Fallback: manually build model messages from parts
    modelMessages = messages.map((m: { role: string; parts?: { type: string; text: string }[]; content?: string }) => {
      const text = m.parts?.filter(p => p.type === "text").map(p => p.text).join("") ?? m.content ?? "";
      return { role: m.role as "user" | "assistant", content: text };
    });
  }

  const result = streamText({
    model: google(process.env.CHAT_MODEL ?? "gemini-2.5-flash"),
    system: SYSTEM_PROMPT.replace("{context}", context),
    messages: modelMessages,
    tools: {
      updateStudentModel: tool({
        description:
          "After answering, assess the student's understanding and update their learning profile. " +
          "Call this silently after every substantive answer.",
        inputSchema: z.object({
          concept: z.string().describe("The physics concept discussed (e.g., 'Planck_Law', 'Rate_Equation', 'Gaussian_Beam')"),
          masteryScore: z.number().min(0).max(1).describe("Estimated mastery: 0=no understanding, 0.5=partial, 1=solid"),
          misconception: z.string().optional().describe("Any misconception detected in the student's question, or null"),
        }),
        execute: async ({ concept, masteryScore, misconception }) => {
          if (!studentId) return { status: "skipped" };

          const supabase = createServiceClient();
          const { error } = await supabase.from("student_state").upsert(
            {
              student_id: studentId,
              concept,
              mastery_score: masteryScore,
              attempt_count: 1,
              last_misconception: misconception ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "student_id,concept" },
          );

          if (error) console.error("Student model update error:", error);
          return { status: error ? "error" : "updated" };
        },
      }),
      webSearch: tool({
        description:
          "Search the web for laser physics or related topics when the lecture materials don't cover the student's question. " +
          "Use this for supplementary information, recent developments, or topics beyond the course scope.",
        inputSchema: z.object({
          query: z.string().describe("Search query in English for better results"),
        }),
        execute: async ({ query: searchQuery }) => {
          const apiKey = process.env.BRAVE_SEARCH_API_KEY;
          if (!apiKey) return { results: [], error: "Web search not configured" };

          const res = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=3`,
            { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } },
          );

          if (!res.ok) return { results: [], error: res.statusText };

          const data = await res.json();
          return {
            results: (data.web?.results ?? []).slice(0, 3).map((r: { title: string; url: string; description: string }) => ({
              title: r.title,
              url: r.url,
              snippet: r.description,
            })),
          };
        },
      }),
    },
    onFinish: async ({ text }) => {
      if (!studentId || !text) return;
      const supabase = createServiceClient();
      await supabase.from("chat_messages").insert([
        { student_id: studentId, role: "user", content: query, chunks_used: chunkIds },
        { student_id: studentId, role: "assistant", content: text, chunks_used: chunkIds },
      ]);
    },
  });

  return result.toUIMessageStreamResponse();
}
