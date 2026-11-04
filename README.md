# Lumi — poster studio

**A personal UI/UX project by Janina Kildisyte.**

**Your words. A little atmosphere.**

Lumi is my exploration of expressive, lightweight design tools. I wanted a short message to become a finished visual through a few clear choices: words, colour, typography and a sculptural object.

Make a quote card, a simple announcement or a social post. Add your own words, choose a gradient and try a glass, chrome or pearl finish. Export the composition as a PNG, ready to share.

**[Try the live studio](https://jupiter847.github.io/lumi-gradient-studio/)** · [View the code](https://github.com/jupiter847/lumi-gradient-studio)

[Open the live studio](https://jupiter847.github.io/lumi-gradient-studio/) to try the complete poster workflow.

[Read my design case study](CASE_STUDY.md)

## Make something with it

1. Start with a palette, then adjust its colours, direction and grain.
2. Write a title, supporting text and a small label. Choose a typeface, alignment, size and text colour.
3. Choose a glass, chrome or pearl sculpture. Drag in **Rotate** mode to change its 3D angle and reflections, or use **Move** to place it on the poster. Hide the object for a quieter composition.
4. Choose a square, story or wide canvas, save the artwork in your collection, then download the complete PNG.

Undo/redo supports experimentation. The background CSS can also be copied for use in a website; it contains the gradient, while PNG export includes the text and sculpture.

For precise adjustments, open **Fine-tune angle & position**. With the preview focused, arrow keys rotate the object; **Move** mode or **Shift + arrows** changes its position. **Home** resets it. The chosen angle and position stay with saved artwork and its still PNG export.

## My design direction

I chose sky blue `#0593C6`, near-white `#FCFFFF` and hot pink `#D83995` for a bright, expressive identity. Translucent panels, soft light and material finishes give the studio its character. Editable text and a clear export flow give that visual exploration a practical purpose.

I wanted the experience to feel playful while keeping the main task easy to understand: write, style, save or export. The [case study](CASE_STUDY.md) explains the decisions, current checks and next steps.

## Run locally

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm start
```

Open [localhost:4174](http://localhost:4174). Run checks with:

```sh
npm test
```

The application uses HTML, CSS and JavaScript. Website files and checks are at the repository root. `npm start` runs `server.mjs`, and `npm test` runs the `*.test.mjs` checks.

## Publish on GitHub Pages

The website files are at the repository root. In **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**.

## Data and output

- Saved artwork stays in this browser through `localStorage`; there is no cloud sync. Clearing browser data removes the collection. Earlier gradient-only saves remain compatible.
- PNGs contain the composed artwork, including text and the material object's chosen angle and position. Decorative interface motion, pointer light and sparkle trails stay in the studio.
- Material finishes are stylised illustrations. The exported artwork is a still image.
- The tool has no account system, backend, analytics or paid API dependency. Google Fonts supplies typefaces with system-font fallbacks.
- Text readability depends on the final composition. The automatic text-colour suggestion is a starting point; the Ink and White controls allow a manual choice.

## Next steps

The current implementation has 16 passing utility checks and basic desktop/mobile interaction review. My next step is to observe people making their own cards, refine text readability and complete a fuller accessibility review. Participant research and measured usability outcomes are still to come.
