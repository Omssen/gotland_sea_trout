v6.2.4 NUMERIC GRID PATCH

Contains:
- index.html
- numeric-current.js
- data/current/latest.json (10,090 authenticated Copernicus/SMHI numeric points)

Reference time:
13.09.2026 12:00 CEST = 2026-09-13 10:00 UTC

This patch is for v6-test only.
The numeric renderer uses the existing app renderer but replaces expensive nearest-neighbour scans
with indexed bilinear interpolation for this structured model grid.
