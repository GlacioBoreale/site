async function loadFooter() {
  try {
    const res = await fetch('./components/footer/footer.html');
    if (!res.ok) throw new Error();
    document.getElementById('footer-placeholder').innerHTML = await res.text();
    setCurrentYear();
    initDiscordCopy();
  } catch (e) {
    console.error('Errore caricamento footer:', e);
  }
}

function setCurrentYear() {
  const el = document.getElementById('current-year');
  if (el) el.textContent = new Date().getFullYear();
}

const FOOTER_POPUP_CONTENT = {
  privacy: {
    it: `<h2><i class="fas fa-shield-halved" style="margin-right:.5rem;color:#5b9cf6"></i>Privacy Policy</h2>
<p>Ultimo aggiornamento: Maggio 2025</p>
<h3>Dati raccolti</h3>
<p>Questo sito raccoglie dati personali limitati esclusivamente per il funzionamento dell'account utente (username, email, password cifrata). I dati sono archiviati su database PostgreSQL ospitato su AWS.</p>
<h3>Cookie e storage locale</h3>
<p>Utilizziamo <strong>localStorage</strong> per salvare preferenze di lingua, tema e progressi di gioco. Nessun cookie di profilazione o di terze parti.</p>
<h3>Contenuti caricati dagli utenti</h3>
<p>Le immagini caricate dagli utenti (fanart, avatar team, immagini VTuber) vengono archiviate su bucket Amazon S3. Il caricamento avviene tramite URL pre-firmati e i file sono accessibili pubblicamente una volta approvati.</p>
<h3>Servizi di terze parti</h3>
<ul>
<li><strong>AWS (Lambda, RDS, S3, SES)</strong>: infrastruttura backend. I dati vengono elaborati nelle regioni eu-north-1 (Stoccolma) e us-east-1.</li>
<li><strong>Twitch</strong> e <strong>YouTube</strong>: dati pubblici fetchati tramite API. Nessun dato utente viene trasmesso.</li>
<li><strong>Google Fonts</strong>: potrebbe registrare l'IP del visitatore secondo la propria privacy policy.</li>
<li><strong>GitHub Pages</strong>: il frontend è ospitato su GitHub Pages. GitHub potrebbe raccogliere dati di accesso secondo la propria <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank">privacy policy</a>.</li>
</ul>
<h3>Conservazione dei dati</h3>
<p>I dati dell'account vengono conservati finché l'account è attivo. Gli utenti possono richiedere la cancellazione del proprio account contattandoci.</p>
<h3>Contatti</h3>
<p>Per qualsiasi domanda: <a href="mailto:glaciopia@outlook.com">glaciopia@outlook.com</a></p>`,
    en: `<h2><i class="fas fa-shield-halved" style="margin-right:.5rem;color:#5b9cf6"></i>Privacy Policy</h2>
<p>Last updated: May 2025</p>
<h3>Data collected</h3>
<p>This site collects limited personal data exclusively for user account functionality (username, email, hashed password). Data is stored in a PostgreSQL database hosted on AWS.</p>
<h3>Cookies and local storage</h3>
<p>We use <strong>localStorage</strong> to save language preferences, theme, and game progress. No profiling or third-party cookies.</p>
<h3>User-uploaded content</h3>
<p>Images uploaded by users (fanart, team avatars, VTuber images) are stored in Amazon S3 buckets. Uploads happen via pre-signed URLs and files are publicly accessible once approved.</p>
<h3>Third-party services</h3>
<ul>
<li><strong>AWS (Lambda, RDS, S3, SES)</strong>: backend infrastructure. Data is processed in the eu-north-1 (Stockholm) and us-east-1 regions.</li>
<li><strong>Twitch</strong> and <strong>YouTube</strong>: public data fetched via APIs. No user data is transmitted.</li>
<li><strong>Google Fonts</strong>: may log the visitor's IP per its own privacy policy.</li>
<li><strong>GitHub Pages</strong>: the frontend is hosted on GitHub Pages. GitHub may collect access data per their <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank">privacy policy</a>.</li>
</ul>
<h3>Data retention</h3>
<p>Account data is kept as long as the account is active. Users can request deletion by contacting us.</p>
<h3>Contact</h3>
<p>For any questions: <a href="mailto:glaciopia@outlook.com">glaciopia@outlook.com</a></p>`,
    ro: `<h2><i class="fas fa-shield-halved" style="margin-right:.5rem;color:#5b9cf6"></i>Politica de Confidențialitate</h2>
<p>Ultima actualizare: Mai 2025</p>
<h3>Date colectate</h3>
<p>Acest site colectează date personale limitate exclusiv pentru funcționalitatea contului de utilizator (nume de utilizator, email, parolă criptată). Datele sunt stocate într-o bază de date PostgreSQL găzduită pe AWS.</p>
<h3>Cookie-uri și stocare locală</h3>
<p>Folosim <strong>localStorage</strong> pentru a salva preferințele de limbă, temă și progresul în joc. Niciun cookie de profilare sau terțe părți.</p>
<h3>Conținut încărcat de utilizatori</h3>
<p>Imaginile încărcate de utilizatori (fanart, avatare echipă, imagini VTuber) sunt stocate în bucket-uri Amazon S3. Încărcările se fac prin URL-uri pre-semnate iar fișierele sunt accesibile public după aprobare.</p>
<h3>Servicii terțe</h3>
<ul>
<li><strong>AWS (Lambda, RDS, S3, SES)</strong>: infrastructură backend. Datele sunt procesate în regiunile eu-north-1 (Stockholm) și us-east-1.</li>
<li><strong>Twitch</strong> și <strong>YouTube</strong>: date publice preluate prin API-uri. Nicio dată a utilizatorului nu este transmisă.</li>
<li><strong>Google Fonts</strong>: poate înregistra IP-ul vizitatorului conform propriei politici.</li>
<li><strong>GitHub Pages</strong>: frontend-ul este găzduit pe GitHub Pages conform <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank">politicii lor</a>.</li>
</ul>
<h3>Păstrarea datelor</h3>
<p>Datele contului sunt păstrate cât timp contul este activ. Utilizatorii pot solicita ștergerea contactându-ne.</p>
<h3>Contact</h3>
<p>Pentru orice întrebare: <a href="mailto:glaciopia@outlook.com">glaciopia@outlook.com</a></p>`
  },
  terms: {
    it: `<h2><i class="fas fa-file-contract" style="margin-right:.5rem;color:#5b9cf6"></i>Termini di Servizio</h2>
<p>Ultimo aggiornamento: Maggio 2025</p>
<h3>Utilizzo del sito</h3>
<p>Questo sito è un progetto personale di <strong>GlacioBoreale</strong>. Visitandolo accetti di non utilizzarlo per scopi illegali o dannosi.</p>
<h3>Account utente</h3>
<p>Per utilizzare alcune funzionalità (invio fanart, candidature team, salvataggio progressi di gioco) è necessario creare un account. L'utente è responsabile della sicurezza delle proprie credenziali.</p>
<h3>Contenuti caricati</h3>
<p>Caricando immagini o inviando contenuti, l'utente dichiara di averne i diritti e che il materiale non è offensivo, illegale o NSFW. Ci riserviamo il diritto di rimuovere qualsiasi contenuto senza preavviso.</p>
<h3>Contenuti del sito</h3>
<p>Tutti i contenuti originali (testi, loghi, codice) sono di proprietà di GlacioBoreale salvo diversa indicazione. È vietata la riproduzione senza autorizzazione.</p>
<h3>Limitazione di responsabilità</h3>
<p>Il sito viene fornito "così com'è". Non garantiamo la disponibilità continua del servizio né l'assenza di errori o perdite di dati.</p>
<h3>Link esterni</h3>
<p>Il sito può contenere link a piattaforme esterne (Twitch, YouTube, Discord, ecc.). Non siamo responsabili dei contenuti presenti su siti di terze parti.</p>
<h3>Modifiche</h3>
<p>Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche sostanziali verranno comunicate attraverso il sito.</p>
<h3>Contatti</h3>
<p>Per qualsiasi domanda: <a href="mailto:glaciopia@outlook.com">glaciopia@outlook.com</a></p>`,
    en: `<h2><i class="fas fa-file-contract" style="margin-right:.5rem;color:#5b9cf6"></i>Terms of Service</h2>
<p>Last updated: May 2025</p>
<h3>Use of the site</h3>
<p>This site is a personal project by <strong>GlacioBoreale</strong>. By visiting it, you agree not to use it for illegal or harmful purposes.</p>
<h3>User accounts</h3>
<p>Some features (submitting fanart, team applications, saving game progress) require creating an account. Users are responsible for the security of their credentials.</p>
<h3>Uploaded content</h3>
<p>By uploading images or submitting content, the user declares they have the rights to it and that the material is not offensive, illegal, or NSFW. We reserve the right to remove any content without notice.</p>
<h3>Site content</h3>
<p>All original content (texts, logos, code) is owned by GlacioBoreale unless otherwise stated. Reproduction without permission is prohibited.</p>
<h3>Limitation of liability</h3>
<p>The site is provided "as is". We do not guarantee continuous availability, absence of errors, or data loss.</p>
<h3>External links</h3>
<p>The site may contain links to external platforms. We are not responsible for content on third-party sites.</p>
<h3>Changes</h3>
<p>We reserve the right to modify these terms at any time. Significant changes will be communicated through the site.</p>
<h3>Contact</h3>
<p>For any questions: <a href="mailto:glaciopia@outlook.com">glaciopia@outlook.com</a></p>`,
    ro: `<h2><i class="fas fa-file-contract" style="margin-right:.5rem;color:#5b9cf6"></i>Termeni și Condiții</h2>
<p>Ultima actualizare: Mai 2025</p>
<h3>Utilizarea site-ului</h3>
<p>Acest site este un proiect personal al lui <strong>GlacioBoreale</strong>. Prin vizitarea sa, ești de acord să nu îl folosești în scopuri ilegale sau dăunătoare.</p>
<h3>Conturi de utilizator</h3>
<p>Unele funcționalități (trimiterea de fanart, candidaturi pentru echipă, salvarea progresului în joc) necesită crearea unui cont. Utilizatorul este responsabil pentru securitatea credențialelor sale.</p>
<h3>Conținut încărcat</h3>
<p>Prin încărcarea de imagini sau trimiterea de conținut, utilizatorul declară că deține drepturile asupra acestuia și că materialul nu este ofensator, ilegal sau NSFW. Ne rezervăm dreptul de a elimina orice conținut fără notificare prealabilă.</p>
<h3>Conținutul site-ului</h3>
<p>Tot conținutul original (texte, logo-uri, cod) aparține lui GlacioBoreale. Reproducerea fără permisiune este interzisă.</p>
<h3>Limitarea răspunderii</h3>
<p>Site-ul este furnizat "ca atare". Nu garantăm disponibilitatea continuă, absența erorilor sau pierderea datelor.</p>
<h3>Link-uri externe</h3>
<p>Site-ul poate conține link-uri către platforme externe. Nu suntem responsabili pentru conținutul site-urilor terțe.</p>
<h3>Modificări</h3>
<p>Ne rezervăm dreptul de a modifica acești termeni oricând. Modificările semnificative vor fi comunicate prin intermediul site-ului.</p>
<h3>Contact</h3>
<p>Pentru orice întrebare: <a href="mailto:glaciopia@outlook.com">glaciopia@outlook.com</a></p>`
  }
};

function openFooterPopup(type) {
  const overlay = document.getElementById('footer-popup-overlay');
  const body    = document.getElementById('footer-popup-body');
  if (!overlay || !body) return;
  const lang    = typeof currentLang !== 'undefined' ? currentLang : 'it';
  const content = FOOTER_POPUP_CONTENT[type];
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

function initDiscordCopy() {
  const username = document.querySelector('.discord-username .username');
  if (!username) return;
  username.addEventListener('click', () => {
    navigator.clipboard.writeText(username.textContent).then(() => {
      const original = username.textContent;
      username.textContent = '✓ Copiato!';
      setTimeout(() => { username.textContent = original; }, 1500);
    }).catch(e => console.error('Copia fallita:', e));
  });
}
