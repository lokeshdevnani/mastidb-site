# MastiDB website brief

Build a polished website for MastiDB, a single-node, on-disk, columnar OLAP engine written in Python. The audience is engineers curious about database internals. The site should make the implementation understandable and invite them to inspect the GitHub repository. Treat the repository as the source of truth for current behavior, commands, links, limitations, and terminology.

## Direction

The juxtaposition is intentional: a playful name and mascot around a genuinely considered database engine. Make the visual design modern, flat, and restrained. The technical explanations should be accurate, approachable, and specific. Do not call the project production-ready or imply it competes with mature databases. Do not praise decisions with adjectives such as “brilliant” or belittle them as “just a toy”; explain the choice, what it enables, and its cost.

Explore the repository and `../old-site` before implementation. Reuse the working MastiDB internal-file-layout component from `../old-site`, adapting its presentation to the new site without rebuilding or replacing its behavior. Locate the supplied transparent animated WebP of the mascot. It transitions from thinking to winking and pointing; use that actual asset in the hero. Preserve the entire character, including its legs, at common viewport sizes. Do not crop it with `object-fit: cover`, enlarge it until it clips, or add another looping zoom animation. Respect reduced-motion preferences.

The supplied desktop and mobile mock images are **visual direction**, not screenshots to reproduce literally. They show the intended density, palette, and broad composition. The headline, words, sample SQL, figures, mascot pose, and even some feature labels in the mocks may be inaccurate. This brief and the current repository take precedence. Replace the mock mascot with the supplied WebP. The mobile mock is a composition reference; make a genuinely narrow responsive layout rather than shrinking its columns.

## Design system

These are starting tokens, not an excuse to recolor the supplied mascot or rewrite the working component. Keep a single coherent token file so colors and spacing can be tuned together after a browser review.

| Token | Starting value | Use |
| --- | --- | --- |
| `--ink` | `#14203A` | Headings, primary text, terminal backdrop family |
| `--muted` | `#52617A` | Supporting text, labels |
| `--brand` | `#5343E8` | Interactive emphasis, active query step, links |
| `--brand-blue` | `#4776EB` | Diagram paths and secondary accents |
| `--surface` | `#FFFFFF` | Main canvas and cards |
| `--surface-tint` | `#F5F8FE` | Alternating section panels |
| `--lavender` | `#F1EFFF` | Selected and explanatory states |
| `--line` | `#DCE4F0` | Borders and dividers |
| `--terminal` | `#17243B` | Terminal background |

Use semantic state colors sparingly in the diagrams, with both text and shape cues: dictionary violet, encoded row IDs soft coral, bitmap warm amber, result blue/green if needed. Do not make meaning depend on color alone. Avoid rainbow feature cards, glossy gradients, thick shadows, and glass effects. The mascot supplies the playful energy; the interface should stay calm.

- **Type:** Use **Manrope** for headlines and UI, **Inter** for paragraphs and dense explanatory text, and **JetBrains Mono** for terminal/code/data labels. If the project already includes a close, well-licensed font, reuse it instead of adding three downloads. Self-host font files where practical, use `font-display: swap`, and provide system fallbacks. Avoid tiny all-caps labels as the only way to understand a section.
- **Scale:** Desktop hero headline `clamp(3.25rem, 5vw, 5rem)` with roughly 1.05 line height; mobile `clamp(2.4rem, 10vw, 3.3rem)`. Section headings about 2–2.75rem desktop and 1.75–2.1rem mobile. Body 16–18px, 1.5–1.65 line height. Keep line lengths around 60–75 characters in prose.
- **Layout:** Main content max width about 1200px, centered. Side gutters 24–48px desktop and 20–24px mobile. Use an 8px spacing rhythm, with 80–112px between major desktop sections and 56–72px on mobile. Cards can use 16–20px radius, 1px borders, and minimal shadows. Do not make every section a giant identical rounded panel.
- **Hero composition:** On wide screens, balance headline/actions on the left against a full-body mascot and legible terminal on the right; the pathway can sit around or beneath them. Give the headline enough width to read naturally. Do not force a fixed hero height. On narrow screens stack headline, CTAs, mascot, and terminal; keep the mascot noticeably smaller than in the desktop composition and fully visible. The terminal should allow horizontal scrolling without shrinking code to unreadable text.
- **Navigation:** Compact header with MastiDB wordmark, anchors to How it works / File format / About or Status as appropriate, and GitHub. Avoid nav items for pages that do not exist. Mobile navigation must open reliably and preserve keyboard focus.
- **Interactions:** Make the query stages look like a guided tool, not a carousel of marketing cards. On mobile, show one focused stage, its explanation, and explicit Back / Next controls. Keep controls at least 44px high, visible focus rings, and a plain static state for reduced motion. The file-layout component may have its own established interactions; preserve them.
- **Motion:** 150–250ms for state changes is enough. Animate the diagram only when the visitor advances a query step. Let the provided WebP supply the hero's character motion. Do not add scroll hijacking, parallax, or automatic stage progression.

Before polishing details, render the page at roughly 1440px and 390px widths and compare hierarchy, overflow, mascot visibility, terminal legibility, and where each section begins. Use the mock images to judge the overall feel; use the rules above to resolve discrepancies.

## Implementation and deployment

Use **Astro** and target **Vercel**. Build this as a statically generated site unless inspection of the existing code reveals a real need for server rendering. The guided query is predefined client-side state; it does not require an API or database server. A static Astro site can be deployed to Vercel without an adapter; add `@astrojs/vercel` only if an actual Vercel service or on-demand route needs it. Keep most of the page as Astro-rendered HTML. Hydrate only the query walkthrough and the reused file-layout component (if it requires client-side hydration). Preserve the latter's existing framework if practical rather than rewriting it to fit a new stack.

Use TypeScript for interactive state and a small data model for query steps. The examples should be deterministic and work without network requests. Keep layout and color tokens centralized in CSS; choose plain CSS or the repo's existing styling approach rather than introducing a large styling dependency solely for this page. Optimize the mascot WebP and other images without losing transparency or visible limbs. Include sensible page title, description, social preview image, favicon, and semantic section landmarks. Check the built site locally, then configure and verify a Vercel preview deployment; leave the final production domain mapping consistent with the project's existing setup.

## Page structure

### 1. Hero

Use this headline exactly as the starting point:

> A serious OLAP database engine. Written in Python.

Follow with one short, concrete sentence about exploring how a columnar engine stores data and answers queries. Make it clear, near the top, that this is an experimental project built from scratch. Place the thinking → wink → point mascot near a compact visual path from SQL to result, alongside a terminal. Let the mascot draw attention to the engine rather than dominate the layout.

The hero terminal should demonstrate the real installation and basic usage commands verified against the current repo, including `pip install mastidb`. Show a small example query and plausible output based on a known sample, or label illustrative output clearly. Add copy controls where useful. Primary CTA: **View on GitHub**. Secondary CTA: **Copy install command** or **Get started**. Do not create a separate installation section.

### 2. Why I built it

Write in the first person, as a concise three-beat story: working on Apache Druid and query performance at Udaan/Percept Insight; studying database systems and wanting to understand the underlying choices; building MastiDB to connect those ideas from bytes on disk to query result. Give the story a human voice, but keep it shorter than a blog post. Link to a fuller account if the existing project writing provides one. Do not invent anecdotes or employment details beyond verified sources.

### 3. Follow a query

Create an interactive, guided explanation of one representative supported query. A visitor presses **Run query** and steps through a faithful, predefined trace; this is an explanatory simulation, not a live SQL service or free-form editor. Show the actual query throughout, highlight the part of the data involved at each step, and make the result change understandable.

Suggested stages, adjusted to match the exact chosen query and code: parse the request → find the filter value in a sorted dictionary → get matching row IDs from a bitmap → fetch only needed columns in batches → aggregate using dictionary IDs/partial state → show the final result. If a stage is not used by that query, do not pretend it is. Include back/next/replay controls and short explanations beside the visualization. The interaction must also work by keyboard and remain understandable with motion disabled.

### 4. Look inside a segment

Introduce the on-disk layout in two or three sentences, then embed the existing working component from `../old-site`. Follow it with only a few observations: where the dictionary, encoded values, and bitmap index live; how the engine reaches a relevant byte range; and one meaningful space or ingest tradeoff. The component should carry the detail. This section is separate from the query walkthrough, but the two should use consistent colors and terminology.

### 5. The techniques

Use compact, scannable cards for techniques actually present in the repository. Likely candidates are columnar segments, dictionary encoding, bitmap filtering, memory-mapped reads, late materialisation, batching, mergeable partial aggregation, and MyPyC compilation. Do not turn this into an unqualified feature grid. Each card should answer: **what problem arises, what MastiDB does, and what it costs or limits**. Link to the architecture material for the complete explanation. Prioritize the most illuminating four to six cards if eight make the page too long.

### 6. Where it stands

Briefly describe what currently works and what is still limited, based on the current repository. State the experimental status plainly. Mention a few concrete performance improvements in words and link to measured results and their test conditions; do not make a large benchmark chart or unsupported comparison to another database. Call out correctness limitations honestly if they still exist in the current code. Present these as the current engineering state and next questions, without a triumphal or apologetic tone.

### 7. Closing

Invite the visitor to inspect the implementation: **Explore the GitHub repo** is the clear primary action. Add a quiet secondary **Buy me a coffee** link to `https://buymeacoffee.com/lokeshdevnani` (verify the destination). Include links to architecture and installation documentation where appropriate. The support link should not interrupt the technical narrative.

## Interaction and writing rules

- Use purposeful motion: the supplied mascot animation, a query trace that responds to user steps, and the existing file-layout component. Avoid continuous page-wide motion, scroll effects that obscure content, or ornamental animation without explanatory value.
- Keep the hero, terminal, trace, and file component usable on mobile. The terminal can scroll horizontally; labels and controls must stay readable and tappable.
- Use direct, conversational copy. Explain OLAP briefly where a newcomer would need it, while keeping the technical details useful for engineers. Avoid generic claims such as “blazing fast,” “revolutionary,” or “production-grade.”
- Verify every command, SQL feature, dataset example, performance statement, and implementation claim against the repository. Follow its current source and tests if older site copy disagrees. Avoid implying the guided simulation runs arbitrary queries.
- Keep the source code for the interactive explanations easy to maintain. Use a structured trace/data model so the labels, highlighted data, and explanatory text stay in sync.

## Done when

The first screen communicates what MastiDB is and provides a credible way to try it. A visitor can step through one query, inspect the real file-layout component, understand several deliberate design choices and limitations, and reach the repository. Check desktop and narrow mobile layouts, keyboard navigation, reduced motion, visible mascot legs, terminal copy actions, all outbound links, and factual alignment with the current repo.
