"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Database, Key, ArrowRight, Layers, Table, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  primary_key?: boolean;
  description?: string;
  constraints?: string[]; // fallback
}

interface Constraint {
  name: string;
  type: string;
  definition: string;
}

interface TableData {
  name: string;
  description?: string;
  columns: Column[];
  constraints?: Constraint[];
}

interface Relationship {
  source_table: string;
  target_table: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  description?: string;
}

interface DatabaseSchemaVisualizerProps {
  tables: TableData[];
  relationships: Relationship[];
}

interface Point {
  x: number;
  y: number;
}

export default function DatabaseSchemaVisualizer({ tables, relationships }: DatabaseSchemaVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [lines, setLines] = useState<{ path: string; active: boolean; type: string; source: string; target: string }[]>([]);
  const [windowWidth, setWindowWidth] = useState(0);

  // Trigger line recalculations on mount, table hover/selection, or resize
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    relationships?.forEach((rel) => {
      const sourceEl = document.getElementById(`db-card-${rel.source_table}`);
      const targetEl = document.getElementById(`db-card-${rel.target_table}`);

      if (sourceEl && targetEl) {
        const srcRect = sourceEl.getBoundingClientRect();
        const tgtRect = targetEl.getBoundingClientRect();

        // Calculate connection points relative to visual container
        const x1 = srcRect.left - containerRect.left + srcRect.width / 2;
        const y1 = srcRect.top - containerRect.top + srcRect.height / 2;
        const x2 = tgtRect.left - containerRect.left + tgtRect.width / 2;
        const y2 = tgtRect.top - containerRect.top + tgtRect.height / 2;

        // Determine if line is highlighted
        const active =
          hoveredTable === rel.source_table ||
          hoveredTable === rel.target_table ||
          selectedTable === rel.source_table ||
          selectedTable === rel.target_table;

        // Draw a smooth curved bezier line between the cards
        // Using control points to bend the line slightly
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        let cx1 = x1;
        let cy1 = y1 + dy * 0.5;
        let cx2 = x2;
        let cy2 = y2 - dy * 0.5;

        if (dx > dy) {
          cx1 = x1 + dx * 0.4 * (x2 > x1 ? 1 : -1);
          cy1 = y1;
          cx2 = x2 - dx * 0.4 * (x2 > x1 ? 1 : -1);
          cy2 = y2;
        }

        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
        newLines.push({
          path,
          active,
          type: rel.relationship_type,
          source: rel.source_table,
          target: rel.target_table
        });
      }
    });

    setLines(newLines);
  }, [tables, relationships, hoveredTable, selectedTable, windowWidth]);

  // Determine if a column is a primary key
  const isColumnPrimaryKey = (col: Column) => {
    if (col.primary_key) return true;
    if (col.constraints?.some(c => c.toLowerCase().includes("primary"))) return true;
    return false;
  };

  // Check relationship connections
  const activeRelationships = useMemo(() => {
    const active = new Set<string>();
    const currentFocus = hoveredTable || selectedTable;
    if (!currentFocus) return active;

    relationships?.forEach((rel) => {
      if (rel.source_table === currentFocus) {
        active.add(rel.target_table);
      }
      if (rel.target_table === currentFocus) {
        active.add(rel.source_table);
      }
    });
    return active;
  }, [relationships, hoveredTable, selectedTable]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-950/20 px-3 py-2 border border-zinc-850 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Click a table to highlight its relationships. Hover cards to inspect foreign key links.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> PK</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Relationship</span>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="relative min-h-[600px] lg:min-h-[700px] bg-zinc-950/40 border border-zinc-850 rounded-xl p-8 overflow-hidden select-none"
      >
        {/* SVG connection overlay */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
          <defs>
            <linearGradient id="glowing-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Draw passive background lines first */}
          {lines.filter(l => !l.active).map((line, idx) => (
            <path
              key={`passive-${idx}`}
              d={line.path}
              fill="none"
              stroke="#27272a"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          ))}

          {/* Draw active highlighted lines on top */}
          {lines.filter(l => l.active).map((line, idx) => (
            <g key={`active-${idx}`}>
              <path
                d={line.path}
                fill="none"
                stroke="url(#glowing-gradient)"
                strokeWidth="2.5"
                filter="url(#glow)"
                className="animate-[dash_20s_linear_infinite]"
                style={{
                  strokeDasharray: "8 4",
                }}
              />
              {/* Animated pulse dot travelling along the relationship line */}
              <circle r="4" fill="#10b981">
                <animateMotion dur="3s" repeatCount="indefinite" path={line.path} />
              </circle>
            </g>
          ))}
        </svg>

        {/* Grid of database tables */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables?.map((table) => {
            const isSelected = selectedTable === table.name;
            const isHovered = hoveredTable === table.name;
            const hasFocus = hoveredTable !== null || selectedTable !== null;
            const isRelated = activeRelationships.has(table.name);

            // Calculate card opacity and highlights
            const isDimmed = hasFocus && !isSelected && !isHovered && !isRelated;
            const highlightGlow = isSelected || isHovered
              ? "border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
              : isRelated
              ? "border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/20"
              : "border-zinc-850 hover:border-zinc-700/60";

            return (
              <Card
                id={`db-card-${table.name}`}
                key={table.name}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTable(prev => prev === table.name ? null : table.name);
                }}
                onMouseEnter={() => setHoveredTable(table.name)}
                onMouseLeave={() => setHoveredTable(null)}
                className={cn(
                  "bg-zinc-950/90 p-4 transition-all duration-300 cursor-pointer flex flex-col h-fit select-none",
                  highlightGlow,
                  isDimmed && "opacity-35 scale-[0.98]"
                )}
              >
                {/* Table Header */}
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-2.5 mb-2.5">
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center border",
                    isSelected || isHovered 
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                      : isRelated
                      ? "bg-indigo-950/30 border-indigo-500/30 text-indigo-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  )}>
                    <Table className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100 font-mono tracking-tight">{table.name}</h4>
                    {table.description && (
                      <p className="text-[9px] text-zinc-550 truncate max-w-[150px]">{table.description}</p>
                    )}
                  </div>
                  {(isSelected || isHovered) && (
                    <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-900/30 text-[8px] ml-auto px-1 py-0 font-mono">
                      Active
                    </Badge>
                  )}
                </div>

                {/* Columns List */}
                <div className="space-y-1">
                  {table.columns?.map((col, cIdx) => {
                    const isPK = isColumnPrimaryKey(col);
                    return (
                      <div 
                        key={cIdx} 
                        className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-zinc-900/40 text-[10px] group/col"
                        title={col.description}
                      >
                        <div className="flex items-center gap-1.5">
                          {isPK ? (
                            <Key className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <span className="w-3 h-3 flex items-center justify-center text-zinc-650 flex-shrink-0">•</span>
                          )}
                          <span className={cn(
                            "font-semibold font-mono",
                            isPK ? "text-emerald-350" : "text-zinc-300"
                          )}>
                            {col.name}
                          </span>
                        </div>
                        <span className="text-zinc-500 font-mono text-[9px]">{col.type}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Constraints Fallback Summary if present */}
                {table.constraints && table.constraints.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-900 flex flex-wrap gap-1">
                    {table.constraints.map((c, idx) => (
                      <span key={idx} className="text-[8px] bg-zinc-900 text-zinc-500 px-1 py-0.5 rounded font-mono">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
