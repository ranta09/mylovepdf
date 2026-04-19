# MagicDOCX — Project Context

Vite + React 18 SPA, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion.
Express backend on port 3001 (server/). Vite proxies /api → localhost:3001.

## Key rules
- Tool color: `--primary` CSS var override in ToolLayout per category
- Post-upload workspace: `fixed top-16 inset-x-0 bottom-0 z-40`
- Client-side PDF: pdf-lib + pdfjs-dist (lossless only — no rasterisation)
- Server PDF: qpdf (primary) → Ghostscript PassThrough (fallback)
- Hash nav: `window.location.href = "/#all-tools"` + useEffect scroll in Index.tsx

## Stack
- Frontend: `npm run dev` (port 5173)
- Backend: `npm run server` (port 3001)
- Build: `npm run build`

@.claude/rules/frontend.md

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
