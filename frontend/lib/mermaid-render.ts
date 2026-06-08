/**
 * Server-side Mermaid SVG generation using jsdom to polyfill browser globals.
 * Called from Server Components — no client-side JS required.
 */
export async function renderMermaidSVG(diagramCode: string): Promise<string> {
  try {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM("<!DOCTYPE html><html><body><div id='mermaid-root'></div></body></html>", {
      pretendToBeVisual: true,
    });

    const { window } = dom;

    // Polyfill globals that mermaid expects
    const g = global as Record<string, unknown>;
    g.window = window;
    g.document = window.document;
    g.navigator = window.navigator;
    g.location = window.location;
    g.DOMParser = window.DOMParser;
    g.HTMLElement = window.HTMLElement;
    g.SVGElement = window.SVGElement;

    const mermaid = (await import("mermaid")).default;

    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      darkMode: true,
      themeVariables: {
        primaryColor: "#6366f1",
        primaryTextColor: "#f8fafc",
        primaryBorderColor: "#4f46e5",
        lineColor: "#52525b",
        secondaryColor: "#18181b",
        tertiaryColor: "#111113",
        background: "#0a0a0b",
        mainBkg: "#18181b",
        nodeBorder: "#3f3f46",
        clusterBkg: "#111113",
        titleColor: "#a1a1aa",
        edgeLabelBackground: "#18181b",
      },
      fontFamily: "ui-monospace, 'Geist Mono', monospace",
    });

    const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { svg } = await mermaid.render(uniqueId, diagramCode);

    return svg;
  } catch (err) {
    console.error("Mermaid render error:", err);
    // Return a fallback SVG on failure
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120">
      <rect width="600" height="120" fill="#111113" rx="8"/>
      <text x="300" y="55" text-anchor="middle" fill="#52525b" font-family="monospace" font-size="14">Diagram rendering failed</text>
      <text x="300" y="78" text-anchor="middle" fill="#3f3f46" font-family="monospace" font-size="12">${String(err).slice(0, 60)}</text>
    </svg>`;
  }
}
