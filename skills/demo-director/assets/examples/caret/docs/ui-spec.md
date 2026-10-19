# Caret UI spec for the demo recreation

Read from `~/dev/caret-desktop` at v0.3.0 (`b150c0df`), 2026-10-17. Paths are
relative to that repo. This is the reference for building scenes: when a scene
disagrees with this file, check the source, then fix whichever is wrong.

Reference stills from the real app are in `docs/reference/` (the
`screenshot-*.jpg` set predates 0.3.0: the asset generator is now a branching
take board, not a 2×2 grid).

## How the window is built

- One `BrowserWindow` (1440×900 default, `#0b0d12`, `titleBarStyle:
  hiddenInset` on macOS). Its own webContents is the **chrome**: the React
  renderer in `desktop/renderer/src`.
- The **canvas** is a separate native `WebContentsView` over the chrome at
  `{x:0, y:44, width: W − (chat open ? 380 : 0), height: H − 44}`. It shows the
  project's own Vite dev server, whose UI is generated from
  `src/core/design/rendering-shell/canvas-template.ts` (writes
  `.caret/lib/canvas/*`) and `entry-template.ts`.
- So both layers are real code we can run: the chrome by mounting the renderer
  with a fake `window.caret`, and the canvas by running a real `.caret/` design
  shell. The demo composes them exactly as the window does.

## Chrome tokens (`desktop/renderer/src/styles.css`)

| Token | Value |
|---|---|
| shell-bg | `#0b0d12` |
| shell-panel | `#12151c` |
| shell-border | `#1e232e` |
| shell-text | `#e6e9ef` |
| shell-muted | `#8b93a7` |
| shell-warn | `#e0a83a` |
| caret-accent | `#0b7aff` (hover `#2e8bff`, press `#0066db`) |
| caret-navy | `#16233d` |
| error / success | `#e5484d` / `#22c55e` |

Body: `ui-sans-serif, system-ui, -apple-system…` at 13px, antialiased (SF Pro
on macOS). `.fade-in` = 320ms ease-out from opacity 0 / translateY(4px).

## Faking the bridge

- `desktop/renderer/src/ipc.ts` reads `window.caret.platform` at import, so the
  shim must exist before the App module loads (precedent:
  `scripts/preview-wizard.ts`).
- Shim: `{platform:"darwin", invoke(channel,...args), on(channel, l) => unsub,
  pathForFile}`. Listeners receive `(projectPath, payload)`.
- Contract: `desktop/shared/ipc.ts` (requests ~774-1131, events ~1134-1160).
- App never asks for project state: emit `project:stateChanged` with
  `{path, name, canvasUrl, mcpUrl, agentConnected, hasFoundation:true,
  hasPages:true, app:null}` after mount.
- `prefs:get` must return an object (`{telemetryNoticeShown:true}`), never null.
- `agent:state` must have `ready:true` or the chat shows the no-backend block.
- Lists return `[]`, never null. `analytics:event` must never throw.
- Startup calls: `analytics:event`, `prefs:get`, `canvas:setBounds`,
  `canvas:setVisible`, `interview:pending`→null, `import:status`→null,
  `agent:state`, `assets:list`, `skills:list`.

## Top bar (`TopBar.tsx`)

`h-11` (44px), `border-b border-shell-border bg-shell-panel px-3`, `pl-20` on
macOS. Left: 22px white `rounded-md` tile with the 16px logo; project name
(13px medium) + ChevronDown 13 @50%; status dot `size-1.5` emerald-400 +
"Preview running" (11px muted) or amber pulse "Starting preview…". Right,
`rounded-lg px-2.5 py-1.5 text-[12px]`, lucide 14px, active
`bg-caret-accent/15 text-caret-accent`:
`FlaskConical` "Exploring" (amber, only while an exploration is open) ·
`Palette` Foundation · `Images` Assets · `BookOpen` Skills · `Library`
Libraries · `MessageSquare` Chat · `Blocks` Backend · `RefreshCw` Sync.
Setup pill "Setup · step n of 2" only before setup is done.

## Chat sidebar (`ChatSidebar.tsx`)

- 380px, `border-l bg-shell-panel`. Header `h-10`, title 12px medium: "Chat",
  or the activity title ("Sync design → app"). Icons: History, Plus (New chat),
  X.
- Empty: "Ask for a change, or describe what you want to build." / "Caret can
  see this project's foundations and assets."
- Entries: **user** bubble `max-w-[82%] self-end rounded-xl rounded-br-sm
  bg-white/[0.07] px-3 py-2` (fade-in). **assistant** = Markdown. **thinking**
  collapsed "Thinking" 11.5px muted. **tool** row 11.5px muted, Wrench 11
  (pulses while running), `name` then summary (e.g. `edit src/app/page.tsx`).
  **note** `border-l-2 pl-3 text-[11.5px] muted`. Turns get `mt-7`.
- Plan card: `rounded-xl border bg-white/[0.03]`, header "PLAN" 10px tracked,
  footer "Reply to revise it, or switch to Act to apply — open questions fall
  to their marked defaults.", "Discard plan" for sync plans.
- Heartbeat: ThinkingOrb 20px + "Working…" + elapsed (from 3s, "47s").
  Pending ask: accent "Waiting for you: {summary}".
- Changed files: `border-t`, "CHANGED · N", last two path segments.
- Permission dock (replaces the composer): "WAITING ON YOU" 11px accent,
  summary 12.5px ("Change src/app/page.tsx?", "Change 3 files (a, b, c, …)?"),
  buttons "Allow" (accent), "Always allow", "Refuse".
- Composer: `rounded-xl border bg-shell-bg`, placeholder "Ask for a change, @
  for an asset…" (Plan: "Refine the plan, or switch to Act to apply it…").
  Row: Paperclip, model pill (e.g. "gpt-5.6-luna (opencode-go)" or
  "Automatic"), Send `size-7 rounded-lg bg-white/10`. Under it: Plan/Act
  segmented toggle (11px) and "Skill: {name}" chip.

## Sync, as the user sees it

- Triggers: top-bar Sync, canvas toolbar sync icon, menu Design ▸ "Sync Design
  → App" ⌘⇧S. It does not open the chat by itself.
- Toast (`notification:show`, bottom-right 380px card): info "Syncing design →
  app: N changed design file(s)."; watcher offer "Design changes detected —
  sync them into the app?" [Sync now]; drift "This commit changed app files that
  were translated from "{designPath}" — the design no longer tells the truth
  about them." [Review side by side].
- Plan turn: title "Sync design → app", mode Plan. Note "Planning from N
  changed design file(s). Nothing in your app is written yet.", user "Bring the
  app in line with N changed design file(s).", tool rows (read/glob/grep), PLAN
  card.
- Flip to Act → "Apply the plan." → edits (permission dock for app files unless
  allowed; `.caret` auto-allowed; `caret_report_sync_mapping`) → note "Synced —
  N app file(s) changed. The next sync will only report changes made from
  here." → CHANGED list.
- Snapshot before planning (`refs/caret/pre-sync`); undo is the native menu
  Design ▸ "Undo Last Sync": "Rolled back the last sync — X file(s) reverted, Y
  removed. Your design changes are untouched."
- Reverse: drift opens a take board "Review: {page} vs the app" with "Current
  design" and "App's version", buttons "Use the app's version" / "Keep the
  design".

## Canvas (`canvas-template.ts`)

- Grid: background solid `#0a0a0a`, 3 columns, card 380 wide (1440×900 frame at
  0.2639), gap 40, group header 12px/600 `#666` uppercase .05em, groups by
  first tag. Card title 12px/500 `#888` (`#ddd` on hover), tags 9px on `#222`,
  "from your app" badge emerald. Card box radius 4, shadow `0 1px 3px
  rgba(0,0,0,.4)`, hover adds a 1px `rgba(59,130,246,.5)` ring. New cards enter
  `0.24s ease-out` from opacity 0 scale .965.
- Bottom toolbar pill: `#1e1e1e`, 1px `#333`, radius 24, 32px round buttons
  `#999` (active `#2563eb`): Fit all, layout, Desktop/Laptop/Tablet/Mobile,
  flows, "Sync design to app", Simulate, Playground, zoom "100%".
- Focused view: toolbar `#1a1a1a` with "←", title, viewport buttons "🖥 1440",
  "💻 1280", "📱 768", "📱 390", "📱 375", "⚗ Experiment". Page iframe at real
  width on `#111`, no scaling. Floating round buttons over the page (←, ✎
  paint, ▶ simulate). Inspector sidebar 280px `#14141c` slides in (180ms).
- Hover/selection (react-grab, focused page only, off until enabled): 1px
  rounded rect `rgba(210,57,192,.5)` with fill `rgba(210,57,192,.08)`.
  Caret's selection: 2px `#7c6cf3` outline + purple resize pills.
- Context menu (dark, see reference): "{Component}.{tag}" header, Copy ⌘C,
  Style S, Comment ↵, Open ⌘O, AI Edit, Edit text, Edit color, Replace image.
- Inline text edit: contentEditable, Enter commits; toast "Edit applied"
  (`#16a34a`, top-centre, 3s).
- Colour popover 236px `rgba(20,20,30,.97)`: "Colour", SV area, hue strip,
  swatch + hex input, token swatch groups (brand/secondary/accent/neutral/
  semantic). Token snap toast: "Matched brand-500 — bound to the token".
- Paint mode: crosshair, drag a rectangle (`2px #3b82f6`), prompt "Describe the
  change, @ for an asset" + "→". Edit pill (bottom-centre, `rgba(18,21,28,.92)`):
  "Working on it — “{instruction}”" → "✓ Edit applied". Target glows blue.
- Writing placeholder card: 280×172 dashed, dotted spinner, "Writing {page}…".
- Flows: colours `#3b82f6 #22c55e #f59e0b #ef4444 #a855f7`, bezier edges, error
  paths dashed red "6 3", legend pill.
- Design-check chip: amber, "✓ {n} design check finding(s) — click for
  details".

## Experiment board (page takes)

Root `#10101a`; header "Experimenting with {page}" + “{instruction}”; path bar
"You are on" › chips; dotted board `radial-gradient(circle at 1px 1px,#1a1f2a
1px,transparent 0) 0 0/22px 22px`; take 240×150; branch colours `#3b82f6
#f59e0b #10b981 #ec4899 #a78bfa #06b6d4`, root `#8b93a7` "The page now"; lines
are beziers with chevrons; selected take outline 2px `#0b7aff`. Side panel
340px: "Use this one", "Change it · grows 3 takes out of this one", chips
"Warmer", "Darker", "More space", "Bolder headline", "Different photo",
Subtle|Strong, "Grow 3 from this". Start card: "Generate 3 takes".

## Asset generation (`GenerateAsset.tsx`, `views/generate/TakeBoard.tsx`)

- Full overlay in the Assets surface. Header "Generate an asset" + per-stage
  subtitle (ask: "Say what it is. Caret works out how it looks from your
  foundation."; board: "Change a take to grow a branch from it. Use any take to
  save it; the board stays open.").
- Ask stage: "What are you making?"; kind pills "A photograph or image", "A
  texture or pattern", "A logo or mark", "A 3D object", "An animated
  background"; prompt box (15px textarea); Shape select, "No background";
  "Help with the prompt": cards "Polish it", "Ask me first", "Use my words";
  primary "Generate 4 takes" with ⌘↵.
- Board: segmented "Your words" | "Caret's brief"; "You are on" breadcrumb;
  dotted board; take 200 wide (133 at 3:2); 4 first takes then 2 per change;
  root "First takes" grey; lines as above; take states "waiting…", "making…";
  saved badge `@tag` emerald. Inspector 340px: "Change it · grows 2 takes out
  of this one", chips "Warmer light", "Closer in", "Simpler background", "More
  room for text", "Different angle", Subtle/Strong, "Grow 2 from this", name
  input "@" + "Use" → "Saved as @x".
- Board IPC: `generate:boardStart` → BoardWire; updates on `generate:board`
  event (version must increase). Script: 4 waiting takes + `briefing:true` →
  brief arrives → takes working → ready with `preview` data URLs.
- Mark: "The model draws it, sees its own render, and corrects — three
  rounds."; shown at size and at 20px. Shader: "Running live — {n} round(s) on
  {model}. Drag the knobs; tuning is free." with live WebGL and knobs.

## Skills and Libraries

- Frame: header h1 18px semibold + muted subtitle + "Done"; tabs as pills,
  active inverted (white bg, dark text); cards `rounded-xl border bg-shell-panel
  p-4`, grid `minmax(260px,1fr)`.
- Skills subtitle: "Design skills are written guidance that tells the AI how to
  design. Caret picks a short list of good ones so you don't have to search for
  them." Six: Frontend Design (Anthropic), Impeccable (Paul Bakaus), Design
  Taste (Leonxlnx), Design Engineering (Emil Kowalski), shadcn/ui (shadcn), Web
  Interface Guidelines (Vercel). Install → "Installing…" → "Installed". Chat
  chip "Skill: {name}".
- Libraries subtitle: "Libraries the AI can search: ready-made components to
  build with, and screenshots of real products for reference. Caret picks a
  short list of good ones so you don't have to search for them." Components:
  shadcn registries, Aceternity UI, 21st.dev; References: Lazyweb, Gummble.
  States "Ready", "Connecting…", "Sign in", "Paste key". On/Off toggle.

## Foundation (`DesignSystemView.tsx`)

"This project's design system" eyebrow, h1 = "Display · Body" fonts, summary,
rule with a left accent bar, "How this was decided". Sections Colour,
Typography ("The quick brown fox jumps"), Spacing, Corners, Depth & motion,
Vibe; each with "Edit". Sections rise in: 560ms `cubic-bezier(0.16,1,0.3,1)`
from 14px, staggered 110ms.

## Brand

Logo: navy (`#16233d`) open square frame around a caret chevron whose right
leg is `#0b7aff`; always shown on a white rounded tile in the app
(`docs/reference/caret-logo.png`). README line: "A design layer that lives in
your repo." Website hero (owner's own words): "Your design shouldn't live
outside your codebase."
