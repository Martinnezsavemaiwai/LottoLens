/**
 * parseInlineMarkup — parses inline **bold** and `code` markdown into JSX
 */
export function parseInlineMarkup(text) {
  if (!text) return [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} style={{ color: "var(--accent3)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} style={{ 
          background: "rgba(255,255,255,0.08)", 
          padding: "2px 6px", 
          borderRadius: 4, 
          fontFamily: "monospace",
          fontSize: "0.9em",
          color: "var(--gold)"
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * renderMarkdown — renders basic markdown (headers, bullets, numbered lists,
 * paragraphs) into styled React elements using parseInlineMarkup for inline markup.
 */
export function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const renderedElements = [];

  lines.forEach((line, index) => {
    if (!line.trim()) {
      renderedElements.push(<div key={`empty-${index}`} style={{ height: "10px" }} />);
      return;
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const fontSize = level === 1 ? "1.4rem" : level === 2 ? "1.2rem" : "1.05rem";
      renderedElements.push(
        <div key={`h-${index}`} style={{ 
          fontWeight: 800, 
          fontSize, 
          marginTop: "14px", 
          marginBottom: "6px", 
          color: "var(--accent3)",
          fontFamily: "Chakra Petch, sans-serif"
        }}>
          {parseInlineMarkup(content)}
        </div>
      );
      return;
    }

    const listMatch = line.match(/^(\s*)([*•-]\s+)(.*)/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const content = listMatch[3];
      const paddingLeft = indent > 0 ? `${indent * 8 + 14}px` : "14px";
      renderedElements.push(
        <div key={`li-${index}`} style={{ 
          paddingLeft, 
          position: "relative", 
          marginBottom: "6px",
          lineHeight: "1.65",
          color: "var(--txt2)"
        }}>
          <span style={{ 
            position: "absolute", 
            left: indent > 0 ? `${indent * 8}px` : "0px", 
            color: "var(--accent)",
            fontWeight: "bold"
          }}>•</span>
          {parseInlineMarkup(content)}
        </div>
      );
      return;
    }

    const numListMatch = line.match(/^(\s*)(\d+\.\s+)(.*)/);
    if (numListMatch) {
      const indent = numListMatch[1].length;
      const marker = numListMatch[2];
      const content = numListMatch[3];
      const paddingLeft = indent > 0 ? `${indent * 8 + 20}px` : "20px";
      renderedElements.push(
        <div key={`nli-${index}`} style={{ 
          paddingLeft, 
          position: "relative", 
          marginBottom: "6px",
          lineHeight: "1.65",
          color: "var(--txt2)"
        }}>
          <span style={{ 
            position: "absolute", 
            left: indent > 0 ? `${indent * 8}px` : "0px", 
            color: "var(--accent)",
            fontFamily: "Chakra Petch, sans-serif",
            fontSize: "0.95em",
            fontWeight: 600
          }}>{marker}</span>
          {parseInlineMarkup(content)}
        </div>
      );
      return;
    }

    renderedElements.push(
      <p key={`p-${index}`} style={{ margin: "0 0 8px 0", lineHeight: "1.65", color: "var(--txt)" }}>
        {parseInlineMarkup(line)}
      </p>
    );
  });

  return <div style={{ display: "flex", flexDirection: "column" }}>{renderedElements}</div>;
}
