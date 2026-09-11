# Gotland Sea Trout v6.1.17 – Testversion

## Neu in v6.1.17

- Strömung direkt von Copernicus Marine / SMHI Baltic Physics als WMTS-Layer (`cmems_mod_bal_phy_anfc_PT15M-i`, 15-min Oberflächenströmung, ca. 2 km Modellraster).
- Keine künstliche Küsten-Umlenkung und keine Open-Meteo-Strömung mehr.
- Deutlich weniger Browser-Rechenlast: Copernicus liefert vorgerenderte Kacheln mit Vektoren.
- Trübung weiter aus Copernicus Sentinel-2 HR Ocean Colour (TUR/FNU, 100 m), jetzt mit explizitem Satellitendatum (aktuell UTC-3 Tage) und klarer Meldung bei Datenlücken/Wolken.
- Zeitachse lädt die Strömung für den gewählten Zeitpunkt neu.

Hinweis: Die Strömung ist Modellinformation mit ca. 2-km-Raster. Die Darstellung kann dichter wirken, ist aber keine 20–50-m-Messauflösung. Transparente Trübungsbereiche bedeuten fehlende verwertbare Satellitenbeobachtung.
