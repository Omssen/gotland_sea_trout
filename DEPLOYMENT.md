# Deployment v6.1.14

Die Dateien werden in den Branch `v6-test` geladen. Die Hauptversion (`main`) bleibt unverändert.

Der Pages-Workflow baut die Hauptseite aus `main` und kopiert `v6-test` nach `site/v6-test/`.

Wenn GitHub wegen Environment Protection einen direkten Lauf aus `v6-test` ablehnt, in **Actions → Deploy GitHub Pages → Run workflow** den Branch **main** wählen. Der main-Workflow holt danach automatisch den aktuellen `v6-test`-Stand.

Test-URL:
`https://omssen.github.io/gotland_sea_trout/v6-test/`
