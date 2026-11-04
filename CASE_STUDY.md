# Lumi — design case study

**Status:** interactive portfolio concept; participant research pending.

**Focus:** help someone turn a short message into a finished poster or social card.

## Opportunity hypothesis

A person making a quote card or a small announcement may want an attractive result without starting from an empty design canvas. A focused tool could bring writing, visual styling and export into one short journey.

This is a hypothesis, not an interview or analytics finding. The assumed audience is people creating occasional visual posts, personal reminders or simple announcements. Their actual needs and preferred workflows still need investigation.

## The product purpose

**Write a message → style the composition → save or export it.**

The draft combines editable title, supporting text and label with gradient controls, type choices and a central material sculpture. Glass, chrome and pearl finishes offer different moods; hiding the sculpture supports text-focused work. Square, story and wide canvases connect the design to a destination. PNG export includes the words and object; CSS copying provides the background for website use.

Direct manipulation adds another composition choice: drag in Rotate mode to turn the sculpture, or use Move mode to position it. Rotation updates the rendered 3D surface and its normals, changing the reflections with the viewing angle. Fine-tune sliders and keyboard controls offer precise adjustment. The selected pose is stored with the artwork and used in its still PNG export.

The visual identity keeps the requested sky blue `#0593C6`, near-white `#FCFFFF` and hot pink `#D83995`. Translucent studio panels and ambient motion make the editing experience expressive. Exported artwork remains static.

## Decisions to evaluate

**Start with something meaningful.** A short, editable message makes the task visible. Testing should establish whether people understand that they can replace the words and create their own card.

**Keep cause and effect together.** Text, colour and material controls update a large composition preview. Observe whether people can predict what each control changes and recognise the current selection.

**Offer composition choices.** A sculpture-led poster and a text-focused direction give a useful starting structure. Evaluate whether the choices help people finish or restrict the messages they want to create.

**Make materials purposeful.** Glass, chrome and pearl change the mood of the central object. Rotation and placement let the person compose it around their message. Test whether the finishes are distinguishable, whether Rotate and Move are discoverable, and whether keyboard alternatives support the same task.

**Support readable words.** Type, size, alignment and ink controls give direct control over the message. Long text, small screens and changing backgrounds need particular attention. A text-colour suggestion cannot certify the full composition.

**Preserve and deliver the result.** Undo/redo supports exploration; the browser-local collection preserves chosen artwork. The exported PNG should contain the same text, object and layout shown in the preview. Earlier gradient-only saves remain compatible.

These are design rationales to test, not participant findings. Janina should review and refine them so the portfolio reflects decisions she can explain.

## Implementation validation

The integrated poster workflow has basic implementation checks. These demonstrate implementation behaviour, not usability for the intended audience. Participant research and a full accessibility audit remain pending.

| Check | Actual result | Follow-up |
| --- | --- | --- |
| Gradient and poster utilities | Sixteen Node checks passed | Six gradient checks and ten poster checks passed, including pose bounds, shared placement geometry and movement from the visible bounded home position. |
| Desktop and mobile layout | Basic review passed | Tested at 1280px desktop and 390px phone width. No horizontal overflow observed; the phone page measured 375px wide within the 390px viewport, and the movement toolbar fitted. |
| Editable text and composition controls | Basic interactions passed | Edited multiline text, selected Editorial type, tried the Quote composition with the object hidden, and used the background-controls tab. A complete keyboard and accessibility review remains pending. |
| Material and canvas choices | Basic interactions passed | Switched between Glass, Chrome and Pearl and selected the Story canvas size. |
| Sculpture manipulation | Desktop drag, keyboard basics and undo passed | Rotation produced a 34° tilt and 62° turn with changed perspective; Move placed the object at +8% horizontally and −2% vertically. Home, arrow and Shift-arrow controls were checked, including undoing a position nudge while retaining its 5° turn. Cancellation was code-reviewed; a live cancellation gesture and actual-device touch dragging remain unverified. |
| Saved artwork | Save, reload and restore passed | Restored words, font, material and canvas size. A saved 34°/62° rotation and +8%/−2% position survived reset, load and reload. Opening a legacy gradient entry still needs a separate check. |
| Full-artwork PNG | Complete composition and pose preview checked; file inspection pending | The export preview matched the chosen edge-on pose. Earlier ready feedback reported a 1080 × 1920 PNG. The downloaded file's contents and dimensions were not independently verified; compare the actual file with the preview before claiming full export validation. |
| Accessibility and participant usability | Pending | Complete a full accessibility audit and formative study, including keyboard operation, readable text and motion preferences. |

## Three tasks for a formative study

1. **Make a post.** “Create a card for a message you would share.” Observe whether the person discovers text editing, composition and material choices without instruction.
2. **Keep a direction.** “Save this version, try another look, then return to the one you preferred.” Observe the difference between history and the collection.
3. **Prepare it for a destination.** “Make a square post, then a story version, and download the result.” Observe canvas-size discovery, text fit and whether the file matches expectations.

Record what happened before writing conclusions:

| Task | Observation or participant words | Interpretation to check | Revision and retest |
| --- | --- | --- | --- |
| To be completed | — | — | — |

Use actual observations to identify a specific problem, revise the design and retest. No participant sessions, conversion figures or usability improvements are claimed.

## Contribution

Prepared for **Janina Kildisyte’s portfolio** with **Codex** assistance in concept development, interface design, copy and implementation. Record future research, design changes and individual contributions as they happen.
