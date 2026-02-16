# Visual Theme Note (Mind Map UI)

This UI uses a light, professional theme with very subtle motion designed to support long focus sessions.

## Primary + secondary color roles

- **Primary accents (dark, muted):**
  - `--mind-accent-blue`
  - `--mind-accent-violet`
  - `--mind-accent-teal`
- **Edges/connectors (typed, desaturated):**
  - `--mind-edge-*` variables (prompt/context/code/event/memory/api/ai)
- **Background/surfaces (light neutrals):**
  - `--mind-bg`, `--mind-bg-accent`, `--mind-surface`, `--mind-surface-soft`

## Glow + wave layers

- Canvas wave layers live in `MindMapCanvas` as:
  - `.mind-wave-layer`
  - `.mind-wave-band--blue|--violet|--teal`
- They are rendered **under** React Flow grid/nodes.
- Motion is transform-based and extremely gradual to avoid distraction.

## Safe animation tuning

Animation intensity/speed is centralized in `src/app/globals.css`:

- `--mind-motion-wave-duration-a|b|c`
- `--mind-motion-node-pulse`
- `--mind-motion-edge-flow`

To reduce/disable motion:

1. System level: `prefers-reduced-motion` automatically disables key animations.
2. App flag: set `html[data-mind-motion='off']` to disable wave/node/edge animations.

## Runtime state visual behavior

- **Idle node:** low-intensity static halo.
- **Running node:** subtle pulse (`.mind-node-card--running`) with restrained color shift.
- **Error node:** desaturated warm accent (`.mind-node-card--error`) without neon saturation.

These rules keep node content and controls as the primary focus while preserving atmospheric depth.
