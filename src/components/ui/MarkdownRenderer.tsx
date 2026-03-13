'use client';

import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight markdown renderer (no external deps).
 * Supports: **bold**, *italic*, ## headings, - lists, [links](url), `code`.
 */
export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = renderMarkdown(content);
  return (
    <div
      className={cn('prose-sm prose-invert max-w-none leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Headings
    if (trimmed.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h4 class="text-sm font-black mt-3 mb-1">${inlineFormat(escapeHtml(trimmed.slice(4)))}</h4>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h3 class="text-base font-black mt-4 mb-1">${inlineFormat(escapeHtml(trimmed.slice(3)))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h2 class="text-lg font-black mt-4 mb-2">${inlineFormat(escapeHtml(trimmed.slice(2)))}</h2>`);
      continue;
    }

    // List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { result.push('<ul class="list-disc list-inside space-y-0.5 text-sm text-white/70">'); inList = true; }
      result.push(`<li>${inlineFormat(escapeHtml(trimmed.slice(2)))}</li>`);
      continue;
    }

    // Empty line
    if (!trimmed) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push('<div class="h-2"></div>');
      continue;
    }

    // Paragraph
    if (inList) { result.push('</ul>'); inList = false; }
    result.push(`<p class="text-sm text-white/70 leading-relaxed">${inlineFormat(escapeHtml(trimmed))}</p>`);
  }

  if (inList) result.push('</ul>');
  return result.join('\n');
}

function inlineFormat(text: string): string {
  // Code: `code`
  let out = text.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/10 text-xs font-mono text-white/80">$1</code>');
  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white/90">$1</strong>');
  // Italic: *text*
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  // Links: [text](url) — sanitize href
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, href) => {
      const safeHref = href.startsWith('http') ? href : '#';
      return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="text-gold hover:text-gold/80 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none rounded-sm">${text}</a>`;
    }
  );
  return out;
}
