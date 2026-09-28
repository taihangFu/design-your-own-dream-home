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

- Upload a PNG/JPEG floor plan, adjust its scale and opacity, and trace walls in 2D
- Generate the isometric 3D room from editable wall data
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

Floor-plan upload and manual wall tracing are available in-browser. A production follow-up should add two-point calibration, wall endpoint editing, doors and windows, user accounts, server-side project storage, and optimized GLB furniture in a WebGL scene. Floor-plan recognition should begin as editable suggestions rather than a fully automatic promise.

## Publish a permanent preview with GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`, which publishes the static app without a build step.

1. Push this repository to GitHub.
2. In the GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Open the **Actions** tab and run **Deploy Roomplay to GitHub Pages**, or push to `main`/`work`.
5. The deployment job displays the permanent URL, normally `https://<account>.github.io/<repository>/`.

The workflow cannot deploy until this local repository has a GitHub remote and the current environment is authenticated to that GitHub account.
