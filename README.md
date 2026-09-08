# Gotland Sea Trout v6.1 – Testversion

Diese Version baut direkt auf dem vom Nutzer exportierten `v6-test`-Stand auf.

## Umgesetzt in v6.1
- iPhone Safe-Area / kompakter Header
- feste Nummern auf Standard-Spots und in der rechten Spotliste
- eigene Spots als violette `E1`, `E2` … Marker
- `+ Spot` und `Ferienhaus` können durch erneutes Tippen abgebrochen werden; Kartenmodi schließen sich gegenseitig aus
- eigener Spot öffnet nach dem Speichern die große Detailansicht mit Live-Daten, Satellitenkarten und Parkplatzsuche
- Satellitenansichten werden seewärts versetzt statt stumpf auf denselben Mittelpunkt zu zoomen
- Själsö und Djupvik wurden auf recherchierte reale Küsten-/Hafenpositionen korrigiert
- Layer-Menü mit klaren Schiebeschaltern und aktivem Zustand
- Strömungspfeile: Größe + Farbe zeigen Geschwindigkeit; Knoten-Legende
- grobe Darstellungs-Landmaske unterdrückt Strömungs-/Wind-/SST-Punkte auf Gotlands Landfläche
- gemeinsame 48-h-Zeitachse mit Play/Pause für Strömung, Wind und SST
- dynamische Legenden für Strömung, SST und Bathymetrie
- Parkplatzfilter: OSM-Parkplätze werden gegen OSM-Küstengeometrie geprüft; nur ungefähr <=330 m Küstenabstand werden gezeigt
- Schutzgebiets-Layer: Själsöån/Kolenskvarnån aus den vier amtlichen HVMFS-2023:11-Grenzpunkten
- Quellen-/Lizenzansicht
- Heute-Ranking prüft alle 25 vorhandenen Spots statt nur die ersten 12

## Noch bewusst nicht als „fertig“ ausgegeben
- Die komplette manuelle Neuprüfung aller 25+ Spotpositionen und aller individuellen Satellitenausschnitte ist noch nicht abgeschlossen. v6.1 verbessert das System und korrigiert die zwei konkret gemeldeten Problemfälle.
- Der Schutzgebiets-Layer enthält zunächst nur Själsö/Kolenskvarnån als exakt koordinierte Fläche. Die übrigen Gebiete werden nicht geschätzt; viele amtliche Definitionen verwenden Küstenpunkte bzw. 500/1000-m-Abstände und benötigen saubere Küstengeometrie.
- Die Karte nutzt für die interaktiven Strömungspfeile in dieser Testfassung weiterhin Open-Meteo. Copernicus/SMHI Baltic Sea Physics ist als gewünschte nächste Datenquelle dokumentiert, aber noch nicht direkt im Browser angebunden.
- EMODnet bleibt die öffentliche Bathymetriequelle; hochauflösende Sjöfartsverket-Daten dürfen erst nach Klärung von Zugang/Lizenz eingebaut werden.

## Rechtliche Hinweise
Die App ist ein Angelplaner und keine amtliche Navigations- oder Rechtsauskunft. Für Fischereiregeln gelten ausschließlich die aktuellen Veröffentlichungen von Länsstyrelsen Gotland und Havs- och vattenmyndigheten.
