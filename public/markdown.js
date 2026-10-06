function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value) {
  let html = escapeHtml(value);
  const protectedParts = [];
  const protect = (part) => {
    const token = `\u0000${protectedParts.length}\u0000`;
    protectedParts.push(part);
    return token;
  };

  html = html.replace(/`([^`]+)`/g, (_, code) => protect(`<code>${code}</code>`));
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => (
    protect(`<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`)
  ));
  html = html.replace(/\*\*([^*]+)\*\*/g, (_, text) => protect(`<strong>${text}</strong>`));
  html = html.replace(/~~([^~]+)~~/g, (_, text) => protect(`<del>${text}</del>`));
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, text) => protect(`<em>${text}</em>`));

  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => protectedParts[Number(index)]);
}

export function renderMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const tag = list.type === "ordered" ? "ol" : "ul";
    output.push(`<${tag}>${list.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
    list = null;
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    output.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
    quote = [];
  };

  const flushOpenBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    if (code) {
      if (/^\s*```/.test(line)) {
        output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }

    if (/^\s*```/.test(line)) {
      flushOpenBlocks();
      code = [];
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushOpenBlocks();
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushOpenBlocks();
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const type = unordered ? "unordered" : "ordered";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((unordered || ordered)[1]);
      continue;
    }

    const quoteLine = line.match(/^\s*>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (code) output.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  flushOpenBlocks();
  return output.join("");
}
