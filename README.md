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

## ✅ Implementato

- [x] Sistema multilingua (Italiano / English / Română)
- [x] Dropdown lingua custom e scalabile (aggiungere una lingua = 1 riga di JS)
- [x] Navbar e footer modulari e riutilizzabili
- [x] Design nero con effetti glassmorphism
- [x] Memorizzazione lingua preferita (localStorage)
- [x] Animazioni e transizioni (scroll reveal, fade-in)
- [x] Hosting su GitHub Pages
- [x] Responsive design per mobile/tablet con menu hamburger
- [x] Homepage completa con hero, sezioni e anteprima VTPedia
- [x] Pagina VTPedia con galleria immagini e popup
- [x] Pagina Fanart con griglia, lightbox, ricerca e filtri per tag
- [x] Pagine WIP con estetica coerente (about, projects, socials)
- [x] Pagina 404 con easter egg coin flip (digita "coin") e Konami code
- [x] Easter egg miraggio (5 click veloci sul logo della navbar)
- [x] Link social nel footer (Twitch, YouTube, Discord, GitHub)
- [x] wip.css condiviso per le pagine in costruzione
- [x] Sfondo globale coerente su tutte le pagine (gradiente blu in cima)
- [x] Aggiornamento traduzioni su elementi generati dinamicamente in VTPedia
- [x] Card CTA "Potresti essere tu!" in VTPedia con traduzione IT/EN/RO
- [x] Placeholder fanart visibile anche nel lightbox ingrandito

---

## 🚧 In Sviluppo

- [ ] Contenuti effettivi delle pagine (about, projects, socials)
- [ ] Sistema di achievement con salvataggio in cache
- [ ] Sezione progetti con portfolio
- [ ] SEO e meta tags

---

## 🛠️ Idee

- Mettere in "Chi siamo" l'immagine di "Who is this?" (chiedi a fleim per maggiori info)
- Implementare un sistema di achievement che salva quali sono stati ottenuti tramite cache e creare una zona apposita

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
