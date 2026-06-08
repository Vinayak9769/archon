"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// Counter for unique rendering IDs
let diagramIdCounter = 0;

interface MermaidVisualizerProps {
  chart: string;
}

export default function MermaidVisualizer({ chart }: MermaidVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mermaid inside useEffect to ensure it only runs client-side
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "var(--font-sans, Inter, sans-serif)",
      themeVariables: {
        background: "transparent",
        primaryColor: "#312e81", // Indigo 900
        primaryTextColor: "#f4f4f5", // Zinc 100
        lineColor: "#52525b", // Zinc 600
        secondaryColor: "#1e1b4b", // Indigo 950
        tertiaryColor: "#09090b", // Zinc 950
      },
    });
  }, []);

  useEffect(() => {
    if (!chart) return;

    let isMounted = true;
    const id = `mermaid-diag-${++diagramIdCounter}`;

    const renderChart = async () => {
      try {
        setError(null);
        let cleanChart = chart.trim();

        // Render diagram
        const { svg } = await mermaid.render(id, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error("Mermaid parsing error:", err);
        if (isMounted) {
          setError("Failed to render diagram visually. Showing raw source instead.");
        }
        // Cleanup erroneous elements that mermaid adds to DOM
        try {
          const badSvg = document.getElementById(id);
          if (badSvg) badSvg.remove();
        } catch {}
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-4">
        <p className="text-[10px] text-red-400 font-sans font-medium mb-2">{error}</p>
        <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre bg-zinc-950/60 rounded-lg p-4 border border-zinc-850 overflow-x-auto leading-relaxed max-h-[40vh]">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-zinc-850 rounded-xl bg-zinc-950/20">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-[10px] text-zinc-500 font-medium">Generating visual diagram...</span>
      </div>
    );
  }

  return (
    <div className="w-full border border-zinc-850 rounded-xl bg-zinc-950/40 p-6 shadow-inner overflow-auto flex justify-center items-center">
      <div 
        ref={containerRef}
        className="w-full flex justify-center mermaid-svg-container"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
