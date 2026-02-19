# Personal Website

Sito web personale con sistema multilingua (IT/EN)

🌐 **Live**: [glacioboreale.github.io/site](https://glacioboreale.github.io/site/)

---

## ⚠️ Stato del Progetto

**Attualmente funzionante solo su:**
- ✅ Desktop/PC (browser)
- ✅ Mobile
- ✅ Tablet

**Non ancora ottimizzato per:**
- 🥀 Schermi piccoli

---

## ✅ Implementato

- [x] Sistema multilingua (Italiano/Inglese)
- [x] Navbar e footer modulari e riutilizzabili
- [x] Design nero con effetti glassmorphism
- [x] Memorizzazione lingua preferita (localStorage)
- [x] Struttura pagine base (Home, Chi sono, Progetti, VTPedia, Socials, Contatti)
- [x] Animazioni e transizioni
- [x] Hosting su GitHub Pages
- [x] Pagina 404
- [x] Responsive design per mobile/tablet
- [x] Menu hamburger per mobile
- [x] Pagina VTPedia

---

## 🚧 In Sviluppo

- [ ] Contenuti effettivi delle pagine
- [ ] Achievement del sito
- [ ] Sezione progetti con portfolio
- [ ] Pagina social con link funzionanti
- [ ] Form di contatto
- [ ] SEO e meta tags

---

## 🛠️ Idee

- Mettere in "Chi sono" l'immagine di "Who is this?" (chiedi a fleim per maggiori info)
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
│   ├── en.json
│   ├── it.json
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
├── index.html
├── about.html
├── contact.html
├── projects.html
├── socials.html
├── vtpedia.html
├── vtpedia.css
├── vtpedia.js
├── 404.html
├── 404.css
├── style.css      ← stili globali
├── script.js      ← logica principale (i18n + init)
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

# Aprire http://localhost:8000
```

---

**Made by [@GlacioBoreale](https://github.com/GlacioBoreale)**
