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
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#000000"
    rounded: "{rounded.md}"
    padding: "12px 24px"
---

# Design System: Shytlist

## 1. Overview

**Creative North Star: "The Kinetic Viewfinder"**

Shytlist is a high-performance production tool that feels like an extension of a camera's hardware. It prioritizes speed, precision, and clarity through a "Deep Space" aesthetic—dark backgrounds, vibrant neon accents, and crisp, technical typography.

**Key Characteristics:**
- **High Contrast:** Saturated neons against pure charcoal/black backgrounds.
- **Precision Typography:** Tight tracking and leading in headers; clean mono-spaced data.
- **Liquid Glass Elevation:** Depth is conveyed through semi-transparent panels with sharp refraction borders.
- **Purposeful Motion:** Spring-based transitions that confirm intent and reduce anxiety.

## 2. Colors

The palette is rooted in the high-visibility colors of film sets—cyan for focus, yellow for caution/action.

### Primary
- **Electric Viewfinder Cyan** (#37CAFF): The primary action and focus color. Used for progress, primary buttons, and active states.

### Secondary
- **Production Warning Yellow** (#FFE837): Used for high-priority actions (like "New Project") and highlighting critical pacing data.

### Neutral
- **Deep Studio Black** (#050505): The foundational canvas.
- **Surface Gray** (#121212): Used for card backgrounds and elevated panels.
- **Border Smoke** (#1f1f1f): Subtle dividers and refraction edges.

### Named Rules
**The Rarity Rule.** Neon accents must be used sparingly. The interface should be 90% neutral; the colors are for direction, not decoration.

## 3. Typography

**Display Font:** Geist
**Body Font:** Geist
**Label/Mono Font:** Geist Mono

### Hierarchy
- **Display** (600, clamp(2.5rem, 7vw, 6rem), 0.85): Hero headlines.
- **Headline** (600, 3rem, 1): Section headers.
- **Body** (400, 1rem, 1.6): Default text. Max line length 65ch.
- **Label** (600, 0.75rem, uppercase, 0.2em tracking): Metadata and micro-labels.

## 4. Elevation

Shytlist uses a "Liquid Glass" strategy. Depth is not created by traditional soft shadows, but by layering semi-transparent surfaces with bright, thin top-borders to simulate glass refraction.

### Shadow Vocabulary
- **Diffusion Shadow** (0 20px 40px -15px rgba(0,0,0,0.5)): Used on modals and cards to separate them from the background.
- **Inner Refraction** (inset 0 1px 0 rgba(255,255,255,0.1)): Required on all .glass panels.

## 5. Components

### Buttons
- **Shape:** Rounded (12px)
- **Primary:** Electric Cyan background, black text.
- **Accent:** Warning Yellow background, black text.

### Cards
- **Style:** .glass (121212 at 50% opacity, 12px blur, 1px border-white/5)
- **Corner Style:** Rounded-3xl (32px)

### Inputs
- **Style:** Deep Black background, 1px Border Smoke.
- **Focus:** Warning Yellow border (50% opacity) with subtle ring.

## 6. Do's and Don'ts

### Do:
- **Do** use Geist Mono for all numerical data.
- **Do** apply a 1px top-border highlight to glass panels.
- **Do** use spring physics for all interactive transitions.

### Don't:
- **Don't** use soft, blurry colored glows (outer-glows).
- **Don't** use Inter or system-sans fonts.
- **Don't** use purple or "AI-gradient" aesthetics.
- **Don't** wrap everything in a card; use negative space to group logic where possible.
