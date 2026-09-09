# Gotland Sea Trout v6.1.2 – Testversion

Diese Version ist für den `v6-test`-Bereich gedacht und verändert die Hauptversion nicht.

## In dieser Testrunde neu/überarbeitet

- Spotliste: `Alle / Spots / Eigene`; voreingestellt sind beide gemeinsam.
- Eigene Spots erscheinen mit violettem `E1`, `E2` … Marker auch in der rechten Spotliste.
- Spot-Koordinaten werden bei Onlinebetrieb zusätzlich gegen die OSM-Meeresküstenlinie geprüft und an die nächstgelegene Küstenlinie gesetzt; Ergebnis wird lokal zwischengespeichert.
- Satellitenansichten haben drei eigene, seewärts versetzte Mittelpunkte (Übersicht/Küste/Detail).
- Spot-Detailfenster berücksichtigt die iPhone Safe Area und verwendet auf Mobilgeräten kompaktere Satellitenbilder.
- Schutzgebiete werden live aus dem offiziellen Kartendienst **Svenska Fiskeregler** (Länsstyrelserna/HaV) geladen. Die Karte ist eine Orientierungshilfe; rechtlich maßgeblich bleibt die veröffentlichte Vorschrift.
- Strömung: Versuch einer direkten Copernicus-Marine-WMTS-Anbindung an das Baltic Sea Physics Modell (SMHI, ca. 2 km Raster, 15-Minuten-Oberflächenströmung). Variable Pfeile werden ergänzend aus Open-Meteo-Werten dargestellt; Pfeilgröße = Geschwindigkeit.
- Pfeilrichtung korrigiert und Landmaske konservativer gemacht, damit keine Pfeile mitten auf Gotland erscheinen.
- Parkplätze bleiben auf ca. 300 m Küstenabstand gefiltert.
- Zeitachse, Legenden, Layer-Schalter, `+ Spot`-Abbrechen, Ferienhaus und Quellen-/Lizenzansicht bleiben enthalten.

## Wichtige Hinweise

- Die automatische Küstenprüfung stellt sicher, dass Marker nicht mitten auf Land/offenem Wasser bleiben. Sie ersetzt noch keine fachliche Einzelbewertung jedes Angelabschnitts.
- Copernicus-WMTS wird live geladen. Falls der Dienst/Browser die WMTS-Abfrage nicht zulässt, fällt die App auf die variable Open-Meteo-Pfeildarstellung zurück und meldet das im Status.
- Die Schutzgebietskarte dient der Orientierung. Für rechtliche Entscheidungen gilt immer die amtliche Vorschrift bzw. Länsstyrelsen/HaV.


## Neu in v6.1.2
- Bathymetrie zeigt zusätzlich eine ca. 50-m-Orientierungslinie vor der Küste (aus OSM-Küstengeometrie abgeleitet; keine amtliche Grenzlinie).
- Strömung ohne Zahlen unter den Pfeilen: nahezu stilles Wasser = Punkt, stärkere Strömung = längere und dickere Pfeile.
- Dichtere, zoomabhängige Darstellung durch Interpolation zwischen den zugrunde liegenden Modell-/API-Punkten.
- Farbige Geschwindigkeitsfläche bleibt parallel zur Richtungspfeil-Darstellung sichtbar.


### v6.1.2 – Strömungsdarstellung verfeinert
- zusammenhängende, klassierte Strömungsflächen statt einzelner Farbkreise
- Farbfolge: fast weiß/hellgrün → grün → gelb → orange → rot
- dichte schwarze Pfeile; Richtung über Pfeilrichtung, Stärke über Länge und Dicke
- nahezu stehendes Wasser als Punkt
- keine Zahlen direkt an den Pfeilen
- Interpolation dient der Darstellung; sie erhöht nicht die physikalische Modellauflösung


## UI-Feinschliff v6.1.2
- Schnelle Layer-Leiste direkt oben auf der Karte: Karte / Wassertiefe / Wassertemperatur / Strömung.
- Detaillierte Strömungslegende in Knoten mit denselben Geschwindigkeitsklassen wie die Farbfelder.
- Dynamischer metrischer Maßstab unten rechts.
