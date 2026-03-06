"use client";

import { useState, useMemo } from "react";

/* ─── Concept Graph Data ─── */

interface ConceptNode {
  id: string;
  label: string;
  week: number;
  category: "optics" | "quantum" | "laser" | "resonator";
  x: number;
  y: number;
}

interface ConceptEdge {
  from: string;
  to: string;
}

const NODES: ConceptNode[] = [
  // Optics row (top)
  { id: "huygens", label: "Huygens 原理", week: 4, category: "optics", x: 80, y: 60 },
  { id: "gaussian", label: "高斯光束", week: 4, category: "optics", x: 280, y: 60 },
  { id: "curvature", label: "曲率匹配", week: 5, category: "optics", x: 480, y: 60 },
  { id: "fourier", label: "傅立葉光學", week: 6, category: "optics", x: 280, y: 160 },

  // Resonator row (middle-top)
  { id: "ray_tracing", label: "光線追跡", week: 3, category: "resonator", x: 80, y: 260 },
  { id: "stable_res", label: "穩定共振腔", week: 3, category: "resonator", x: 280, y: 260 },
  { id: "res_modes", label: "共振腔模態", week: 6, category: "resonator", x: 480, y: 260 },
  { id: "fabry_perot", label: "Fabry-Perot", week: 7, category: "resonator", x: 680, y: 160 },

  // Quantum row (middle-bottom)
  { id: "planck", label: "Planck 定律", week: 9, category: "quantum", x: 80, y: 380 },
  { id: "einstein", label: "Einstein 模型", week: 9, category: "quantum", x: 280, y: 380 },
  { id: "semiclassical", label: "半經典模型", week: 10, category: "quantum", x: 480, y: 380 },
  { id: "electron_spring", label: "電子彈簧模型", week: 10, category: "quantum", x: 680, y: 380 },

  // Laser row (bottom)
  { id: "gain", label: "增益與損耗", week: 11, category: "laser", x: 280, y: 490 },
  { id: "rate_eq", label: "速率方程式", week: 12, category: "laser", x: 480, y: 490 },
  { id: "threshold", label: "閾值條件", week: 13, category: "laser", x: 630, y: 490 },
  { id: "output_power", label: "輸出功率", week: 14, category: "laser", x: 780, y: 490 },
];

const EDGES: ConceptEdge[] = [
  { from: "huygens", to: "gaussian" },
  { from: "gaussian", to: "curvature" },
  { from: "gaussian", to: "fabry_perot" },
  { from: "ray_tracing", to: "stable_res" },
  { from: "stable_res", to: "res_modes" },
  { from: "fourier", to: "res_modes" },
  { from: "planck", to: "einstein" },
  { from: "einstein", to: "semiclassical" },
  { from: "einstein", to: "rate_eq" },
  { from: "electron_spring", to: "gain" },
  { from: "gain", to: "rate_eq" },
  { from: "rate_eq", to: "threshold" },
  { from: "threshold", to: "output_power" },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  optics: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", label: "光學基礎" },
  resonator: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", label: "共振腔" },
  quantum: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", label: "量子模型" },
  laser: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", label: "雷射物理" },
};

const CATEGORY_ORDER: Array<ConceptNode["category"]> = ["optics", "resonator", "quantum", "laser"];

/* ─── Component ─── */

interface KnowledgeGraphProps {
  onBack: () => void;
  onNavigate?: (mode: string, week: number) => void;
}

export function KnowledgeGraph({ onBack, onNavigate }: KnowledgeGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const m = new Map<string, ConceptNode>();
    NODES.forEach((n) => m.set(n.id, n));
    return m;
  }, []);

  // Find connected nodes for highlighting
  const connectedNodes = useMemo(() => {
    const active = hoveredNode ?? selectedNode;
    if (!active) return new Set<string>();
    const connected = new Set<string>([active]);
    EDGES.forEach((e) => {
      if (e.from === active) connected.add(e.to);
      if (e.to === active) connected.add(e.from);
    });
    return connected;
  }, [hoveredNode, selectedNode]);

  const selectedNodeData = selectedNode ? nodeMap.get(selectedNode) : null;

  const svgWidth = 900;
  const svgHeight = 560;

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
        <span className="text-xl">🧠</span>
        <h1 className="text-lg font-semibold text-slate-800">概念知識圖譜</h1>
        <span className="text-xs text-slate-400 ml-auto">NYCU 電物系</span>
      </header>

      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-center">
            {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${val.bg} border ${val.border}`} />
                <span className="text-xs text-slate-600">{val.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead-legend)" /><defs><marker id="arrowhead-legend" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#94a3b8" /></marker></defs></svg>
              <span className="text-xs text-slate-600">先修關係</span>
            </div>
          </div>

          {/* ── Desktop: SVG Graph ── */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full"
              style={{ maxHeight: "60vh" }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                </marker>
                <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
                </marker>
              </defs>

              {/* Edges */}
              {EDGES.map((edge) => {
                const from = nodeMap.get(edge.from)!;
                const to = nodeMap.get(edge.to)!;
                const active = hoveredNode ?? selectedNode;
                const isActive = active && (edge.from === active || edge.to === active);

                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const offsetStart = 55;
                const offsetEnd = 55;
                const x1 = from.x + (dx / len) * offsetStart;
                const y1 = from.y + (dy / len) * offsetStart;
                const x2 = to.x - (dx / len) * offsetEnd;
                const y2 = to.y - (dy / len) * offsetEnd;

                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isActive ? "#6366f1" : "#cbd5e1"}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                    opacity={active && !isActive ? 0.2 : 1}
                    className="transition-all duration-200"
                  />
                );
              })}

              {/* Nodes */}
              {NODES.map((node) => {
                const active = hoveredNode ?? selectedNode;
                const isHighlighted = !active || connectedNodes.has(node.id);
                const isSelected = selectedNode === node.id;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                    opacity={isHighlighted ? 1 : 0.25}
                  >
                    <rect
                      x={node.x - 52}
                      y={node.y - 22}
                      width={104}
                      height={44}
                      rx={12}
                      fill={isSelected ? "#eef2ff" : "white"}
                      stroke={isSelected ? "#6366f1" : "#e2e8f0"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-all duration-200"
                    />
                    <text
                      x={node.x}
                      y={node.y - 3}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill="#334155"
                    >
                      {node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 13}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#94a3b8"
                    >
                      Week {node.week}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── Mobile: Card-based list ── */}
          <div className="md:hidden space-y-4">
            {CATEGORY_ORDER.map((cat) => {
              const colors = CATEGORY_COLORS[cat];
              const catNodes = NODES.filter((n) => n.category === cat);
              return (
                <div key={cat} className={`${colors.bg} border ${colors.border} rounded-2xl p-4`}>
                  <h3 className={`text-sm font-semibold ${colors.text} mb-3`}>{colors.label}</h3>
                  <div className="space-y-2">
                    {catNodes.map((node) => {
                      const isSelected = selectedNode === node.id;
                      const prereqs = EDGES.filter((e) => e.to === node.id).map((e) => nodeMap.get(e.from)!);
                      const nexts = EDGES.filter((e) => e.from === node.id).map((e) => nodeMap.get(e.to)!);
                      return (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNode(isSelected ? null : node.id)}
                          className={`w-full text-left rounded-xl px-4 py-3 transition-all duration-200 ${
                            isSelected
                              ? "bg-white ring-2 ring-indigo-400 shadow-sm"
                              : "bg-white/70 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-800 text-sm">{node.label}</span>
                            <span className="text-xs text-slate-400">W{node.week}</span>
                          </div>
                          {isSelected && (
                            <div className="mt-2 space-y-1.5 text-xs">
                              {prereqs.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-slate-500">先修：</span>
                                  {prereqs.map((n) => (
                                    <span
                                      key={n.id}
                                      onClick={(e) => { e.stopPropagation(); setSelectedNode(n.id); }}
                                      className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer"
                                    >
                                      {n.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {nexts.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-slate-500">後續：</span>
                                  {nexts.map((n) => (
                                    <span
                                      key={n.id}
                                      onClick={(e) => { e.stopPropagation(); setSelectedNode(n.id); }}
                                      className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer"
                                    >
                                      {n.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {prereqs.length === 0 && nexts.length === 0 && (
                                <span className="text-slate-400">獨立概念</span>
                              )}
                              {onNavigate && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onNavigate("teaching", node.week); }}
                                  className="mt-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                                >
                                  前往 Week {node.week} 教學
                                </button>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected node detail — desktop only */}
          {selectedNodeData && (
            <div className={`hidden md:block ${CATEGORY_COLORS[selectedNodeData.category].bg} border ${CATEGORY_COLORS[selectedNodeData.category].border} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-base font-semibold ${CATEGORY_COLORS[selectedNodeData.category].text}`}>
                  {selectedNodeData.label}
                </h3>
                <span className="text-xs text-slate-500">Week {selectedNodeData.week}</span>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div>
                  <span className="font-medium">先修概念：</span>
                  {EDGES.filter((e) => e.to === selectedNodeData.id).length === 0 ? (
                    <span className="text-slate-400">無（起始概念）</span>
                  ) : (
                    EDGES.filter((e) => e.to === selectedNodeData.id).map((e) => {
                      const n = nodeMap.get(e.from)!;
                      return (
                        <button
                          key={e.from}
                          onClick={() => setSelectedNode(e.from)}
                          className="inline-block ml-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs hover:border-indigo-300 transition-colors"
                        >
                          {n.label}
                        </button>
                      );
                    })
                  )}
                </div>

                <div>
                  <span className="font-medium">後續概念：</span>
                  {EDGES.filter((e) => e.from === selectedNodeData.id).length === 0 ? (
                    <span className="text-slate-400">無（終端概念）</span>
                  ) : (
                    EDGES.filter((e) => e.from === selectedNodeData.id).map((e) => {
                      const n = nodeMap.get(e.to)!;
                      return (
                        <button
                          key={e.to}
                          onClick={() => setSelectedNode(e.to)}
                          className="inline-block ml-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs hover:border-indigo-300 transition-colors"
                        >
                          {n.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate("teaching", selectedNodeData.week)}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  前往 Week {selectedNodeData.week} 教學
                </button>
              )}
            </div>
          )}

          {/* Instructions */}
          {!selectedNode && (
            <div className="text-center text-sm text-slate-400 pb-4">
              點擊任一概念節點查看詳情與先後關係
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
