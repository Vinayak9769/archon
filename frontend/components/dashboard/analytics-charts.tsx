"use client";

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { analyticsData, findingsByCategory } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-[#111113] border-zinc-800/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Analyses Over Time</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Last 7 days · all repos</p>
          </div>
          <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">24 total</Badge>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={analyticsData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="analysesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 6, fontSize: 11 }} labelStyle={{ color: "#a1a1aa" }} />
            <Area type="monotone" dataKey="analyses" stroke="#6366f1" strokeWidth={2} fill="url(#analysesGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-[#111113] border-zinc-800/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Findings by Category</h2>
            <p className="text-xs text-zinc-500 mt-0.5">All analyses · current sprint</p>
          </div>
          <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">41 open</Badge>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={findingsByCategory} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="category" type="category" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 6, fontSize: 11 }} labelStyle={{ color: "#a1a1aa" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
