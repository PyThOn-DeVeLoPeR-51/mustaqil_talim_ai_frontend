import type { ReactNode } from "react";

type MarkdownMessageProps = {
  content: string;
};

type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "ordered-list"; items: string[]; start: number }
  | { type: "unordered-list"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; language: string | null; content: string };

const inlineTokenPatternSource =
  "(`[^`\\n]+`|\\*\\*[\\s\\S]+?\\*\\*|__[\\s\\S]+?__|\\*[^*\\n]+?\\*|_[^_\\n]+?_|\\[[^\\]]+\\]\\([^)]+\\))";

function safeHref(value: string) {
  const href = value.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href;
  return null;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  const inlineTokenPattern = new RegExp(inlineTokenPatternSource, "g");

  while ((match = inlineTokenPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInline(token.slice(2, -2), `${key}-strong`)}
        </strong>,
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push(
        <em key={key}>{renderInline(token.slice(1, -1), `${key}-em`)}</em>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = linkMatch?.[1] ?? token;
      const href = linkMatch ? safeHref(linkMatch[2]) : null;

      nodes.push(
        href ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-primary underline underline-offset-4"
          >
            {renderInline(label, `${key}-link`)}
          </a>
        ) : (
          <span key={key}>{label}</span>
        ),
      );
    } else {
      nodes.push(token);
    }

    cursor = match.index + token.length;
    tokenIndex += 1;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function isBlockStart(line: string) {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^[-+*]\s+/.test(line) ||
    /^>\s?/.test(line)
  );
}

function parseBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenceMatch = line.match(/^```\s*([^\s`]*)\s*$/);
    if (fenceMatch) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        type: "code",
        language: fenceMatch[1] || null,
        content: codeLines.join("\n"),
      });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];
      const start = Number(orderedMatch[1]);
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\d+\.\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        index += 1;
      }
      blocks.push({ type: "ordered-list", items, start });
      continue;
    }

    const unorderedMatch = line.match(/^[-+*]\s+(.+)$/);
    if (unorderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^[-+*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      (paragraphLines.length === 0 || !isBlockStart(lines[index]))
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
    } else {
      // Noto‘liq streaming markdown blokida cheksiz siklning oldini oladi.
      blocks.push({ type: "paragraph", lines: [line] });
      index += 1;
    }
  }

  return blocks;
}

function Heading({ level, children }: { level: number; children: ReactNode }) {
  const className =
    level <= 2
      ? "font-semibold text-base leading-7"
      : "font-semibold text-sm leading-6";

  if (level === 1) return <h2 className={className}>{children}</h2>;
  if (level === 2) return <h3 className={className}>{children}</h3>;
  return <h4 className={className}>{children}</h4>;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 break-words">
      {blocks.map((block, blockIndex) => {
        const key = `${block.type}-${blockIndex}`;

        if (block.type === "heading") {
          return (
            <Heading key={key} level={block.level}>
              {renderInline(block.text, key)}
            </Heading>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol
              key={key}
              start={block.start}
              className="list-decimal space-y-1.5 pl-5 marker:font-medium"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="pl-1">
                  {renderInline(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={key} className="list-disc space-y-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="pl-1">
                  {renderInline(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
            >
              {block.lines.map((line, lineIndex) => (
                <span key={`${key}-${lineIndex}`}>
                  {renderInline(line, `${key}-${lineIndex}`)}
                  {lineIndex < block.lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={key}
              className="max-w-full overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-5"
            >
              <code data-language={block.language ?? undefined}>
                {block.content}
              </code>
            </pre>
          );
        }

        return (
          <p key={key} className="leading-6">
            {block.lines.map((line, lineIndex) => (
              <span key={`${key}-${lineIndex}`}>
                {renderInline(line, `${key}-${lineIndex}`)}
                {lineIndex < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
