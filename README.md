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
- [x] Pagine WIP con estetica coerente (about, projects, socials)
- [x] Pagina 404 con easter egg coin flip (digita "coin") e Konami code
- [x] Easter egg miraggio (5 click veloci sul logo della navbar)
- [x] Link social nel footer (Twitch, YouTube, Discord, GitHub)
- [x] wip.css condiviso per le pagine in costruzione

---

## 🚧 In Sviluppo

- [ ] Contenuti effettivi delle pagine (about, projects, socials)
- [ ] Sistema di achievement con salvataggio in cache
- [ ] Sezione progetti con portfolio
- [ ] Form di invio VTuber
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
site/
├── language/
│   ├── it.json
│   ├── en.json
│   └── ro.json
├── assets/
│   ├── data/
│   │   ├── coin_images.json
│   │   └── vtubers.json
│   └── images/
│       ├── 404/        (coin1-21.png)
│       ├── vtubers/
│       │   ├── glacio/ (glacio1-3.png)
│       │   └── placeholder.png
│       ├── favicon.ico
│       ├── logo.png
│       ├── mirage.png
│       └── tabLogo.png
├── components/
│   ├── navbar/
│   │   ├── nav.html
│   │   ├── nav.css
│   │   └── nav.js
│   └── footer/
│       ├── footer.html
│       ├── footer.css
│       └── footer.js
├── index.html       ← homepage
├── about.html       ← chi siamo (WIP)
├── projects.html    ← progetti (WIP)
├── socials.html     ← social (WIP)
├── vtpedia.html     ← enciclopedia VTuber
├── vtpedia.css
├── vtpedia.js
├── 404.html
├── 404.css
├── style.css        ← stili globali
├── index.css        ← stili homepage
├── wip.css          ← stili pagine WIP condivisi
├── script.js        ← logica principale (i18n + init)
├── README.md
└── .nojekyll
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
