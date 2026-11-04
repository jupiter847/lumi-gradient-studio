# Lumi — design case study

**By Janina Kildisyte · Personal UI/UX project**

**Focus:** turn a short message into a finished poster or social card.

**Stage:** working interactive concept, with participant research planned.

## The idea

I wanted to explore a small creative tool with a strong visual identity and a clear purpose. Someone making a quote card, a personal reminder or a simple announcement may want an attractive result without arranging a full design canvas.

That is the opportunity I am exploring with Lumi. The intended audience and workflow are initial design assumptions; participant research is still a next step.

## My direction

I chose a sky-blue `#0593C6`, near-white `#FCFFFF` and hot-pink `#D83995` palette, with translucent panels, soft light and expressive material finishes. I wanted the visual style to feel modern and playful, with a simple task at its centre.

The direction developed into a poster studio with editable words and a central sculpture. Glass, chrome and pearl create different moods. Direct rotation and placement make the object part of the composition, while a text-only option keeps the tool useful for quieter designs.

## The experience

**Write a message → style the composition → save or export it.**

The studio combines an editable title, supporting text and label with gradient controls, type choices and a material sculpture. Square, story and wide canvases connect the composition to a destination. PNG export includes the words, object and selected pose; CSS copying provides the gradient background for website use.

Dragging in **Rotate** mode changes the rendered 3D surface and reflections. **Move** changes the sculpture's position. Fine-tune sliders and keyboard controls support more precise adjustments. The selected pose stays with saved artwork and its still PNG export.

## Design decisions

**Make the task visible.** An editable message gives the starting composition a purpose. I want people to recognise that the words are theirs to replace and that the result is something they can use.

**Keep choices close to their result.** The large preview sits beside controls for words, typography, colour and material. The next usability review will look at whether those controls are discoverable and whether their effects are easy to predict.

**Give the sculpture a role.** I wanted the central object to be more than decoration. Its finish, angle and position let someone shape the mood around their message. Hiding it supports a simpler, text-focused card.

**Keep exploration reversible.** Undo/redo supports trying different directions, while the browser-local collection keeps chosen artwork. Earlier gradient-only saves remain compatible.

**Support readable words.** Typeface, size, alignment and ink controls allow direct control over the message. Long text, small screens and changing backgrounds need particular attention. The automatic text-colour suggestion is a design aid, so the final composition still needs review.

**Finish with a useful output.** The PNG brings the words, material and background together. The editing atmosphere remains in the interface; the downloaded artwork is static.

## Checks so far

The checks below cover implementation behaviour and basic interaction review. They are separate from participant usability testing, which I plan to do next.

| Check | Current result | Remaining work |
| --- | --- | --- |
| Gradient and poster utilities | 16 Node checks passed: six gradient checks and ten poster checks, including pose bounds, shared placement geometry and movement from the bounded home position. | Continue checking behaviour as features change. |
| Desktop and mobile layout | Basic review at 1280px desktop and 390px phone width found no horizontal overflow. The phone page measured 375px wide, and the movement toolbar fitted. | Review across more devices and complete an accessibility audit. |
| Text and material controls | Multiline text, Editorial type, Quote mode, hiding the object, background controls, Glass/Chrome/Pearl and Story size were checked. | Observe how people discover and use these choices. |
| Sculpture movement | Desktop dragging changed rotation and perspective; Move changed placement. Home, arrow and Shift-arrow controls were checked, including undoing a position nudge while retaining its angle. | Test touch dragging on an actual device. Cancellation was code-reviewed; a live cancellation gesture remains unchecked. |
| Saving and recovery | Words, font, material and canvas size survived save, reload and restore. A saved 34°/62° rotation and +8%/−2% position survived reset, load and reload. | Check opening a legacy gradient entry separately. |
| PNG output | The export preview matched the complete composition and chosen pose. Earlier ready feedback reported a 1080 × 1920 PNG. | Independently inspect the downloaded file's contents and dimensions. |

## Next steps

I want to observe people completing three short tasks:

1. **Make a post.** Create a card for a message they would share. Look for hesitation around text editing, composition and material choices.
2. **Keep a direction.** Save one version, try another look, then return to the preferred result. Check whether history and the collection are understood.
3. **Prepare it for a destination.** Make a square post, then a story version, and download the result. Check canvas-size discovery, text fit and output expectations.

I will record observations, choose a specific issue to improve and retest the change. No participant sessions or measured usability improvements have been recorded yet.

## Reflection

Lumi brings together the areas I wanted this project to explore: a distinctive visual language, a practical creative task and direct interaction with material objects. My next focus is to use feedback and accessibility review to refine that experience.
