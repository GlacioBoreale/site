// Funzione per caricare il footer
async function loadFooter() {
  try {
    console.log('Caricamento footer...');
    const response = await fetch('./components/footer/footer.html');
    if (!response.ok) throw new Error('Errore nel caricamento footer');
    const footerHTML = await response.text();
    document.getElementById('footer-placeholder').innerHTML = footerHTML;
    console.log('Footer caricato!');
    
    // Imposta l'anno corrente
    setCurrentYear();
    
    // Aggiungi funzionalità copia username Discord
    addDiscordCopyFeature();
    
  } catch (error) {
    console.error('Errore footer:', error);
  }
}

// Imposta l'anno corrente nel copyright
function setCurrentYear() {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// Funzionalità per copiare username Discord
function addDiscordCopyFeature() {
  const usernameElement = document.querySelector('.discord-username .username');
  if (usernameElement) {
    usernameElement.addEventListener('click', () => {
      const username = usernameElement.textContent;
      navigator.clipboard.writeText(username).then(() => {
        // Feedback visivo
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