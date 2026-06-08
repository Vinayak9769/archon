"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Layers, Activity, Database, Zap,
  Play, ExternalLink, Terminal, Shield, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";

const TEMPLATES = [
  {
    id: "url-shortener",
    title: "URL Shortener (TinyURL)",
    desc: "Low-latency key-value routing blueprint with active write-through Redis caching layers.",
    scale: { dau: "5M Active", qps: "10,000 requests/sec", storage: "200 GB / month" },
    tech: ["PostgreSQL (Master-Replica)", "Redis Cluster", "Base62 Encoding Service"],
    color: "text-indigo-400 border-indigo-500/10 bg-indigo-500/5",
  },
  {
    id: "chat-application",
    title: "Chat Application (WhatsApp/Slack)",
    desc: "Real-time bi-directional message routing mapping persistent active WebSocket sessions.",
    scale: { dau: "25M Active", qps: "150,000 messages/sec", storage: "4.5 TB / month" },
    tech: ["Apache Cassandra", "WebSockets Gateway", "Kafka Event Bus"],
    color: "text-purple-400 border-purple-500/10 bg-purple-500/5",
  },
  {
    id: "video-streaming",
    title: "Video Streaming Platform (Netflix)",
    desc: "Massive scale microservices architecture featuring CDN edge nodes and async video transcoders.",
    scale: { dau: "100M Active", qps: "2.5M streams/sec", storage: "800 TB / month" },
    tech: ["AWS CloudFront CDN", "Amazon S3 Store", "Redis User Catalog Cache"],
    color: "text-red-400 border-red-500/10 bg-red-500/5",
  },
  {
    id: "ride-sharing",
    title: "Ride Sharing Platform (Uber)",
    desc: "High-frequency geospatial location tracking and instant driver matching dispatcher.",
    scale: { dau: "15M Active", qps: "35,000 matches/sec", storage: "1.8 TB / month" },
    tech: ["Redis Geospatial", "Kafka Stream engine", "PostgreSQL (Sharded)"],
    color: "text-amber-400 border-amber-500/10 bg-amber-500/5",
  },
  {
    id: "e-commerce",
    title: "E-Commerce System (Amazon)",
    desc: "Highly transactional ACID compliant cart caches and inventory synchronization patterns.",
    scale: { dau: "40M Active", qps: "85,000 transactions/sec", storage: "3.2 TB / month" },
    tech: ["DynamoDB", "RabbitMQ Message broker", "Elasticsearch Catalog"],
    color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5",
  }
];

export default function TemplatesPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 relative selection:bg-indigo-500/30">
      
      {/* Background glow backdrops */}
      <div className="absolute top-[-5%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="pb-4 border-b border-zinc-900 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-400 mb-2.5 tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Interactive Prototypes
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Prebuilt System Design Templates</h1>
          <p className="text-sm text-zinc-400 mt-1">Spin up production-grade system designs instantly for reviews, prototyping, or blueprint demos.</p>
        </div>
        
        <Button 
          onClick={() => router.push("/analyses/new")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 rounded-lg gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
        >
          Create Custom Design <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATES.map(tpl => (
          <Card 
            key={tpl.id} 
            className="bg-[#0b0b0d]/80 border-zinc-850 p-5 space-y-5 hover:border-zinc-700/80 transition-all flex flex-col justify-between group cursor-pointer shadow-xl shadow-black/20"
            onClick={() => router.push("/analyses/anl_01")} // Redirect to completedpayments-service review workspace
          >
            <div className="space-y-3.5">
              
              {/* Card Title & Icon */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{tpl.title}</h3>
                  <p className="text-xs text-zinc-550 leading-relaxed">{tpl.desc}</p>
                </div>
              </div>

              {/* Specifications block */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="space-y-0.5 border-r border-zinc-900">
                  <div className="text-zinc-600 uppercase text-[8px] tracking-wider">DAU</div>
                  <div className="text-zinc-300 font-bold">{tpl.scale.dau}</div>
                </div>
                <div className="space-y-0.5 border-r border-zinc-900">
                  <div className="text-zinc-600 uppercase text-[8px] tracking-wider">QPS</div>
                  <div className="text-zinc-300 font-bold truncate px-1">{tpl.scale.qps}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-zinc-600 uppercase text-[8px] tracking-wider">Storage</div>
                  <div className="text-zinc-300 font-bold">{tpl.scale.storage}</div>
                </div>
              </div>

              {/* Technologies */}
              <div className="space-y-1.5">
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Platform Nodes</div>
                <div className="flex flex-wrap gap-1">
                  {tpl.tech.map((t, idx) => (
                    <Badge key={idx} className="text-[9px] bg-zinc-900 border border-zinc-800/80 text-zinc-400 px-1.5 py-0">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

            </div>

            {/* Launch CTA */}
            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Play className="w-3 h-3 fill-current" />
                Launch Demo Sandbox
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

          </Card>
        ))}
      </div>

    </div>
  );
}
