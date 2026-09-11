# Gotland Sea Trout v6.2.0 FINAL

Finaler statischer GitHub-Pages-Build mit Schwerpunkt auf stabiler mobiler Bedienung und ehrlicher Datenvisualisierung.

## Kernänderungen
- Strömung: Copernicus Marine / SMHI Baltic Physics, offizieller `sea_water_velocity`-Vektorlayer. Die Farbfläche und die Richtungsvektoren werden getrennt geladen; keine clientseitige uo/vo-Pixeldecodierung.
- Strömungsfläche wird nur optisch leicht geglättet. Die Modellauflösung wird dadurch nicht erhöht.
- Trübung: Copernicus Sentinel-2 TUR/FNU mit eigener Satelliten-Zeitachse.
- Legenden für Strömung und Trübung werden direkt über Copernicus WMTS `GetLegend` aus genau demselben Kartenstil bezogen. Dadurch stimmen Farbkarte, Wertebereich und Einheit zusammen.
- Transparenz/weiße Bereiche im TUR-Layer bedeuten No-Data/Wolken, nicht klares Wasser.
- Tile-basierte Layer sind iPhone-freundlich: kein rechenintensives clientseitiges Vektordecoding.

## Wichtig
Copernicus-Strömung ist ein hydrodynamisches Modell (ca. 1 NM / ~2 km). Optische Glättung ist keine zusätzliche Messgenauigkeit. Sentinel-2 TUR ist ein 100-m-Produkt und kann durch Wolken/Datenlücken unvollständig sein.
