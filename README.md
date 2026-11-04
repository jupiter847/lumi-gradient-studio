# Lumi — poster studio

**Your words. A little atmosphere.**

Make a quote card, a simple announcement or a social post. Add your own words, choose a gradient and give the composition a glass, chrome or pearl sculpture. Export the finished artwork as a PNG, ready to share.

**[Try the live studio](https://jupiter847.github.io/lumi-gradient-studio/)** · [View the code](https://github.com/jupiter847/lumi-gradient-studio)

[Open the live editor](https://jupiter847.github.io/lumi-gradient-studio/) to try the complete poster workflow.

[Read the design case study](CASE_STUDY.md)

## Make something with it

1. Start with a palette, then adjust its colours, direction and grain.
2. Write a title, supporting text and a small label. Choose a font, alignment, type size and text colour.
3. Try a central sculpture in glass, chrome or pearl, or hide it for a quieter composition.
4. Choose a square, story or wide canvas, save the artwork in your collection, then download the complete PNG.

Undo/redo supports experimentation. The background CSS can also be copied for use in a website; it contains the gradient, while PNG export includes your text and sculpture.

## Why this project

Lumi is a UI/UX portfolio concept built around a concrete task: turn a short message into a finished visual without arranging a full design canvas. The interface retains its translucent panels, ambient colour and sky-blue `#0593C6`, near-white `#FCFFFF` and hot-pink `#D83995` palette.

The [case study](CASE_STUDY.md) explains the design hypotheses, scope, tradeoffs and a formative-testing plan. Participant research and measured usability outcomes are still pending.

## Run locally

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm start
```

Open [localhost:4174](http://localhost:4174). Run checks with:

```sh
npm test
```

The application uses HTML, CSS and JavaScript. Website files and checks are at the repository root; `server.mjs` serves the local preview.

## Publish on GitHub Pages

The website files are at the repository root. In **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**.

## Data and output

- Saved artwork stays in this browser through `localStorage`; there is no cloud sync. Clearing browser data removes the collection. Earlier gradient-only saves remain compatible.
- PNGs contain the composed artwork, including text and the selected material object. Decorative interface motion, pointer light and sparkle trails are outside the exported image.
- Material finishes are stylised illustrations. The artwork is a still image.
- The tool has no account system, backend, analytics or paid API dependency. Google Fonts supplies typefaces with system-font fallbacks.
- Review text readability in the final composition, especially after changing its background or text colour. Automated colour guidance is not a full accessibility audit.

## Contribution

Prepared for **Janina Kildisyte’s UI/UX portfolio** with **Codex** assistance in concept development, interface design, copy and implementation. Future research, design refinements and individual contributions should be documented as they happen.
