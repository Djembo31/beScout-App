# Gemini Knowledge MCP Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that caches all project knowledge (memory, rules, docs) in Gemini Context Cache and exposes `query_knowledge` + `get_agent_context` tools so the orchestrator can get project context without burning Claude tokens on file reads.

**Architecture:** Standalone Node.js MCP server at `~/.claude/mcp-servers/gemini-knowledge/`. On startup, reads all configured docs, hashes them, uploads to Gemini 2.5 Flash Context Cache. Exposes 3 MCP tools via stdio transport. File hashes are checked on every query — if docs changed, cache auto-rebuilds before answering.

**Tech Stack:** Node.js + TypeScript, `@modelcontextprotocol/sdk`, `@google/genai`, `zod`

---

### Task 1: Project Setup

**Files:**
- Create: `~/.claude/mcp-servers/gemini-knowledge/package.json`
- Create: `~/.claude/mcp-servers/gemini-knowledge/tsconfig.json`

**Step 1: Create directory and initialize project**

```bash
mkdir -p ~/.claude/mcp-servers/gemini-knowledge/src
```

**Step 2: Create package.json**

```json
{
  "name": "gemini-knowledge-mcp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "npx tsx src/index.ts"
  },
  "dependencies": {
    "@google/genai": "^1.0.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: Install dependencies**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge && npm install
```

**Step 5: Commit**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge
git init && git add -A && git commit -m "chore: init gemini-knowledge-mcp project"
```

---

### Task 2: Config System

**Files:**
- Create: `~/.claude/mcp-servers/gemini-knowledge/src/config.ts`
- Create: `~/.claude/mcp-servers/gemini-knowledge/config.json`

**Step 1: Create config.json with all doc paths**

This is the project-specific config. Paths are absolute. Categories help Gemini understand doc structure.

```json
{
  "projects": {
    "bescout": {
      "name": "BeScout",
      "docs": [
        {
          "category": "project",
          "paths": [
            "C:/bescout-app/CLAUDE.md"
          ]
        },
        {
          "category": "memory",
          "paths": [
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/MEMORY.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/architecture.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/backend-systems.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/business-context.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/current-sprint.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/decisions.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/errors.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/patterns.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/sessions.md",
            "C:/Users/Anil/.claude/projects/C--bescout-app/memory/user-prefs.md"
          ]
        },
        {
          "category": "rules",
          "paths": [
            "C:/bescout-app/.claude/rules/business.md",
            "C:/bescout-app/.claude/rules/club-admin.md",
            "C:/bescout-app/.claude/rules/common-errors.md",
            "C:/bescout-app/.claude/rules/community.md",
            "C:/bescout-app/.claude/rules/core.md",
            "C:/bescout-app/.claude/rules/database.md",
            "C:/bescout-app/.claude/rules/fantasy.md",
            "C:/bescout-app/.claude/rules/gamification.md",
            "C:/bescout-app/.claude/rules/orchestrator.md",
            "C:/bescout-app/.claude/rules/profile.md",
            "C:/bescout-app/.claude/rules/trading.md",
            "C:/bescout-app/.claude/rules/ui-components.md"
          ]
        },
        {
          "category": "docs",
          "paths": [
            "C:/bescout-app/docs/VISION.md",
            "C:/bescout-app/docs/STATUS.md",
            "C:/bescout-app/docs/SCALE.md",
            "C:/bescout-app/docs/BeScout_Context_Pack_v8.md"
          ]
        }
      ]
    }
  },
  "gemini": {
    "model": "gemini-2.5-flash",
    "cacheTtlSeconds": 3600,
    "maxOutputTokens": 2048
  }
}
```

**Step 2: Create config.ts loader**

```typescript
// src/config.ts
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DocGroup {
  category: string;
  paths: string[];
}

export interface ProjectConfig {
  name: string;
  docs: DocGroup[];
}

export interface GeminiConfig {
  model: string;
  cacheTtlSeconds: number;
  maxOutputTokens: number;
}

export interface Config {
  projects: Record<string, ProjectConfig>;
  gemini: GeminiConfig;
}

export function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config.json");
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as Config;
}
```

**Step 3: Commit**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge
git add -A && git commit -m "feat: add config system with doc paths"
```

---

### Task 3: Document Indexer with File Hashing

**Files:**
- Create: `~/.claude/mcp-servers/gemini-knowledge/src/indexer.ts`

**Step 1: Build the indexer**

The indexer reads all configured docs, computes MD5 hashes, and concatenates them into a single string with clear section headers. It tracks hashes to detect changes.

```typescript
// src/indexer.ts
import { readFileSync, statSync } from "fs";
import { createHash } from "crypto";
import { basename } from "path";
import { Config, DocGroup } from "./config.js";

export interface IndexedDoc {
  path: string;
  category: string;
  content: string;
  hash: string;
  sizeKB: number;
}

export interface IndexResult {
  docs: IndexedDoc[];
  combinedContent: string;
  combinedHash: string;
  totalSizeKB: number;
  totalLines: number;
}

function hashContent(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

function readDoc(path: string, category: string): IndexedDoc | null {
  try {
    const content = readFileSync(path, "utf-8");
    const stats = statSync(path);
    return {
      path,
      category,
      content,
      hash: hashContent(content),
      sizeKB: Math.round(stats.size / 1024),
    };
  } catch (err) {
    console.error(`[indexer] Failed to read ${path}: ${(err as Error).message}`);
    return null;
  }
}

export function indexDocs(config: Config, project: string): IndexResult {
  const projectConfig = config.projects[project];
  if (!projectConfig) {
    throw new Error(`Project "${project}" not found in config`);
  }

  const docs: IndexedDoc[] = [];

  for (const group of projectConfig.docs) {
    for (const path of group.paths) {
      const doc = readDoc(path, group.category);
      if (doc) docs.push(doc);
    }
  }

  // Build combined content with clear section headers
  const sections: string[] = [];
  const categories = [...new Set(docs.map((d) => d.category))];

  for (const cat of categories) {
    const catDocs = docs.filter((d) => d.category === cat);
    sections.push(`\n${"=".repeat(60)}`);
    sections.push(`CATEGORY: ${cat.toUpperCase()}`);
    sections.push(`${"=".repeat(60)}\n`);

    for (const doc of catDocs) {
      sections.push(`--- FILE: ${basename(doc.path)} (${doc.path}) ---`);
      sections.push(doc.content);
      sections.push(`--- END: ${basename(doc.path)} ---\n`);
    }
  }

  const combinedContent = sections.join("\n");
  const totalLines = combinedContent.split("\n").length;

  return {
    docs,
    combinedContent,
    combinedHash: hashContent(combinedContent),
    totalSizeKB: docs.reduce((sum, d) => sum + d.sizeKB, 0),
    totalLines,
  };
}

export function hasDocsChanged(
  config: Config,
  project: string,
  previousHash: string
): boolean {
  const result = indexDocs(config, project);
  return result.combinedHash !== previousHash;
}
```

**Step 2: Commit**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge
git add -A && git commit -m "feat: add document indexer with file hashing"
```

---

### Task 4: Gemini Client with Context Caching

**Files:**
- Create: `~/.claude/mcp-servers/gemini-knowledge/src/gemini.ts`

**Step 1: Build the Gemini client**

Handles cache creation, querying, freshness checks, and auto-rebuild.

```typescript
// src/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { GeminiConfig } from "./config.js";
import { IndexResult } from "./indexer.js";

export class GeminiKnowledge {
  private ai: GoogleGenAI;
  private config: GeminiConfig;
  private cacheName: string | null = null;
  private cacheHash: string | null = null;
  private cacheExpiry: Date | null = null;

  constructor(apiKey: string, config: GeminiConfig) {
    this.ai = new GoogleGenAI({ apiKey });
    this.config = config;
  }

  async buildCache(index: IndexResult): Promise<void> {
    // Delete old cache if exists
    if (this.cacheName) {
      try {
        await this.ai.caches.delete({ name: this.cacheName });
      } catch {
        // Cache may have expired already
      }
    }

    const systemInstruction = `You are a knowledge base for the BeScout project — a B2B2C fan engagement platform for football clubs.

Your role:
- Answer questions accurately based ONLY on the provided documents
- Always cite the source file for your answers: [source: filename.md]
- Be concise: max 20 lines for query_knowledge, max 40 lines for get_agent_context
- When asked for exact values (column names, constraints, types), quote them exactly — do not paraphrase
- If information is not in the documents, say "Not found in knowledge base"
- Answer in the same language as the question (German or English)

The documents contain:
- PROJECT: Main project config (CLAUDE.md)
- MEMORY: Architecture, patterns, errors, decisions, backend systems
- RULES: Domain-specific coding rules and constraints
- DOCS: Business vision, status, scaling architecture, context pack`;

    const cache = await this.ai.caches.create({
      model: this.config.model,
      config: {
        contents: [
          {
            role: "user",
            parts: [{ text: index.combinedContent }],
          },
        ],
        systemInstruction,
        ttl: `${this.config.cacheTtlSeconds}s`,
      },
    });

    this.cacheName = cache.name!;
    this.cacheHash = index.combinedHash;
    this.cacheExpiry = new Date(
      Date.now() + this.config.cacheTtlSeconds * 1000
    );

    console.error(
      `[gemini] Cache built: ${index.totalSizeKB}KB, ${index.totalLines} lines, ` +
        `expires ${this.cacheExpiry.toLocaleTimeString()}`
    );
  }

  async ensureCache(index: IndexResult): Promise<void> {
    const needsRebuild =
      !this.cacheName ||
      this.cacheHash !== index.combinedHash ||
      (this.cacheExpiry && new Date() > this.cacheExpiry);

    if (needsRebuild) {
      const reason = !this.cacheName
        ? "no cache"
        : this.cacheHash !== index.combinedHash
          ? "docs changed"
          : "cache expired";
      console.error(`[gemini] Cache rebuild needed: ${reason}`);
      await this.buildCache(index);
    }
  }

  async query(question: string, index: IndexResult): Promise<string> {
    await this.ensureCache(index);

    const response = await this.ai.models.generateContent({
      model: this.config.model,
      contents: question,
      config: {
        cachedContent: this.cacheName!,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });

    return response.text ?? "No response from Gemini";
  }

  async queryForAgent(
    taskDescription: string,
    index: IndexResult
  ): Promise<string> {
    await this.ensureCache(index);

    const prompt = `An implementation agent needs context for this task:

"${taskDescription}"

Provide a COMPLETE context package containing:
1. **Relevant Patterns** — Which coding patterns from patterns.md apply?
2. **Rules** — Which rules from the rules files are relevant?
3. **DB Schema** — Which tables, columns, constraints, RPCs are involved?
4. **Common Errors** — What pitfalls from errors.md/common-errors.md should the agent avoid?
5. **Business Rules** — Any business constraints or compliance rules?
6. **Existing Components** — Which existing services/components should be reused?

Format as a compact briefing. Include exact values (column names, types, constraints). Cite sources.
Max 40 lines.`;

    const response = await this.ai.models.generateContent({
      model: this.config.model,
      contents: prompt,
      config: {
        cachedContent: this.cacheName!,
        maxOutputTokens: 4096,
      },
    });

    return response.text ?? "No response from Gemini";
  }

  getCacheStatus(): {
    active: boolean;
    hash: string | null;
    expiresAt: string | null;
  } {
    return {
      active: this.cacheName !== null,
      hash: this.cacheHash,
      expiresAt: this.cacheExpiry?.toISOString() ?? null,
    };
  }
}
```

**Step 2: Commit**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge
git add -A && git commit -m "feat: add Gemini client with context caching"
```

---

### Task 5: MCP Server — Wire Everything Together

**Files:**
- Create: `~/.claude/mcp-servers/gemini-knowledge/src/index.ts`

**Step 1: Build the MCP server with 3 tools**

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { indexDocs } from "./indexer.js";
import { GeminiKnowledge } from "./gemini.js";

const config = loadConfig();
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("[server] GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

const gemini = new GeminiKnowledge(apiKey, config.gemini);

// Default project (can be extended later for multi-project)
const PROJECT = "bescout";

// Initial index
let currentIndex = indexDocs(config, PROJECT);

const server = new McpServer({
  name: "gemini-knowledge",
  version: "1.0.0",
});

// Tool 1: query_knowledge — Free-form question, concise answer
server.tool(
  "query_knowledge",
  {
    question: z.string().describe("Question about the project (patterns, rules, errors, architecture, business)"),
    exact: z.boolean().optional().default(false).describe("If true, quote exact values (column names, types, constraints) without paraphrasing"),
  },
  async ({ question, exact }) => {
    try {
      // Re-index to check for changes
      currentIndex = indexDocs(config, PROJECT);

      const fullQuestion = exact
        ? `${question}\n\nIMPORTANT: Quote exact values verbatim from the source. Do not paraphrase or summarize names, types, or constraints.`
        : question;

      const answer = await gemini.query(fullQuestion, currentIndex);

      return {
        content: [{ type: "text", text: answer }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `[ERROR] Knowledge query failed: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: get_agent_context — Curated context package for agent dispatch
server.tool(
  "get_agent_context",
  {
    task: z.string().describe("Description of the agent's task (what it needs to implement/fix/research)"),
  },
  async ({ task }) => {
    try {
      // Re-index to check for changes
      currentIndex = indexDocs(config, PROJECT);

      const context = await gemini.queryForAgent(task, currentIndex);

      return {
        content: [{ type: "text", text: context }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `[ERROR] Agent context generation failed: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: refresh_cache — Force rebuild (after doc edits)
server.tool(
  "refresh_cache",
  {},
  async () => {
    try {
      currentIndex = indexDocs(config, PROJECT);
      await gemini.buildCache(currentIndex);

      const status = gemini.getCacheStatus();
      return {
        content: [
          {
            type: "text",
            text: `Cache rebuilt successfully.\nDocs: ${currentIndex.docs.length} files, ${currentIndex.totalSizeKB}KB, ${currentIndex.totalLines} lines\nExpires: ${status.expiresAt}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `[ERROR] Cache refresh failed: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  console.error("[server] Gemini Knowledge MCP starting...");
  console.error(`[server] Project: ${PROJECT}`);
  console.error(`[server] Docs: ${currentIndex.docs.length} files, ${currentIndex.totalSizeKB}KB`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[server] MCP server connected via stdio");
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge
git add -A && git commit -m "feat: add MCP server with 3 tools"
```

---

### Task 6: Build and Standalone Test

**Step 1: Build TypeScript**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge && npm run build
```

Expected: `dist/` directory with compiled JS files, 0 errors.

**Step 2: Test standalone (verify it starts)**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge
GEMINI_API_KEY=AIzaSyCUIP9jm2LiFoWKhaTs5y3bBFkfCBMoYxo node dist/index.js
```

Expected: Server starts, prints doc count to stderr, then waits for stdio input.
Press Ctrl+C to stop.

**Step 3: Commit build output (optional — or add dist to .gitignore)**

```bash
echo "node_modules/" > ~/.claude/mcp-servers/gemini-knowledge/.gitignore
echo "dist/" >> ~/.claude/mcp-servers/gemini-knowledge/.gitignore
cd ~/.claude/mcp-servers/gemini-knowledge
git add -A && git commit -m "chore: add .gitignore"
```

---

### Task 7: Register in Claude Code

**Step 1: Add MCP server to project config**

Update `C:/bescout-app/.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["./node_modules/@playwright/mcp/cli.js"]
    },
    "gemini-knowledge": {
      "command": "node",
      "args": ["C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "AIzaSyCUIP9jm2LiFoWKhaTs5y3bBFkfCBMoYxo"
      }
    }
  }
}
```

Note: Using `node` directly (not npx) to avoid Windows process bugs (documented in MEMORY.md).

**Step 2: Restart Claude Code to pick up new MCP server**

User must restart Claude Code session. The server will appear in MCP tool list as:
- `mcp__gemini-knowledge__query_knowledge`
- `mcp__gemini-knowledge__get_agent_context`
- `mcp__gemini-knowledge__refresh_cache`

**Step 3: Commit .mcp.json change**

```bash
cd /c/bescout-app
git add .mcp.json && git commit -m "feat: add gemini-knowledge MCP server"
```

---

### Task 8: Integration Test — 5 Verification Queries

After Claude Code restart, run these 5 test queries to verify accuracy:

**Test 1: Exact column name (critical for bug prevention)**
```
query_knowledge("What is the primary key column of the wallets table?", exact: true)
```
Expected: `user_id` (NOT `id`)

**Test 2: Business rule**
```
query_knowledge("What are the IPO fee splits?")
```
Expected: 85% Club, 10% Platform, 5% PBT

**Test 3: Pattern lookup**
```
query_knowledge("How does the Escrow Pattern work?")
```
Expected: Lock → Insert → on failure: Unlock

**Test 4: Agent context generation**
```
get_agent_context("Implement a new RPC for IPO early access check in the trading service")
```
Expected: Compact briefing with relevant patterns, DB schema, rules, common errors

**Test 5: Freshness check**
```
refresh_cache()
```
Expected: Cache rebuilt message with file count and size

---

### Task 9: Update Orchestrator Rules

**Files:**
- Modify: `C:/bescout-app/.claude/rules/orchestrator.md`
- Modify: `C:/Users/Anil/.claude/projects/C--bescout-app/memory/MEMORY.md`

**Step 1: Add Gemini Knowledge section to orchestrator.md**

Add after "## Verification Agents" section:

```markdown
## Gemini Knowledge Layer (Token-Optimierung)

ICH (Orchestrator) nutze `gemini-knowledge` MCP fuer Kontext-Lookups.
Agents bekommen Kontext von MIR im Prompt — NICHT per File-Read.

| Tool | Wann | Wer |
|------|------|-----|
| `query_knowledge` | Schnelle Fakten-Frage (Column-Name, Business-Rule, Pattern) | ICH |
| `get_agent_context` | Vor Agent-Dispatch: komplettes Kontext-Paket generieren | ICH |
| `refresh_cache` | Nach Updates an memory/*.md oder .claude/rules/*.md | ICH |

### Workflow mit Gemini
1. Anil beschreibt Task
2. ICH: `get_agent_context(task)` → kuratiertes Briefing
3. ICH: verifiziere Briefing (kenne das Projekt)
4. ICH: dispatche Agent MIT Briefing im Prompt
5. Agent liest NUR Source Code, Wissen hat er von mir
6. Ergebnis: ~40-50% weniger Token-Verbrauch auf Knowledge-Reads
```

**Step 2: Add to MEMORY.md Projekt-Snapshot section**

Add line after "Live-Daten" line:
```markdown
- **Gemini Knowledge MCP:** Context Cache (~65K Tokens), 3 Tools (query/agent-context/refresh)
```

**Step 3: Commit**

```bash
cd /c/bescout-app
git add .claude/rules/orchestrator.md
git commit -m "docs: add Gemini Knowledge Layer to orchestrator rules"
```

---

## Verification Checklist

- [ ] `npm run build` — 0 TypeScript errors
- [ ] Server starts without crash (`node dist/index.js`)
- [ ] All 5 test queries return correct answers
- [ ] Cache auto-rebuilds when docs change
- [ ] MCP tools appear in Claude Code after restart
- [ ] `query_knowledge` with `exact: true` returns verbatim values
- [ ] `get_agent_context` returns compact, actionable briefing
- [ ] `refresh_cache` succeeds and reports stats
