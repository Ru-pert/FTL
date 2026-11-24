# Sternendrift (Arbeitstitel)

Einzelspieler-Raumschiffspiel im Browser: Echtzeitkampf mit Pause, Energieverteilung,
später Sternenkarte, Homebase und Crew. Eigenes Spiel im Genre, kein Nachbau eines
bestehenden Titels: Name, Fraktionen, Schiffe, Grafik und Texte sind eigene.

## Zusammenarbeit

- Der Nutzer programmiert nicht. Er gibt Richtung und Inhalte vor und testet im Browser.
- Mit dem Nutzer auf Deutsch und ohne Code-Details sprechen, außer er fragt danach.
- Kleine Schritte, jeweils mit Tests und spielbarem Stand. Nach sichtbaren Schritten
  Screenshot zeigen und die Fortschrittsseite aktualisieren.
- Alle Spieltexte sind deutsch. Bezeichner im Code englisch, Kommentare deutsch.

## Technik

- TypeScript, Vite, Canvas 2D, Vitest. Keine Game-Engine.
- Hosting über GitHub Pages; jeder Push auf `main` testet, baut und veröffentlicht
  (`.github/workflows/deploy.yml`). `base: './'` in Vite, damit die Adresse egal ist.
- Nur PC mit Maus und Tastatur, keine Touch-Bedienung.

## Befehle

- `npm run dev` startet den Entwicklungsserver
- `npm test` führt die Tests der Spiellogik aus
- `npm run build` prüft Typen und baut nach `dist/`

## Aufbau

- `src/sim/`: Spiellogik ohne Grafik. Fester Takt (30 Schritte pro Sekunde), Zufall nur
  über `nextRandom(state)`, damit jeder Verlauf mit gleichem Startwert gleich abläuft.
  Der Spielzustand ist ein reines Datenobjekt (speicherbar als JSON).
- `src/data/`: Inhalte als Daten (Schiffe, Waffen). Neue Inhalte hier, nicht in der Logik.
- `src/render/`: Darstellung. Liest den Zustand nur, ändert ihn nie. `layout.ts` legt
  fest, wo Schiffe und Räume stehen, und wird auch für die Mauseingabe genutzt.
- `src/ui/`: Bedienoberfläche als HTML über dem Spielbild.
- `src/main.ts`: Spielschleife und Eingabe. Eingaben werden als Befehle (`Command`)
  an die Simulation gegeben, nie direkt in den Zustand geschrieben.

## Grafik

- Pixel-Art, interne Auflösung 960×540. Das Bild füllt das Fenster; gezeichnet wird in
  einem ganzzahligen Vielfachen der Auflösung, ohne Glättung.
- Schiffskachel 24×24 Pixel. Schiffe liegen in den Daten immer mit Bug nach rechts;
  das gegnerische Schiff wird gespiegelt gezeichnet.
- Aussehen der Schiffe steht als Daten in `src/data/shipArt.ts`: Rumpfteile als
  Vielecke (in Kacheln), Farben, Einrichtung der Räume, Triebwerke, Lichter.
  `src/render/sprites.ts` macht daraus die Pixelgrafik (Kontur, Schattierung, Platten).
- Jedes Schiff hat eine erkennbare Gestalt (Schrotthai = Hai, Rostwespe = Wespe,
  Eisenrochen = Rochen). Neue Schiffe ebenso entwerfen, nicht als Kasten um die Räume.
- Das Spielerschiff Eisvogel soll wie ein Raumschiff aussehen, nicht wie ein Flugzeug
  (Wunsch des Nutzers): keine Flügel, stattdessen Triebwerksglocken, Kühlrippen,
  Antennenschüssel, Frachtcontainer und ein Bug aus Eiskristallen.
- Die Heimatbasis ist eine große Ringstation; das Schiff liegt klein am Dock, damit die
  Station groß wirkt (Wunsch des Nutzers).
- Die Bedienoberfläche ist für 640×360 gebaut und wird per CSS um 1,5 vergrößert.
- Schrift: VT323. Text gehört in die HTML-Oberfläche, nicht ins Canvas.

## Spielregeln

- Systeme: Schilde (2 Energie je Schicht), Waffen (Energie über einzelne Waffen),
  Antrieb (5 % Ausweichen je Energie).
- Noch keine Crew: Beschädigte Systeme reparieren sich langsam selbst, freie
  Reaktorenergie beschleunigt das. Das Kachelraster ist für die spätere Crew ausgelegt.
- Durchlauf (`src/sim/run.ts`): fünf Kämpfe in fester Reihenfolge. Hülle und Torpedos
  bleiben erhalten, nach jedem Sieg eine von drei Belohnungen. Kristalle sind die
  Währung; bei einer Niederlage behält man die Hälfte.
- Homebase (`src/data/modules.ts`, `src/meta/profile.ts`): sechs Module mit Stufen,
  bezahlt mit Kristallen. Sie ändern die Startausrüstung (`Loadout`) des Spielerschiffs.
  Die Station (`src/render/station.ts`) zeigt jede Stufe sichtbar.
- Zwei Spielstände: Der Durchlauf lebt nur im Speicher (ein Neuladen bricht ihn ab),
  das Profil liegt in `localStorage` und lässt sich als Datei sichern und laden.
- Schwierigkeit (Simulation mit einfachem Testspieler): Ohne Ausbau scheitert man am
  Endgegner, mit halbem Ausbau gewinnt man klar. Die ersten vier Gegner sind eher leicht.

## Meilensteine

1. Kampf: ein Schiff gegen einen Gegner (fertig)
2. Kleiner Durchlauf (Kette von Kämpfen) mit Homebase (spielbar, Feinschliff offen)
3. Sternenkarte und Textereignisse
4. Crew
5. Inhalte, Balancing, Sound, schönere Grafik

## Offene Wünsche und Ideen

- Powerups als einmalige Verbrauchsgegenstände für den nächsten Durchlauf (vom Nutzer
  gewünscht, noch nicht gebaut).
- Gegner pro Sektor stärker machen, sobald es Sektoren gibt.
- Name der Währung ("Kristalle") und Spieltitel sind Platzhalter.
