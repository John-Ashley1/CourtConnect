# CourtConnect UI prototype (design reference)

Exported from the Claude design canvas. Each `*.dc.html` file is one screen.
The markup inside `<x-dc>` is the layout, and the `<script data-dc-script>` block holds that screen's
sample data and interactions. Use these files as the visual and behaviour spec for the React frontend.
They are not production code and won't run on their own.

- `canvas.json` lists every screen grouped by role (public, player, facility, admin, mobile).
- `coverage-screen-map.dc.html` maps each screen to the SRS functional requirements (FR-xxx).
- Brand: primary teal #14B8A6 (decorative and header background, navy text on it), buttons #0B7A5A,
  navy text #0B2545, accent orange #FF8A3D, background #F6F9F8, font Inter.
