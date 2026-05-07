<p align="center">
  <img src="./docs/webception-logo.svg" width="84" alt="Webception logo" />
</p>

<h1 align="center">Webception</h1>

<p align="center">
  A local-first website studio for sketching, styling, animating, and exporting polished static pages.
</p>

<p align="center">
  <img src="./docs/webception-banner.png" alt="Webception editor banner" />
</p>

## Overview

Webception is a freeform website builder built with React, TypeScript, and Vite. It gives you a Wix-like canvas where you can add page sections, move and resize elements, tune visual styles, preview responsive layouts, and export the finished page as a static ZIP.

The app runs entirely in the browser. Projects are saved locally with `localStorage`, so it is useful for quick landing pages, Hack Club-style demos, portfolio pages, event pages, and experiments that need a fast static-site export.

## Highlights

- Freeform drag-and-resize canvas
- Desktop, tablet, and mobile frame modes
- Per-device placement overrides for responsive layouts
- System, light, and dark editor themes
- Font picker with Satoshi, General Sans, Hind, and Nunito
- Starter, portfolio, and event templates
- Undo, redo, duplicate, delete, layer controls, clear all, and reset starter
- Animation controls for fade, rise, slide, scale, blur, duration, delay, easing, and looping
- One-click ZIP export containing `index.html`, `styles.css`, and `script.js`

## Builder Blocks

Webception includes a starter palette of common page pieces:

- Structure: navbar, hero, footer, divider, spacer
- Content: text, rich text, button, image, gallery, video placeholder
- Sections: card, card grid, features, pricing, testimonial, FAQ, stats, contact
- Shapes: rectangle, circle, line, pill, blob, badge, icon mark

## How It Works

1. Pick a starter template or add blocks from the left panel.
2. Select an element on the canvas.
3. Drag it into place, resize it, or enter exact values in the inspector.
4. Adjust copy, colors, typography, borders, shadows, opacity, and rotation.
5. Switch between desktop, tablet, and mobile modes to tune responsive placement.
6. Add animation settings and preview them in the editor.
7. Press **Download** to export a ready-to-host static site ZIP.

## Tech Stack

- **React 19** for the editor UI
- **TypeScript** for application code
- **Vite** for development and production builds
- **JSZip** for static-site export generation
- **Playwright** for end-to-end coverage
- **ESLint** for code quality checks
- Plain CSS for styling

## Project Structure

```text
.
|-- docs/                  # Usage notes, roadmap, release notes, and artwork
|-- public/                # Static assets served by Vite
|-- src/
|   |-- App.tsx            # Builder state, editor UI, export generation, interactions
|   |-- App.css            # Main editor styling
|   |-- index.css          # Global styles
|   `-- main.tsx           # React entrypoint
|-- tests/                 # Playwright E2E tests
|-- index.html             # Vite HTML shell
|-- package.json           # Scripts and dependencies
|-- playwright.config.ts   # E2E test config
`-- vite.config.ts         # Vite config
```

## Requirements

- A recent Node.js LTS release
- npm, using the included `package-lock.json`

## Run Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build a production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Quality Checks

Run the TypeScript and Vite production build:

```bash
npm run build
```

Run ESLint:

```bash
npm run lint
```

Run Playwright tests:

```bash
npm run test:e2e
```

The E2E suite covers adding and editing elements, positioning blocks, previewing animations, downloading the ZIP export, switching themes, applying templates, and clearing the canvas.

## Export Output

The exported ZIP is named `webception-site.zip` and contains:

- `index.html`
- `styles.css`
- `script.js`

The generated site includes layout styles, responsive overrides, Fontshare font links, and CSS animation keyframes. It is intended to be uploaded to any static host or unpacked into a static site project.

## Documentation

- [Usage guide](./docs/usage-guide.md)
- [Roadmap](./docs/roadmap.md)
- [Release notes](./docs/release-notes.md)
- [Publish checklist](./docs/publish-checklist.md)

## Project Status

Webception is a working local-first builder prototype. The current focus is making the editor fast for static page composition, with future improvements planned around snapping, grouped selection, more templates, reusable color palettes, ZIP import, richer form behavior, and hosted preview integrations.
