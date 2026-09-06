# Gotland Sea Trout v4

Installierbare PWA für die Planung des Meerforellenangelns auf Gotland.

## Neu in v4
- Tages-Dashboard (Früh / Mittag / Abend)
- eigene Spots per Kartenklick
- lokales Fangtagebuch mit Foto
- Backup/Restore von eigenen Spots und Tagebuch
- visuell hervorgehobene Warnbereiche bei Spots nahe bekannter Schutzgewässer
- alle v3-Funktionen: Satellitenkarte, Live-Wind/Marine-Daten, 48-h-Prognose, Ranking, Küstenplaner, OSM-Parkplätze

## Start lokal
Im App-Ordner:

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

## Datenschutz
Eigene Spots und Favoriten liegen in localStorage. Fangtagebuch und Fotos liegen in IndexedDB im Browser. Es wird kein eigener Cloud-Dienst für persönliche Daten verwendet. Nutze die Backup-Funktion, bevor du Browserdaten löschst oder das Gerät wechselst.

## Recht/Sicherheit
Die Schutzgebiet-Hinweise sind keine amtlichen Flächengeometrien. Vor jedem Angeltag die aktuellen offiziellen Karten und Regeln der Länsstyrelsen Gotland prüfen. Marine-Modellwerte sind Planungshilfen, keine Navigationsdaten.
