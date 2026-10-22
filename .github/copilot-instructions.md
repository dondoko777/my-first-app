# Repository instructions

## Project structure and architecture

This is a dependency-free, browser-based side-scrolling platform game:

- `index.html` defines the Japanese-language page, canvas, score and message overlays, and touch controls. Its element IDs and `data-action` attributes are consumed by `game.js`.
- `game.js` owns game state, input, physics/collision updates, camera movement, and Canvas 2D rendering. A single `requestAnimationFrame` loop updates and redraws the scene; world entities use world coordinates while `cameraX` scrolls the rendered world.
- `style.css` styles the page and provides responsive layout and touch-control presentation; it does not implement game behavior.

Keep DOM selectors in `game.js` aligned with the IDs and attributes in `index.html`. Keep game geometry and drawing in canvas/world coordinates; page layout and responsive changes belong in CSS. The UI text is Japanese, with game-state messages set in `game.js` and the static interface text in `index.html`.
Music and sound effects are synthesized with the Web Audio API in `game.js`; playback starts only after enabling sound with the `#sound-toggle` button.

表示する説明や案内文は日本語にしてください。

## Build, test, and lint

There is no package manifest, build system, test suite, or configured linter in this repository. For a JavaScript syntax check, run:

```sh
node --check game.js
```

To run the game locally, serve the repository root with:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. There are no automated tests or single-test command configured; verify gameplay and keyboard/touch controls in a browser.
