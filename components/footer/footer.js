async function loadFooter() {
  try {
    console.log('Caricamento footer...');
    const response = await fetch('./components/footer/footer.html');
    if (!response.ok) throw new Error('Errore nel caricamento footer');
    const footerHTML = await response.text();
    document.getElementById('footer-placeholder').innerHTML = footerHTML;
    console.log('Footer caricato!');
    setCurrentYear();
    copy();
  } catch (error) {
    console.error('Errore footer:', error);
  }
}

function setCurrentYear() {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// ── POPUP PRIVACY / TERMS ──
const POPUP_CONTENT = {
  privacy: {
    it: `<h2><i class="fas fa-shield-halved" style="margin-right:.5rem;color:#5b9cf6"></i>Privacy Policy</h2>
<p>Ultimo aggiornamento: Febbraio 2025</p>
<h3>Dati raccolti</h3>
<p>Questo sito non raccoglie dati personali degli utenti. Non utilizziamo form di registrazione, account o sistemi di tracciamento proprietari.</p>
<h3>Cookie</h3>
<p>Utilizziamo esclusivamente <strong>localStorage</strong> per salvare la preferenza di lingua selezionata dall'utente. Nessun cookie di profilazione o di terze parti.</p>
<h3>Servizi di terze parti</h3>
<ul>
<li><strong>Twitch</strong> e <strong>YouTube</strong>: i dati mostrati (follower, video, clip) vengono fetchati tramite le rispettive API pubbliche da GitHub Actions. Nessun dato utente viene trasmesso.</li>
<li><strong>Font Google</strong>: il sito carica font da Google Fonts, che potrebbe registrare l'IP del visitatore secondo la propria privacy policy.</li>
<li><strong>GitHub Pages</strong>: il sito è ospitato su GitHub Pages. GitHub potrebbe raccogliere dati di accesso secondo la propria <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank">privacy policy</a>.</li>
</ul>
<h3>Contatti</h3>
<p>Per qualsiasi domanda: <a href="mailto:glacioborealebusiness@outlook.com">glacioborealebusiness@outlook.com</a></p>`,
    en: `<h2><i class="fas fa-shield-halved" style="margin-right:.5rem;color:#5b9cf6"></i>Privacy Policy</h2>
<p>Last updated: February 2025</p>
<h3>Data collected</h3>
<p>This site does not collect personal user data. We do not use registration forms, accounts, or proprietary tracking systems.</p>
<h3>Cookies</h3>
<p>We only use <strong>localStorage</strong> to save the user's selected language preference. No profiling or third-party cookies.</p>
<h3>Third-party services</h3>
<ul>
<li><strong>Twitch</strong> and <strong>YouTube</strong>: displayed data (followers, videos, clips) is fetched via their public APIs through GitHub Actions. No user data is transmitted.</li>
<li><strong>Google Fonts</strong>: the site loads fonts from Google Fonts, which may log the visitor's IP according to their own privacy policy.</li>
<li><strong>GitHub Pages</strong>: the site is hosted on GitHub Pages. GitHub may collect access data per their <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank">privacy policy</a>.</li>
</ul>
<h3>Contact</h3>
<p>For any questions: <a href="mailto:glacioborealebusiness@outlook.com">glacioborealebusiness@outlook.com</a></p>`,
    ro: `<h2><i class="fas fa-shield-halved" style="margin-right:.5rem;color:#5b9cf6"></i>Politica de Confidențialitate</h2>
<p>Ultima actualizare: Februarie 2025</p>
<h3>Date colectate</h3>
<p>Acest site nu colectează date personale ale utilizatorilor. Nu folosim formulare de înregistrare, conturi sau sisteme de urmărire proprii.</p>
<h3>Cookie-uri</h3>
<p>Folosim exclusiv <strong>localStorage</strong> pentru a salva preferința de limbă a utilizatorului. Niciun cookie de profilare sau terțe părți.</p>
<h3>Servicii terțe</h3>
<ul>
<li><strong>Twitch</strong> și <strong>YouTube</strong>: datele afișate sunt preluate prin API-urile publice via GitHub Actions. Nicio dată a utilizatorului nu este transmisă.</li>
<li><strong>Google Fonts</strong>: site-ul încarcă fonturi de la Google Fonts, care poate înregistra IP-ul vizitatorului.</li>
<li><strong>GitHub Pages</strong>: site-ul este găzduit pe GitHub Pages conform <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank">politicii lor</a>.</li>
</ul>
<h3>Contact</h3>
<p>Pentru orice întrebare: <a href="mailto:glacioborealebusiness@outlook.com">glacioborealebusiness@outlook.com</a></p>`
  },
  terms: {
    it: `<h2><i class="fas fa-file-contract" style="margin-right:.5rem;color:#5b9cf6"></i>Termini di Servizio</h2>
<p>Ultimo aggiornamento: Febbraio 2025</p>
<h3>Utilizzo del sito</h3>
<p>Questo sito è un progetto personale di <strong>GlacioBoreale</strong>. Visitandolo accetti di non utilizzarlo per scopi illegali o dannosi.</p>
<h3>Contenuti</h3>
<p>Tutti i contenuti presenti (testi, immagini, loghi) sono di proprietà di GlacioBoreale salvo diversa indicazione. È vietata la riproduzione senza autorizzazione.</p>
<h3>Limitazione di responsabilità</h3>
<p>Il sito viene fornito "così com'è". Non garantiamo la disponibilità continua del servizio né l'assenza di errori. Non siamo responsabili per eventuali danni derivanti dall'uso del sito.</p>
<h3>Link esterni</h3>
<p>Il sito può contenere link a piattaforme esterne (Twitch, YouTube, Discord, ecc.). Non siamo responsabili dei contenuti presenti su siti di terze parti.</p>
<h3>Modifiche</h3>
<p>Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche saranno effettive dalla loro pubblicazione sul sito.</p>
<h3>Contatti</h3>
<p>Per qualsiasi domanda: <a href="mailto:glacioborealebusiness@outlook.com">glacioborealebusiness@outlook.com</a></p>`,
    en: `<h2><i class="fas fa-file-contract" style="margin-right:.5rem;color:#5b9cf6"></i>Terms of Service</h2>
<p>Last updated: February 2025</p>
<h3>Use of the site</h3>
<p>This site is a personal project by <strong>GlacioBoreale</strong>. By visiting it, you agree not to use it for illegal or harmful purposes.</p>
<h3>Content</h3>
<p>All content (texts, images, logos) is owned by GlacioBoreale unless otherwise stated. Reproduction without permission is prohibited.</p>
<h3>Limitation of liability</h3>
<p>The site is provided "as is". We do not guarantee continuous availability or the absence of errors. We are not liable for any damages arising from the use of this site.</p>
<h3>External links</h3>
<p>The site may contain links to external platforms (Twitch, YouTube, Discord, etc.). We are not responsible for content on third-party sites.</p>
<h3>Changes</h3>
<p>We reserve the right to modify these terms at any time. Changes will be effective upon publication on the site.</p>
<h3>Contact</h3>
<p>For any questions: <a href="mailto:glacioborealebusiness@outlook.com">glacioborealebusiness@outlook.com</a></p>`,
    ro: `<h2><i class="fas fa-file-contract" style="margin-right:.5rem;color:#5b9cf6"></i>Termeni și Condiții</h2>
<p>Ultima actualizare: Februarie 2025</p>
<h3>Utilizarea site-ului</h3>
<p>Acest site este un proiect personal al lui <strong>GlacioBoreale</strong>. Prin vizitarea sa, ești de acord să nu îl folosești în scopuri ilegale sau dăunătoare.</p>
<h3>Conținut</h3>
<p>Tot conținutul (texte, imagini, logo-uri) aparține lui GlacioBoreale. Reproducerea fără permisiune este interzisă.</p>
<h3>Limitarea răspunderii</h3>
<p>Site-ul este furnizat "ca atare". Nu garantăm disponibilitatea continuă sau absența erorilor.</p>
<h3>Link-uri externe</h3>
<p>Site-ul poate conține link-uri către platforme externe. Nu suntem responsabili pentru conținutul site-urilor terțe.</p>
<h3>Modificări</h3>
<p>Ne rezervăm dreptul de a modifica acești termeni oricând. Modificările intră în vigoare la publicarea pe site.</p>
<h3>Contact</h3>
<p>Pentru orice întrebare: <a href="mailto:glacioborealebusiness@outlook.com">glacioborealebusiness@outlook.com</a></p>`
  }
};

function openFooterPopup(type) {
  const overlay = document.getElementById('footer-popup-overlay');
  const body = document.getElementById('footer-popup-body');
  if (!overlay || !body) return;
  const lang = (typeof currentLang !== 'undefined' ? currentLang : 'it');
  const content = POPUP_CONTENT[type];
  body.innerHTML = content[lang] || content['it'];
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFooterPopup() {
  const overlay = document.getElementById('footer-popup-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeFooterPopup();
});

function copy() {
  const usernameElement = document.querySelector('.discord-username .username');
  if (usernameElement) {
    usernameElement.addEventListener('click', () => {
      const username = usernameElement.textContent;
      navigator.clipboard.writeText(username).then(() => {
        const originalText = usernameElement.textContent;
        usernameElement.textContent = '✓ Copiato!';
        setTimeout(() => {
          usernameElement.textContent = originalText;
        }, 1500);
      }).catch(err => {
        console.error('Errore nella copia:', err);
      });
    });
  }
}