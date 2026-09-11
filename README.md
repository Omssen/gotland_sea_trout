# Gotland Sea Trout v6.1.6 – Testversion

Diese Version ist eine Qualitäts- und Bedienungsrunde für die mobile Kartenansicht.

## Neu in v6.1.6

- **Statische Darstellung:** Bewegte Wind- und Strömungspartikel wurden entfernt.
- **Windpfeile wieder statisch:** Farbe zeigt die Stärke, Pfeile zeigen die Richtung.
- **Strömung statisch:** Farbfeld plus kleine Richtungspfeile.
- **Küstenmaske:** OSM-Küstenlinien werden geladen und als Maske verwendet; Meereslayer werden an Land ausgeschnitten.
- **Größeres Seegebiet:** Wind, Strömung und Wassertemperatur werden deutlich weiter auf das offene Meer hinaus berechnet und gezeichnet.
- **Mehr Detail beim Zoomen:** Die Darstellung bleibt bis an die sichtbare Küstenkante erhalten; die zugrunde liegende Modellauflösung wird dadurch nicht künstlich erhöht.
- **Parkplatzabruf robuster:** Parkplatzabfragen laden nicht mehr zusätzlich in jeder Kachel die Küstengeometrie; die bereits geladene Küstenmaske wird zur Küstendistanz verwendet.

> Hinweis: Die Küstenmaske verbessert die **Darstellung**. Open-Meteo-Strömungsdaten bleiben Modell-/Interpolationsdaten und sind keine hochauflösende Messung im 50-m-Küstenstreifen.

## Wichtige Testhinweise

- v6.1.6 ist eine **Testversion**. Strömung und Wind werden statisch aus interpolierten Modelldaten dargestellt. Die feinere Darstellung an der Küste erzeugt keine zusätzliche physikalische Modellauflösung.
- Die ca. 50-m-Linie ist nur eine Orientierungshilfe und keine vermessene oder rechtliche Grenze.
- Die Tiefenfarblegende ist visuell an den aktuell verwendeten EMODnet-WMS-Layer angepasst; für eine metrisch exakt klassifizierte Tiefenkarte wäre später ein eigener Daten-/Darstellungsweg nötig.
- Spotkoordinaten und amtliche Schutzgebiete müssen weiterhin einzeln fachlich geprüft werden. Es werden keine erfundenen Schutzkreise verwendet.
- Die Parkplatzdaten stammen aus OpenStreetMap und können unvollständig sein; Zugang/Legalität muss vor Ort geprüft werden.


## v6.1.6 – Küstenfokus
- Parkplatz-Layer lädt beim Einschalten küstennahe OSM-Parkplätze rund um Gotland in mehreren Abfragen. Es werden nur Parkplätze mit berechneter Entfernung bis max. 800 m zur OSM-Meeresküste gezeigt; `access=private/no` und `foot=no` werden ausgeschlossen. Die angezeigte Distanz ist Luftlinie, keine garantierte Gehwegdistanz.
- Parkplätze werden geclustert und lösen sich beim Hineinzoomen in Einzelmarker auf.
- Zeitachse zeigt Datum/Uhrzeit und hat −1h/+1h-Tasten.
- Quellenangabe und Maßstab werden bei geöffneter Zeitachse nach oben versetzt.
- Mobile Darstellungswahl ist kompakt aufklappbar.
- Drei Designvarianten plus Automatik unter „Mehr → Erscheinungsbild“.
