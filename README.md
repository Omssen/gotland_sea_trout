# Gotland Sea Trout v6.1.3 – Testversion

Diese Version ist eine Qualitäts- und Bedienungsrunde für die mobile Kartenansicht.

## Neu in v6.1.3

- **Mobile Karte zuerst:** Auf dem Handy belegt die Karte fast den ganzen verfügbaren Bildschirm. Menü, Ranking und Spotliste liegen in einem einklappbaren unteren Drawer.
- **Kompakte Legenden:** Legenden sind zunächst klein und lassen sich antippen/aufklappen.
- **Animierter Wind:** zusammenhängendes Windstärken-Farbfeld plus feine bewegte Partikel; keine Zahlenflut und keine großen blauen Pfeile.
- **Animierte Strömung:** Farbfeld plus feine schwarze Pfeile/Punkte und zusätzliche animierte Wasserbewegung. Die Animation ist eine Visualisierung der interpolierten Modelldaten, keine höhere Messauflösung.
- **Wassertemperatur:** keine Einzelkreise mehr, sondern eine zusammenhängende interpolierte Farbfläche.
- **Wassertiefe:** Legende farblich an die sichtbare EMODnet-Darstellung angenähert. Die ca. 50-m-Orientierungslinie wird vereinfacht/geglättet und erst ab Zoomstufe 13 gezeigt.
- **Parkplätze:** robusterer OSM-Overpass-Abruf mit zweitem Server als Fallback; Parkplätze werden auch dann nicht komplett verworfen, wenn die Küstengeometrie im selben Abruf fehlt.
- **Spots bei großem Zoom:** Standard- und eigene Spotmarker werden erst ab Zoomstufe 9 eingeblendet, um Markerhaufen bei Ostsee-Übersicht zu vermeiden.
- **„Beste Spots jetzt“:** erste erweiterte Bewertung mit Wind zur Küste, Welle, Wassertemperatur, Strömungsstärke, Strömungsrichtung relativ zur Küste und einer einfachen Strömungskanten-Erkennung im Umfeld.
- **Schutzflächen:** sehr großflächige allgemeine Fischereizonen werden aus der Gotland-Mündungsbereichsanzeige herausgefiltert, damit sie nicht fälschlich die ganze Ostsee einfärben.
- Gemeinsame 48-h-Zeitachse für Wind, Strömung und Wassertemperatur bleibt erhalten und ist per Finger/Maus verschiebbar.

## Wichtige Testhinweise

- v6.1.3 ist eine **Testversion**. Die Strömungs- und Windanimation interpoliert zwischen Modelldatenpunkten, damit Strukturen lesbar werden. Dadurch entsteht keine zusätzliche physikalische Modellauflösung.
- Die ca. 50-m-Linie ist nur eine Orientierungshilfe und keine vermessene oder rechtliche Grenze.
- Die Tiefenfarblegende ist visuell an den aktuell verwendeten EMODnet-WMS-Layer angepasst; für eine metrisch exakt klassifizierte Tiefenkarte wäre später ein eigener Daten-/Darstellungsweg nötig.
- Spotkoordinaten und amtliche Schutzgebiete müssen weiterhin einzeln fachlich geprüft werden. Es werden keine erfundenen Schutzkreise verwendet.
- Die Parkplatzdaten stammen aus OpenStreetMap und können unvollständig sein; Zugang/Legalität muss vor Ort geprüft werden.
