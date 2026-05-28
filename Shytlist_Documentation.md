# Shytlist - Project Context Handoff

This file is a detailed handoff document for future agents or collaborators opening this project. Read this before editing the code. It captures the product goal, technical constraints, design guidelines, file layout, database schemas, visual rules, known good/bad behaviors, and iteration history of the Shytlist application.

---

## Project Identity

* **Title**: Shytlist
* **Genre**: Cinematic Shotlist Builder & Production Organizer
* **Target Audience**: Indie filmmakers, student film crews, and agile commercial production teams working in fast-paced, high-pressure environments.
* **Technology Stack**: React 19 (TypeScript), Vite 6, Tailwind CSS 4, Motion, Supabase (Auth, Postgres, Storage), Vercel.
* **Main User Goal**: Turn the stressful, manual task of shotlisting into an automated, visual, and frictionless experience with real-time on-set metrics and premium PDF/CSV exports.

The design is inspired by high-end hardware interfaces (like Linear, Raycast, and Vercel) using deep space black canvases, responsive structures, tactile haptic physics, and glowing ambient overlays.

---

## Core Fantasy & Product Purpose

On-set filmmaking is highly stressful. Shytlist aims to give filmmakers "Effortless Control" by automatically calculating key metrics (setup timings, transitions, film runtimes) and providing clean visual storyboards, bypassing the administrative bloat of complex enterprise database systems and standard spreadsheets.

---

## Current File Layout

The codebase is organized as follows:

* [package.json](file:///c:/Users/SYAIR/Documents/Project/Shytlist/package.json): Lists build commands and minimal active dependencies.
* [vite.config.ts](file:///c:/Users/SYAIR/Documents/Project/Shytlist/vite.config.ts): Configures React and Tailwind plugins, static sitemaps, resolve aliases, and HMR settings.
* [index.html](file:///c:/Users/SYAIR/Documents/Project/Shytlist/index.html): Direct entry point for the browser.
* **`/src`**:
  * [main.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/main.tsx): Direct entry point for compilation. Mounts the React virtual DOM tree.
  * [App.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/App.tsx): Main router. Handles protected routes and page transition wrappers.
  * [index.css](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/index.css): Core design tokens. Contains the dark-theme colors, custom scrollbars, float animations, and utility styles.
  * [types.ts](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/types.ts): Data model structures. Defines `Shot` and `Project` TypeScript types.
  * **`/lib`**:
    * [supabase.ts](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/lib/supabase.ts): Supabase client initialization with environment variable presence checks.
    * [AuthContext.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/lib/AuthContext.tsx): Global state manager for authenticated user sessions.
    * [useShotlist.ts](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/lib/useShotlist.ts): React hook managing shot CRUD actions and real-time database subscription syncs.
  * **`/components`**:
    * [Layout.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/components/Layout.tsx): Layout wrapper containing background radial glow meshes, noise filters, and the detached glass nav capsule.
    * [Logo.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/components/Logo.tsx): Vector asset for the Shytlist brand emblem.
  * **`/views`**:
    * [LandingPage.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/views/LandingPage.tsx): High-fidelity feature presentation and marketing page.
    * [Auth.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/views/Auth.tsx): User signup and login views.
    * [Projects.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/views/Projects.tsx): User projects dashboard.
    * [Contact.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/views/Contact.tsx): Simple contact form.
    * [ShotlistEditor.tsx](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/views/ShotlistEditor.tsx): Master workspace containing the interactive editor, drag-and-drop triggers, metrics dashboards, and PDF/CSV compilers.
* **`/supabase`**:
  * [schema.sql](file:///c:/Users/SYAIR/Documents/Project/Shytlist/supabase/schema.sql): PostgreSQL schema containing table declarations, indexing, row-level security, and storage bucket definitions.
  * [advisor.json](file:///c:/Users/SYAIR/Documents/Project/Shytlist/supabase/advisor.json): Database linter advisory outputs.

---

## Build & Run Instructions

### 1. Requirements
Ensure you have Node.js and a Supabase project set up.

### 2. Configure Environment
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install & Start Development Server
```bash
npm install
npm run dev
```

### 4. Rebuild from Scratch (Clear HMR Cache)
If the dev server throws stale asset errors or cached HMR overlay warnings, clean up local cache directories and restart:
```powershell
Remove-Item -Path node_modules/.vite, dist -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

### 5. Production Compilation
```bash
npm run build
npm run preview
```

---

## Technical Constraints

* **Styling lock**: Do not introduce Tailwind utility bloat or third-party component libraries. All styling is declared via [index.css](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/index.css) and clean CSS tokens.
* **Security & Auth**: RLS is fully active. Private pages inside `/projects/*` routes must maintain `noindex, nofollow` headers to block indexing by search engine crawlers.
* **Database Access**: Always use [useShotlist.ts](file:///c:/Users/SYAIR/Documents/Project/Shytlist/src/lib/useShotlist.ts) for shotlist mutations. Do not call raw Supabase endpoints directly in views if hooks exist.

---

## Database Model & Backend Schema

Defined in [schema.sql](file:///c:/Users/SYAIR/Documents/Project/Shytlist/supabase/schema.sql):

### 1. `public.projects` Table
* `id` (uuid, primary key, default: `uuid_generate_v4()`)
* `user_id` (uuid, references `auth.users(id)` on delete cascade)
* `title` (text, not null)
* `director` (text, default: `''`)
* `dp` (text, default: `''`)
* `company_logo_url` (text, nullable)
* `created_at` (timestamptz, default: `now()`)

### 2. `public.shots` Table
* `id` (uuid, primary key, default: `uuid_generate_v4()`)
* `project_id` (uuid, references `public.projects(id)` on delete cascade)
* `shot_no` (text, not null)
* `scene_no` (text, not null)
* `shot_size` (text, default: `''`)
* `lens` (text, default: `''`)
* `movement` (text, default: `''`)
* `angle` (text, default: `''`)
* `framing` (text, default: `''`)
* `description` (text, default: `''`)
* `storyboard_url` (text, nullable)
* `created_at` (timestamptz, default: `now()`)

### 3. Database Indexes
* `idx_projects_user_id` on `public.projects(user_id)`: Speeds up RLS queries.
* `idx_shots_project_id` on `public.shots(project_id)`: Speeds up shotlist fetches in editors.

### 4. Database RPC Functions
* `public.reorder_shots(p_shot_ids uuid[], p_shot_numbers text[], p_scene_numbers text[])`:
  * Updates `shot_no` and `scene_no` in bulk.
  * Uses `SECURITY INVOKER` to guarantee RLS boundaries are respected.

### 5. Storage Buckets
* `logos`: Public storage for corporate brand logos. Restricted to authenticated users.
* `storyboards`: Public storage for storyboard drawings. File size is capped at 1MB (`1048576 bytes`). Restricted to authenticated project owners.

---

## UI/UX Design Specifications & Tokens

### 1. Color Palette
* **Deep Studio Black** (`#050505`): Core application backdrop.
* **Surface Gray** (`#121212`): Card and dashboard panel backgrounds.
* **Border Smoke** (`#1f1f1f`): Outlines and dividers.
* **Electric Viewfinder Cyan** (`#37CAFF`): Focus lines, active buttons, reordering drag handles.
* **Production Warning Yellow** (`#FFE837`): Key CTAs, warnings, and metrics highlights.

### 2. Typography Rules
* **Geist** (sans-serif) for displays and headings.
* **Geist Mono** for shot numbers, timestamps, and metrics.
* **The Mono Data Rule**: Geist Mono is enforced for all numerical and metadata values to ensure readability in high-glare filming environments.
* **The Rarity Rule**: Neon accents (Cyan/Yellow) must occupy ≤10% of screen pixels. Accents guide user attention to critical actions, not decoration.

### 3. Custom Structures
* **Detached Capsule Nav**: Navbar floats at the top as a detached pill (`sticky top-4 bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-full`).
* **Concentric Doppelrand**: Cards use nested borders (outer wrapper container with `bg-white/[0.02] border border-white/5 p-2 rounded-[2rem]` + inner container with `bg-zinc-950/80 border border-white/10 rounded-[calc(2rem-0.5rem)]`). Inset highlights (`shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`) simulate light refraction.
* **Ambient Lighting**: Animated gradients (`bg-brand-cyan/8` and `bg-brand-yellow/4`) float slowly behind workspaces, layered with a pointer-events grain overlay.

---

## Iteration & Handoff History

### Known Good (User Approved Behaviors)
* **3x2 Landscape Storyboard PDF Export**: Pages fit exactly 6 cards (3 columns, 2 rows) on A4 landscape sheets.
* **Branded Charcoal Header Banner**: Header banner containing titles, metrics, and corporate logos is rendered on every page of the storyboard export.
* **Proportional Logo Fitting**: Logos do not stretch on exports. They are calculated dynamically to fit inside a `30mm x 18mm` boundary and aligned to the right.
* **Uniform Card Fills**: Storyboard cards in the editor and PDF match the gallery view structure (aspect-video storyboard box, shot size, specs row, and truncated description).
* **Decoupled Packages**: Pruned 123 unused node modules (including `express`, `@google/genai`, and `dotenv`) to optimize compile times and bundle size.

### Known Bad (Avoid Re-introducing)
* **Vertical / Portrait Storyboard exports**: The user explicitly rejected vertical stacks or portrait 2x3 configurations. Keep the 3x2 landscape layout.
* **Stretched Logo Graphics**: Do not hardcode image sizes on PDF rendering. Always calculate the aspect ratio.
* **Jittery/Unequal cards**: Storyboard cards in gallery view must maintain uniform aspect ratios and card sizes regardless of text description length.

---

## Style and Editing Guidelines

When modifying this repository:
* Maintain clean naming conventions. Keep state declarations clustered at the top of components.
* **Do not use emojis** in code comments, markup, logs, or agent responses.
* Keep codebase links clickable by using standard markdown format with the `file://` scheme.

---
name: Shytlist
description: Shotlist tool for Directors of Photography and filmmakers.
colors:
  primary: "#37CAFF"
  accent: "#FFE837"
  background: "#050505"
  surface: "#121212"
  border: "#1f1f1f"
typography:
  display:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.85
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  mono:
    fontFamily: "Geist Mono, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#000000"
    rounded: "{rounded.full}"
    padding: "12px 24px"
    
---

# Design System: Shytlist

## 1. Overview

**Creative North Star: "The Kinetic Viewfinder"**

Shytlist is a high-performance production tool that feels like an extension of a camera's hardware. It prioritizes speed, precision, and clarity through a "Deep Space" aesthetic—dark backgrounds, vibrant neon accents, and crisp, technical typography.

**Key Characteristics:**
- **High Contrast:** Saturated neons against pure charcoal/black backgrounds.
- **Ambient Lighting:** Breathing, organic background mesh glow blobs that shine through transparent glass panels.
- **Precision Typography:** Tight tracking and leading in headers; clean mono-spaced metadata.
- **Double-Bezel Curved Elevation:** Concentric curved borders with highlights that simulate physical camera hardware viewfinders.
- **tactile Spring Physics:** Interpolated hover, active, and load animations to reduce user anxiety.

## 2. Colors

The palette is rooted in the high-visibility colors of film sets—cyan for focus, yellow for action/warning.

### Primary
- **Electric Viewfinder Cyan** (#37CAFF): The primary action and focus color. Used for progress, active nav states, and indicator widgets.

### Secondary
- **Production Warning Yellow** (#FFE837): Used for high-priority creation triggers (like "New Project") and highlighting critical pacing data.

### Neutral
- **Deep Studio Black** (#050505): The foundational canvas.
- **Surface Gray** (#121212): Used for card backgrounds.
- **Border Smoke** (#1f1f1f): Dividers and outer border outlines.

### Named Rules
**The Rarity Rule.** Neon accents must be used sparingly (≤10%). The interface should be 90% neutral; colors are for direction, not decoration.

## 3. Typography

**Display Font:** Geist  
**Body Font:** Geist  
**Label/Mono Font:** Geist Mono  

### Hierarchy
- **Display** (600, clamp(2.5rem, 7vw, 6rem), 0.85): Hero headlines.
- **Headline** (600, 3rem, 1): Section headers.
- **Body** (400, 1rem, 1.6): Default text. Max line length 65ch.
- **Label** (600, 0.75rem, uppercase, 0.2em tracking): Metadata and micro-labels.

**The Mono Data Rule.** All numerical and metadata values must use Geist Mono for technical clarity on set.

## 4. Layout & Navigation

### Detached Floating Capsule Nav
The navigation header is detached from the viewport edges and styled as a floating pill (`sticky top-4 mt-4 mx-auto max-w-5xl rounded-full border border-white/10 bg-zinc-950/60 backdrop-blur-xl px-6 py-2.5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]`).

### Dynamic Background Glows
Underneath the layout, two slowly animating radial gradients (`bg-brand-cyan/8` and `bg-brand-yellow/4`) float in opposite directions. Overlaying the entire page is a fixed, pointer-events-none noise overlay at `z-50 opacity-[0.015]` to create film-grain texture.

## 5. Elevation & Doppelrand Structures

Shytlist uses a nested Concentric Doppelrand architecture to simulate machined camera hardware plates.

### Doppelrand Formula
- **Outer Shell**: A wrapper container with `bg-white/[0.02] border border-white/5 rounded-[2rem] p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]`.
- **Inner Core**: A nested content container with `bg-zinc-950/80 border border-white/10 rounded-[calc(2rem-0.5rem)]`.
- **Inner Highlight**: An inset shadow (`shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`) on the inner border to simulate light refraction.

## 6. Components

### Button-in-Button CTA
Primary triggers are fully rounded pills. The label is paired with a distinct circular icon container on the right side of the pill.
- **Hover physics**: The outer pill scales up slightly (`scale-[1.02]`), while the inner icon scales up (`scale-105`) and rotates or slides diagonally.
- **Active state**: The entire component scales down (`scale-[0.98]`) to simulate a physical button press.

### Inputs
- **Style**: Deep Black background, 1px Border Smoke.
- **Focus**: Warning Yellow border (50% opacity) with a subtle ring.

## 7. Do's and Don'ts

### Do:
- **Do** use Geist Mono for all numerical data.
- **Do** apply concentric curves to major dashboard panels.
- **Do** make inner components transparent/glassmorphic to blend with background gradients.
- **Do** use spring physics (`cubic-bezier(0.32, 0.72, 0, 1)`) for transitions.

### Don't:
- **Don't** use soft, outer glows on buttons or text.
- **Don't** use Inter or system-sans fonts.
- **Don't** use purple or AI-gradient aesthetics.
- **Don't** use emojis in code, markup, or copy.

---

## Suggested Future Improvements
* **Real-time Co-editing**: Implement Supabase Realtime channel listeners in the hooks to allow multiple users to edit the same shotlist concurrently.
* **Cinematic Script Analyzer**: Add script parser hooks to auto-generate shot descriptions.
* **Visual Lighting Planner**: Create interactive canvas panels to design set lighting layout positions.

---

## Current Handoff Summary

Shytlist is a responsive, highly optimized web application for filmmakers to build, organize, and export shotlists. It features dual-view options (Table and Gallery), sequence presets, automatic runtime calculations, and storyboard image uploads. Exports compile dynamically into landscape PDFs with proportional logo scaling. The backend uses RLS-restricted tables and security invoker RPC scripts on Supabase. Future modifications must respect the "Kinetic Viewfinder" theme, the Mono Data Rule, and the aspect-ratio calculations on PDF compiling.
