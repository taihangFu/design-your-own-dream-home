# Roomplay Studio

A dependency-free MVP for a playful interior design app. It turns a structured 2D room into an interactive isometric 3D canvas and lets users furnish, recolor, save, and revisit their space.

## Open the app in Codex Cloud

`localhost` inside Codex Cloud refers to the cloud workspace, not your own computer. To open the app:

1. Open a terminal for this repository.
2. Start the server:

   ```bash
   npm run dev
   ```

3. Wait for `Roomplay Studio is running on port 4173`.
4. Open Codex's **Ports** or **Preview** control and choose port **4173**. Do not type the `localhost` address into a browser on your own computer.
5. Keep the terminal process running while using the preview. Stop it with `Ctrl+C` when finished.

The server binds to `0.0.0.0` so the Codex port preview can reach it. If Codex assigns a different port, start it with `PORT=3000 npm run dev` and preview port `3000` instead.

## Open the app on your own computer

Clone or download the repository, then run:

```bash
npm run dev
```

Open <http://localhost:4173> in your browser. No `npm install` is needed because the prototype has no third-party dependencies.

## Test

```bash
npm test
npm run check
```

## Prototype features

- Switch between an isometric 3D room and measured 2D plan
- Add six types of furniture from a searchable catalog
- Select, drag, rotate, duplicate, recolor, and delete furniture
- Recolor walls and flooring
- Undo and redo changes
- Automatically save the project in browser local storage
- Responsive layout for desktop, tablet, and compact screens

## Architecture

`project.js` contains the engine-independent project model and immutable furniture operations. `app.js` owns editor state, history, persistence, input, and canvas rendering. The UI intentionally uses native browser APIs, so this prototype installs and runs without third-party dependencies.

## MVP limitations and next steps

The starter room shell is fixed. A production follow-up should add wall-drawing tools, doors and windows, calibrated floor-plan image upload, user accounts, server-side project storage, and optimized GLB furniture in a WebGL scene. Floor-plan recognition should begin as editable suggestions rather than a fully automatic promise.
