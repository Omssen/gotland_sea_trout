# Gotland Sea Trout v6.2.4k — Current Truth Patch

This is an overlay patch for the existing v6.2.4 app, not a standalone app build.

Changes:
- keeps the authenticated 2026-09-13 12:00 CEST Gotland current grid (10,090 points),
- adds a reproducible Hoburgen truth-test report,
- makes the grid builder robust to Baltic current variable aliases `u0/v0` and `uo/vo`, resolving actual NetCDF variables by CF `standard_name`,
- removes the misleading hard-coded `uo/vo` wording from the UI status.

Hoburgen reference: 56.920 N, 18.110 E.
Validated grid estimate: ~0.08 m/s toward SSE (~162° TO), with consistent surrounding cells.
