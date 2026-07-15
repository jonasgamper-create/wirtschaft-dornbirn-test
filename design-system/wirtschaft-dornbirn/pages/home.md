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

## Quality gates

- Visible keyboard focus and semantic buttons/links.
- Minimum 44 px touch targets for primary mobile actions.
- No horizontal overflow at 375, 768, 1024 and 1440 px.
- Guest-facing pages never reveal internal capacity percentages or buffers.
