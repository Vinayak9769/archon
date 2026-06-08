"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  type NodeTypes, type Node, type Edge, BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { archNodes, archEdges, mermaidDiagram } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Server, Database, Cloud, GitBranch, Layers, Filter,
  ZoomIn, ZoomOut, Maximize2, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";

const healthColors = {
  healthy: { text: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/40", dot: "bg-green-500" },
  warning: { text: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40", dot: "bg-amber-500" },
  critical: { text: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/40", dot: "bg-red-500" },
};

const typeIcons: Record<string, React.ElementType> = {
  service: Server, database: Database, cache: Database, external: Cloud, queue: Layers,
};

function ServiceNode({ data }: { data: { label: string; type: string; health: string; layer: string } }) {
  const hc = healthColors[data.health as keyof typeof healthColors] || healthColors.healthy;
  const Icon = typeIcons[data.type] || Server;
  return (
    <div className={cn("px-3 py-2.5 rounded-lg border min-w-[130px]", "bg-[#18181b]", hc.border, "shadow-lg")}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !border-zinc-700 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", hc.bg)}>
          <Icon className={cn("w-3.5 h-3.5", hc.text)} />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-200 leading-tight">{data.label}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", hc.dot)} />
            <span className="text-[10px] text-zinc-500 capitalize">{data.health}</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !border-zinc-700 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes: NodeTypes = { serviceNode: ServiceNode };

const rfNodes: Node[] = archNodes.map(n => ({
  id: n.id,
  type: "serviceNode",
  position: { x: n.x, y: n.y },
  data: { label: n.label, type: n.type, health: n.health, layer: n.layer },
}));

const edgeStyleMap: Record<string, object> = {
  rest: { stroke: "#6366f1", strokeWidth: 1.5 },
  db: { stroke: "#3b82f6", strokeWidth: 1.5, strokeDasharray: "4 2" },
  cache: { stroke: "#22c55e", strokeWidth: 1.5, strokeDasharray: "2 2" },
  external: { stroke: "#f59e0b", strokeWidth: 1.5 },
  async: { stroke: "#8b5cf6", strokeWidth: 1.5, strokeDasharray: "6 3" },
};

const rfEdges: Edge[] = archEdges.map(e => ({
  id: e.id,
  source: e.source,
  target: e.target,
  label: e.label,
  labelStyle: { fill: "#71717a", fontSize: 10, fontFamily: "ui-monospace" },
  labelBgStyle: { fill: "#18181b", fillOpacity: 0.8 },
  style: edgeStyleMap[e.type] || {},
  animated: e.type === "async",
}));

function MermaidViewer() {
  return (
    <div className="p-6">
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-4 mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Diagram Source</p>
        <pre className="text-xs text-zinc-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{mermaidDiagram}</pre>
      </div>
      <div className="bg-[#111113] rounded-xl border border-zinc-800 p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="flex items-center gap-2 flex-wrap justify-center gap-y-3">
            {[
              { label: "API Gateway", color: "bg-indigo-500" },
              { label: "Auth Service", color: "bg-amber-500" },
              { label: "Payment Service", color: "bg-red-500" },
              { label: "Notification Svc", color: "bg-green-500" },
            ].map(n => (
              <div key={n.label} className={cn("px-3 py-1.5 rounded-md text-white text-xs font-medium", n.color)}>{n.label}</div>
            ))}
          </div>
          <div className="mt-4 flex flex-col items-center gap-1">
            {[
              { from: "API Gateway", to: "Auth Service", via: "REST", color: "border-indigo-500" },
              { from: "API Gateway", to: "Payment Service", via: "REST", color: "border-indigo-500" },
              { from: "Payment Service", to: "PostgreSQL", via: "JDBC", color: "border-blue-500" },
              { from: "Payment Service", to: "Redis", via: "Cache", color: "border-green-500" },
              { from: "Payment Service", to: "Stripe API", via: "HTTPS", color: "border-amber-500" },
              { from: "Notification Svc", to: "Kafka", via: "Produce", color: "border-purple-500" },
            ].map((e, i) => (
              <div key={i} className={cn("text-[11px] font-mono px-3 py-1 rounded border", e.color, "text-zinc-400 bg-zinc-900/50")}>
                {e.from} →<span className="text-zinc-600 mx-1">[{e.via}]</span>→ {e.to}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  const [selectedNode, setSelectedNode] = useState<typeof archNodes[0] | null>(null);
  const [filters, setFilters] = useState<Record<string, boolean>>({ dbs: true, apis: true, queues: true });

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const found = archNodes.find(n => n.id === node.id);
    setSelectedNode(found || null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-zinc-800/60 bg-[#0a0a0b] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>
        {Object.entries(filters).map(([key, val]) => (
          <button key={key} onClick={() => setFilters(p => ({ ...p, [key]: !p[key] }))}
            className={cn("text-xs px-2.5 py-1 rounded-md border transition-all capitalize",
              val ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" : "border-zinc-800 text-zinc-600 hover:border-zinc-700")}>
            Show {key}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs">
          {[
            { color: "bg-indigo-500", label: "REST" },
            { color: "bg-blue-500", label: "DB" },
            { color: "bg-green-500", label: "Cache" },
            { color: "bg-purple-500", label: "Async" },
            { color: "bg-amber-500", label: "External" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-zinc-500">
              <div className={cn("w-8 h-0.5", color)} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <Tabs defaultValue="graph" className="flex flex-col flex-1 min-h-0">
          <div className="px-5 pt-3 border-b border-zinc-800/60 bg-[#0a0a0b]">
            <TabsList className="bg-zinc-900 border border-zinc-800 h-8">
              <TabsTrigger value="graph" className="text-xs h-6 gap-1.5"><GitBranch className="w-3 h-3" />Interactive Graph</TabsTrigger>
              <TabsTrigger value="mermaid" className="text-xs h-6 gap-1.5"><Layers className="w-3 h-3" />Mermaid Diagram</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="graph" className="flex flex-1 min-h-0 m-0">
            <div className="flex-1 relative" style={{ background: "#0a0a0b" }}>
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                className="archon-flow"
              >
                <Background color="#27272a" gap={24} size={1} variant={BackgroundVariant.Dots} />
                <Controls className="!bg-[#111113] !border-zinc-800 [&>button]:!bg-[#111113] [&>button]:!border-zinc-800 [&>button]:!text-zinc-400" />
                <MiniMap
                  className="!bg-[#111113] !border-zinc-800"
                  nodeColor={(n) => {
                    const data = n.data as { health: string };
                    return data.health === "healthy" ? "#22c55e" : data.health === "warning" ? "#f59e0b" : "#ef4444";
                  }}
                  maskColor="rgba(10,10,11,0.7)"
                />
              </ReactFlow>
            </div>

            {/* Node Inspector */}
            {selectedNode && (
              <div className="w-64 border-l border-zinc-800/60 bg-[#111113] p-4 flex-shrink-0 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-200">Node Inspector</h3>
                  <button onClick={() => setSelectedNode(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
                </div>
                <div className={cn("px-2.5 py-1.5 rounded-md border mb-3 text-xs font-medium",
                  healthColors[selectedNode.health as keyof typeof healthColors]?.text,
                  healthColors[selectedNode.health as keyof typeof healthColors]?.bg,
                  healthColors[selectedNode.health as keyof typeof healthColors]?.border)}>
                  {selectedNode.health === "healthy" ? <CheckCircle2 className="w-3 h-3 inline mr-1.5" />
                    : selectedNode.health === "warning" ? <AlertTriangle className="w-3 h-3 inline mr-1.5" />
                    : <XCircle className="w-3 h-3 inline mr-1.5" />}
                  {selectedNode.health.charAt(0).toUpperCase() + selectedNode.health.slice(1)}
                </div>
                {[
                  { label: "Name", value: selectedNode.label },
                  { label: "Type", value: selectedNode.type },
                  { label: "Layer", value: selectedNode.layer },
                  { label: "ID", value: selectedNode.id, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start justify-between py-2 border-b border-zinc-800/60 last:border-0">
                    <span className="text-xs text-zinc-600">{label}</span>
                    <span className={cn("text-xs text-zinc-300 capitalize text-right", mono && "font-mono text-[11px]")}>{value}</span>
                  </div>
                ))}
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Connections</p>
                  {archEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(e => (
                    <div key={e.id} className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                      <span className="text-zinc-600">{e.source === selectedNode.id ? "→" : "←"}</span>
                      <span>{e.source === selectedNode.id ? e.target : e.source}</span>
                      <Badge className="text-[9px] bg-zinc-800 text-zinc-500 border-zinc-700 ml-auto px-1">{e.label}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mermaid" className="flex-1 overflow-y-auto m-0">
            <MermaidViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
