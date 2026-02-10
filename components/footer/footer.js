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