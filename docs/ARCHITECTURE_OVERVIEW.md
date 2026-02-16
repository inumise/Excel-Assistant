# Mind Map AI System - Architecture Overview

This project is organized so the map UX stays simple while runtime logic remains extendable.

## 1) Map state model

The primary source of truth is `MindMapDocument` (`src/components/mindmap/types.ts`):

- `nodes`: React Flow nodes with per-node AI config and runtime status
- `edges`: typed message connections (`messageType`, `channel`)
- `strokes`: freehand drawing layer (including pencil/highlighter opacity)
- `globalDefaults`: fallback values only (node values always win)

State lifecycle:

1. `useMindMapDocument` hydrates from localStorage.
2. UI updates call `updateDocument(...)`.
3. Every update auto-saves to localStorage.
4. Undo/redo snapshots are maintained in the hook history stack.

## 2) Execution model (graph + queue)

Runtime uses topological ordering from `src/lib/workflow-graph.ts`:

- `getWorkflowExecutionOrder(...)` produces deterministic execution order.
- If cycles exist, fallback is x-position ordering for predictable behavior.

Execution flow:

1. `MindMapBuilder` converts map document -> `Workflow`.
2. `/api/mindmap/run` validates and prepares per-node runtime config.
3. `executeWorkflow(...)` runs nodes asynchronously and passes typed edge messages.
4. Node results are returned and mapped back to per-node runtime status in UI.

Typed routing:

- Edges carry explicit `messageType` (prompt/context/code/event/memory/api/ai).
- Node routing mode (`direct|buffered|storage`) can prefer specific typed lanes.
- No hidden magic strings are required for routing decisions.

## 3) Extensibility points

### Add a new node type

1. Add template entry in `NODE_TEMPLATES`.
2. Add node-kind UI handling in `MindMapNodeCard`/details panel if needed.
3. Add runtime behavior in `executeWorkflow` (or adapter layer).

### Add a new tool

1. Add tool metadata in `src/components/mindmap/tool-registry.ts`.
2. Add icon mapping in `Toolbox.tsx`.
3. Add tool behavior in `MindMapCanvas.tsx` (node-create or draw mode).

Because tools are registry-driven, adding something like `shape` or `highlighter`
requires only small, localized edits.

### Plug external APIs, AI providers, or runtimes

`executeWorkflow` accepts `adapters` (`WorkflowExecutionAdapters`):

- `generateText` for custom provider orchestration
- `executeCode` for custom sandbox/runtime strategies

This keeps the core graph logic stable while allowing runtime extension without
rewriting map UI or routing infrastructure.
