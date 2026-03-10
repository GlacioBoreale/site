# Personal Website

Benvenuto nel caos TOTALMENTE organizzato di Glacio Boreale

🌐 **Live**: [www.glaciopia.com](https://www.glaciopia.com/)

---

## ⚠️ Stato del Progetto

**Funzionante su:**
- ✅ Desktop/PC (browser)
- ✅ Mobile
- ✅ Tablet
- ✅ Schermi molto piccoli

**Non ancora ottimizzato per:**
- 🥀 Microonde, Televisori

---

## 📅 Changelog

### 06/03/2026
- Migrazione di tutti gli asset statici (immagini e audio) da GitHub Pages a bucket AWS S3 (`glaciopia-images`, `glaciopia-audio`) con policy pubblica in lettura e CORS configurato
- Costanti globali `IMG_CDN` e `AUDIO_CDN` aggiunte in `script.js` per centralizzare i riferimenti S3
- Fix `game.html`: aggiunto `game/i18n.js` (definisce `gt()`) e rimosso footer dalla pagina di gioco
- Fix traduzioni gioco al caricamento: rimosso `DOMContentLoaded` da `i18n.js`, le traduzioni ora si applicano tramite evento `languageChanged` dopo che `script.js` ha caricato i JSON
- Fix panel Leveling: testi aggiornati correttamente alla lingua al primo caricamento
- Buy max tasto destro rimosso dai nodi base — ora esclusivo del Research Center (già gestito da `research.js`)
- Buy max tasto sinistro attivato automaticamente per i nodi base quando `G.fastAndFurious` è `true` (nodo #5p), rimossi i vecchi check sulle impostazioni
- `statLabel` di #5p, #1p, #9p aggiornati da `'not yet implemented'` a `'controlla le impostazioni'`
- `statLabel` di #27 (Gratificazione Ritardata) mostra in tempo reale il moltiplicatore e il tempo accumulato
- Tutte le valute (✦ prestige, λ lambda) ora usano `fmt()` / `fmtLambda()` invece di `.toFixed(2)` in tooltip, pannello stats, pannello valute e nodo prestige
- Aggiunto nodo #10p "Generic Filler" (x: 1960, y: -200), figlio di #5p, costa 20 ✦, applica x2 ₽ e x2 ✦ gain
- Leaderboard: mostra messaggio di blocco se il nodo "Nella storia" non è stato acquistato
- Leaderboard: aggiunta colonna `opt_in` nella tabella `game_saves` su RDS, query filtra solo utenti che hanno fatto opt-in; `opt_in` viene salvato nel cloud save

---

## ✅ Implementato

- [x] Sistema multilingua (IT / EN / RO) con preferenza salvata
- [x] Navbar e footer modulari, riutilizzabili su tutte le pagine
- [x] Design scuro con effetti glassmorphism e sfondo coerente
- [x] Animazioni e transizioni su scroll e caricamento pagina
- [x] Hosting su GitHub Pages con dominio custom
- [x] Layout responsive per tutte le dimensioni di schermo
- [x] Homepage con presentazione, sezioni e anteprima contenuti
- [x] Sezione enciclopedica con schede, galleria e popup dettaglio
- [x] Galleria community con ricerca, filtri e visualizzazione espansa
- [x] Pagina 404 con contenuti interattivi e qualche sorpresa nascosta
- [x] Qualche easter egg sparso qua e là, chi trova trova
- [x] Pagine placeholder con estetica coerente al resto del sito
- [x] Traduzioni applicate anche agli elementi generati dinamicamente
- [x] Achievement del sito

---

## 🚧 In Sviluppo

- [ ] Completamento delle pagine ancora in costruzione
- [ ] Sistema di progressione nascosto con salvataggio lato client
- [ ] Sezione dedicata ai progetti personali
- [ ] Miglioramenti SEO e meta tags

---

## 🛠️ Idee

- Mettere in "Chi siamo" l'immagine di "Who is this?" (chiedi a fleim per maggiori info)

---

## 🛠️ Tecnologie

- HTML5
- CSS3
- JavaScript (Vanilla)
- i18n personalizzato

---

## 📁 Struttura
```
site
├─ .nojekyll
├─ 404.css
├─ 404.html
├─ about.css
├─ about.html
├─ assets
│  ├─ data
│  │  ├─ api_cache.json
│  │  ├─ coin_images.json
│  │  ├─ fanarts.json
│  │  └─ vtubers.json
│  └─ images
│     ├─ 404            (coin1-21.png)
│     ├─ about
│     │  ├─ eromo_pfp.png
│     │  ├─ glacio_pfp.png
│     │  └─ rid_pfp.png
│     ├─ fanart
│     ├─ favicon.ico
│     ├─ logo.png
│     ├─ mirage.png
│     ├─ tabLogo.png
│     ├─ twitchOffline.png
│     └─ vtubers
│        ├─ glacioBoreale (glacio1-3.png)
│        ├─ leoTsonus     (leo1-3.png)
│        └─ placeholder.png
├─ CNAME
├─ components
│  ├─ footer
│  │  ├─ footer.css
│  │  ├─ footer.html
│  │  └─ footer.js
│  └─ navbar
│     ├─ nav.css
│     ├─ nav.html
│     └─ nav.js
├─ fanart.css
├─ fanart.html
├─ fanart.js
├─ index.css
├─ index.html
├─ language
│  ├─ en.json
│  ├─ it.json
│  └─ ro.json
├─ manifest.json
├─ projects.html
├─ README.md
├─ robots.txt
├─ script.js
├─ sitemap.xml
├─ socials.css
├─ socials.html
├─ socials.js
├─ style.css
├─ vtpedia.css
├─ vtpedia.html
├─ vtpedia.js
└─ wip.css
```

---

## 🚀 Setup Locale
```bash
# Clona
git clone https://github.com/GlacioBoreale/site.git

# Avvia server locale
python -m http.server 8000

# Apri http://localhost:8000
```

---

**Made by [@GlacioBoreale](https://github.com/GlacioBoreale)**
