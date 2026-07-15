# Homepage Override

This page override is authoritative for the public guest website. It preserves
the established visual identity and replaces generated recommendations that
would make the page look like a generic SaaS or webinar landing page.

## Brand palette

| Role | Value | Existing token |
|---|---:|---|
| Ink | `#11110f` | `--ink` |
| Paper | `#f3efe6` | `--paper` |
| Cream | `#ead9bc` | `--cream` |
| Wine | `#8c292b` | `--wine` |
| Forest green | `#244635` | `--green` |
| Warm gold | `#c59b5d` | `--gold` |

Do not use the generated pink Aurora palette. The page is editorial, cinematic,
warm and heritage-led, with the original Wirtschaft imagery and marks.

## Typography and layout

- Keep the existing Georgia editorial display type and Inter/system sans body.
- Use oversized, balanced headlines, generous negative space and high contrast.
- Preserve the five story chapters and the three clear conversion paths:
  restaurant, events and celebrations/catering.
- Do not add false scarcity, countdowns or generic social-proof blocks.

## Motion

- Scroll effects may use transform and opacity only.
- Microinteractions stay between 120 and 380 ms.
- Stagger intervals stay around 45 ms.
- Every animation must respect both `prefers-reduced-motion` and the visible
  Motion toggle in the header.
- Avoid continuous decorative animation and scroll-jacking.

## Active chapter themes

The public homepage uses one brand system with contextual atmospheres. Themes
change automatically from the section closest to the viewport center and are
always identified by text in the fixed header—not by color alone.

| Chapter | Theme | Accent | Meaning |
|---|---|---|---|
| The house | Origin | Warm gold | Arrival and orientation |
| Emma & Eugen | Heritage | Cream | Family and continuity |
| The table | Table | Wine red | Hospitality and shared dining |
| Lunch | Lunch | Forest green | Freshness and seasonality |
| Stage | Stage | Amber | Warm live-stage light |
| Host | Host | Paper white | Personal welcome |
| Celebrations | Feast | Festive gold | Weddings and catering |
| Final paths | Visit | Deep wine | Clear conversion choices |

## Quality gates

- Visible keyboard focus and semantic buttons/links.
- Minimum 44 px touch targets for primary mobile actions.
- No horizontal overflow at 375, 768, 1024 and 1440 px.
- Guest-facing pages never reveal internal capacity percentages or buffers.

## 21st.dev adaptations

- Celebration cards use the image-reveal interaction pattern from the 21st.dev
  `Reveal on hover` component, rebuilt in native HTML/CSS with keyboard focus and
  touch fallbacks.
- The event dialog uses the date-column, connecting-line and progressive-entry
  structure from the 21st.dev minimal `Timeline`, rebuilt without React or
  Tailwind dependencies.
- Generic countdown urgency, glassmorphism and SaaS styling are explicitly not
  part of this brand system.

## Scroll-film for the stage chapter

- The Dinner & Livekultur chapter uses three existing house images as a
  scroll-scrubbed cinematic sequence: food, live performance and stage.
- The scroll position controls the crossfade, camera pan, vertical lift and a
  single restrained light sweep. This gives the sensation of a short film
  without an externally hosted video, tracking pixels or added media weight.
- A persistent `Motion an/aus` control and `prefers-reduced-motion` disable
  the sequence cleanly and preserve readable content.
