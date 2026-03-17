# Two-Stage Gemini Filtering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Gemini Knowledge MCP token consumption from ~480K to ~20-42K per query by introducing a two-stage query pipeline: catalog lookup → selective file loading.

**Architecture:** Stage 1 sends a lightweight file catalog (~3KB) to Gemini asking which files are relevant. Stage 2 sends only those selected files with the actual question. Both stages use the same inline `generateContent` call. The catalog is built once at startup and rebuilt on doc changes (hash-based detection, same as today).

**Tech Stack:** Node.js ESM, TypeScript strict, `@google/genai`, `@modelcontextprotocol/sdk`, zod

**MCP Server Location:** `C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/`

---

## Current Architecture (broken)

```
query → indexDocs() [ALL 43 files, 960KB] → queryInline(ALL) → Gemini (480K tokens) → RATE LIMIT
```

## Target Architecture

```
query → indexDocs() [ALL files, build catalog]
      → Stage 1: selectFiles(catalog 3KB + question) → Gemini (1.5K tokens) → file list
      → Stage 2: queryWithDocs(selected files 30-80KB + question) → Gemini (15-40K tokens) → answer
```

---

### Task 1: Add `buildCatalog()` to indexer.ts

**Files:**
- Modify: `C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/src/indexer.ts`

**What this does:** Extracts a lightweight catalog from each IndexedDoc — filename, category, size, and first 3 `##` headers as topic hints. Returns a string that's ~3KB total for all 43 files.

**Step 1: Add the CatalogEntry interface and buildCatalog function**

After the existing `IndexResult` interface (~line 20), add:

```typescript
export interface CatalogEntry {
  filename: string;
  path: string;
  category: string;
  sizeKB: number;
  topics: string[]; // first 5 ## headers
}

export function buildCatalog(docs: IndexedDoc[]): CatalogEntry[] {
  return docs.map((doc) => {
    const headers = doc.content
      .split("\n")
      .filter((line) => /^#{1,2}\s/.test(line))
      .slice(0, 5)
      .map((h) => h.replace(/^#+\s*/, "").trim());

    return {
      filename: basename(doc.path),
      path: doc.path,
      category: doc.category,
      sizeKB: doc.sizeKB,
      topics: headers,
    };
  });
}

export function formatCatalog(entries: CatalogEntry[]): string {
  const lines: string[] = ["# Available Knowledge Files", ""];

  const byCategory = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  for (const [category, files] of byCategory) {
    lines.push(`## ${category.toUpperCase()}`);
    for (const f of files) {
      const topics = f.topics.length > 0 ? ` — ${f.topics.join(", ")}` : "";
      lines.push(`- ${f.filename} (${f.sizeKB}KB)${topics}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
```

**Step 2: Build and verify**

```bash
cd C:/Users/Anil/.claude/mcp-servers/gemini-knowledge && npx tsc --noEmit
```

Expected: 0 errors

**Step 3: Commit**

```bash
git add src/indexer.ts
git commit -m "feat(gemini-knowledge): add buildCatalog + formatCatalog for two-stage filtering"
```

---

### Task 2: Add two-stage query methods to gemini.ts

**Files:**
- Modify: `C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/src/gemini.ts`

**What this does:** Adds `selectFiles()` (Stage 1) and refactors `query()`/`queryForAgent()` to use two-stage pipeline in fallback mode. Cached mode stays unchanged.

**Step 1: Add the file selection prompt and method**

Add after the `SYSTEM_INSTRUCTION` constant (~line 19):

```typescript
const FILE_SELECTION_INSTRUCTION = `You are a file selector for the BeScout project knowledge base.

Given a question and a catalog of available files, return ONLY the filenames needed to answer the question.

Rules:
- Return a JSON array of filenames: ["file1.md", "file2.md"]
- Select 3-8 files maximum — enough to answer fully, no more
- ALWAYS include CLAUDE.md and MEMORY.md (core context)
- ALWAYS include common-errors.md (prevents known mistakes)
- Add domain-specific files based on the question topic
- Prefer smaller, focused files over large catch-all files
- Return ONLY valid JSON, no explanation`;
```

**Step 2: Add selectFiles method to GeminiKnowledge class**

Add before the `getCacheStatus()` method:

```typescript
async selectFiles(
  question: string,
  catalogText: string
): Promise<string[]> {
  const prompt = `${FILE_SELECTION_INSTRUCTION}

${catalogText}

Question: ${question}

Return ONLY a JSON array of filenames:`;

  try {
    const response = await this.ai.models.generateContent({
      model: this.config.model,
      contents: prompt,
      config: { maxOutputTokens: 256 },
    });

    const text = (response.text ?? "[]").trim();
    // Extract JSON array from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch (err) {
    console.error(`[gemini] File selection failed: ${(err as Error).message}`);
    return []; // Empty = fall back to all docs
  }
}
```

**Step 3: Add queryFiltered method for Stage 2**

```typescript
async queryFiltered(
  question: string,
  selectedContent: string,
  maxTokens: number
): Promise<string> {
  const prompt = `${SYSTEM_INSTRUCTION}

=== SELECTED PROJECT KNOWLEDGE ===
${selectedContent}
=== END KNOWLEDGE ===

Question: ${question}`;

  const response = await this.ai.models.generateContent({
    model: this.config.model,
    contents: prompt,
    config: { maxOutputTokens: maxTokens },
  });

  return response.text ?? "No response from Gemini";
}
```

**Step 4: Build and verify**

```bash
cd C:/Users/Anil/.claude/mcp-servers/gemini-knowledge && npx tsc --noEmit
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add src/gemini.ts
git commit -m "feat(gemini-knowledge): add selectFiles + queryFiltered for two-stage pipeline"
```

---

### Task 3: Wire two-stage pipeline into index.ts tool handlers

**Files:**
- Modify: `C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/src/index.ts`
- Modify: `C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/src/indexer.ts` (import)

**What this does:** The `query_knowledge` and `get_agent_context` tools now use two-stage filtering in fallback mode. Cached mode stays unchanged. Adds logging so we can see token savings.

**Step 1: Add imports and catalog state to index.ts**

At the top, update the indexer import:

```typescript
import { indexDocs, buildCatalog, formatCatalog } from "./indexer.js";
```

After `let currentIndex = indexDocs(config, PROJECT);` add:

```typescript
let currentCatalog = formatCatalog(buildCatalog(currentIndex.docs));
```

**Step 2: Create helper function for two-stage query**

Add before the tool definitions:

```typescript
function assembleSelectedDocs(
  filenames: string[],
  allDocs: typeof currentIndex.docs
): string {
  const selected = allDocs.filter((doc) => {
    const name = doc.path.split(/[\\/]/).pop() ?? "";
    return filenames.includes(name);
  });

  if (selected.length === 0) return currentIndex.combinedContent; // fallback to all

  const sections: string[] = [];
  for (const doc of selected) {
    const name = doc.path.split(/[\\/]/).pop() ?? "";
    sections.push(`--- FILE: ${name} ---`);
    sections.push(doc.content);
    sections.push(`--- END: ${name} ---\n`);
  }

  const assembled = sections.join("\n");
  const totalKB = selected.reduce((sum, d) => sum + d.sizeKB, 0);
  console.error(
    `[filter] Selected ${selected.length}/${allDocs.length} files (${totalKB}KB / ${currentIndex.totalSizeKB}KB)`
  );
  return assembled;
}

async function twoStageQuery(
  question: string,
  maxTokens: number
): Promise<string> {
  // Stage 1: Ask Gemini which files are relevant
  const filenames = await gemini.selectFiles(question, currentCatalog);
  console.error(`[filter] Stage 1 selected: ${JSON.stringify(filenames)}`);

  if (filenames.length === 0) {
    // Fallback: use all docs (same as before)
    console.error("[filter] No files selected, falling back to all docs");
    return gemini.queryFiltered(question, currentIndex.combinedContent, maxTokens);
  }

  // Stage 2: Query with only selected files
  const selectedContent = assembleSelectedDocs(filenames, currentIndex.docs);
  return gemini.queryFiltered(question, selectedContent, maxTokens);
}
```

**Step 3: Update query_knowledge tool handler**

Replace the existing handler body (inside try block) with:

```typescript
currentIndex = indexDocs(config, PROJECT);
currentCatalog = formatCatalog(buildCatalog(currentIndex.docs));

const fullQuestion = exact
  ? `${question}\n\nIMPORTANT: Quote exact values verbatim from the source. Do not paraphrase or summarize names, types, or constraints.`
  : question;

// Use cached mode if available, two-stage if fallback
await gemini.ensureCache(currentIndex);
let answer: string;
if (gemini.getCacheStatus().mode === "cached") {
  answer = await gemini.queryCached(fullQuestion, config.gemini.maxOutputTokens);
} else {
  answer = await twoStageQuery(fullQuestion, config.gemini.maxOutputTokens);
}

return {
  content: [{ type: "text", text: answer }],
};
```

**Step 4: Update get_agent_context tool handler**

Replace the existing handler body (inside try block) with:

```typescript
currentIndex = indexDocs(config, PROJECT);
currentCatalog = formatCatalog(buildCatalog(currentIndex.docs));

const agentPrompt = `An implementation agent needs context for this task:

"${task}"

Provide a COMPLETE context package containing:
1. **Relevant Patterns** — Which coding patterns from patterns.md apply?
2. **Rules** — Which rules from the rules files are relevant?
3. **DB Schema** — Which tables, columns, constraints, RPCs are involved?
4. **Common Errors** — What pitfalls from errors.md/common-errors.md should the agent avoid?
5. **Business Rules** — Any business constraints or compliance rules?
6. **Existing Components** — Which existing services/components should be reused?

Format as a compact briefing. Include exact values (column names, types, constraints). Cite sources.
Max 40 lines.`;

await gemini.ensureCache(currentIndex);
let context: string;
if (gemini.getCacheStatus().mode === "cached") {
  context = await gemini.queryCached(agentPrompt, 4096);
} else {
  context = await twoStageQuery(agentPrompt, 4096);
}

return {
  content: [{ type: "text", text: context }],
};
```

**Step 5: Make queryCached public**

In `gemini.ts`, change `private async queryCached` to `async queryCached` (remove `private`).

**Step 6: Make ensureCache and the mode accessible**

The `ensureCache` method is already public. `getCacheStatus()` is already public. No changes needed.

**Step 7: Build and verify**

```bash
cd C:/Users/Anil/.claude/mcp-servers/gemini-knowledge && npx tsc --noEmit
```

Expected: 0 errors

**Step 8: Commit**

```bash
git add src/index.ts src/gemini.ts src/indexer.ts
git commit -m "feat(gemini-knowledge): wire two-stage pipeline into all tool handlers"
```

---

### Task 4: Build, deploy, and smoke test

**Files:**
- No new files — build existing

**Step 1: Full build**

```bash
cd C:/Users/Anil/.claude/mcp-servers/gemini-knowledge && npx tsc
```

Expected: 0 errors, `dist/` directory updated with all .js files

**Step 2: Verify dist files exist**

```bash
ls -la C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/dist/
```

Expected: `index.js`, `gemini.js`, `indexer.js`, `config.js` all present

**Step 3: Restart MCP server**

The MCP server restarts automatically when Claude Code reconnects. Close and reopen Claude Code, or use `/mcp` to check server status.

**Step 4: Smoke test — query_knowledge**

Call `query_knowledge` with question: "Fantasy database tables and columns" and `exact: true`.

Expected in server stderr logs:
```
[filter] Stage 1 selected: ["CLAUDE.md", "MEMORY.md", "common-errors.md", "fantasy.md", "backend-systems.md"]
[filter] Selected 5/43 files (81KB / 960KB)
```

Expected: Answer returns successfully without rate limit error.

**Step 5: Smoke test — get_agent_context**

Call `get_agent_context` with task: "Implement fantasy lineup scoring".

Expected: Returns agent briefing without rate limit, logs show 5-8 files selected.

**Step 6: Commit final build**

```bash
cd C:/Users/Anil/.claude/mcp-servers/gemini-knowledge && git add -A && git commit -m "build: compile two-stage filtering to dist"
```

---

## Token Budget Summary

| Stage | Input Tokens | Purpose |
|-------|-------------|---------|
| Stage 1 (catalog) | ~1,500 | File selection prompt + 3KB catalog |
| Stage 2 (answer) | ~15,000-40,000 | Selected files + question |
| **Total per query** | **~17,000-42,000** | **vs 480,000 before (92-96% reduction)** |
| Free tier limit | 250,000/min | **6-14 queries/min now possible** |

## Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| Stage 1 returns empty array | Fall back to ALL docs (same as before) |
| Stage 1 rate limited | Fall back to ALL docs |
| Cached mode available | Skip two-stage entirely, use cache (unchanged) |
| Stage 1 returns invalid JSON | Fall back to ALL docs |
