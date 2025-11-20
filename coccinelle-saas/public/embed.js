(function() {
  'use strict';

  // Configuration
  const WIDGET_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://coccinelle.app'; // À remplacer par votre domaine de production

  // Récupérer le script actuel
  const currentScript = document.currentScript || document.querySelector('script[data-coccinelle-tenant]');

  if (!currentScript) {
    console.error('[Coccinelle Widget] Script tag not found');
    return;
  }

  // Récupérer les paramètres
  const tenantId = currentScript.getAttribute('data-coccinelle-tenant');
  const position = currentScript.getAttribute('data-position') || 'inline'; // inline | popup | button
  const theme = currentScript.getAttribute('data-theme') || 'light';
  const buttonText = currentScript.getAttribute('data-button-text') || 'Prendre rendez-vous';
  const buttonColor = currentScript.getAttribute('data-button-color') || '#000000';

  if (!tenantId) {
    console.error('[Coccinelle Widget] Missing data-coccinelle-tenant attribute');
    return;
  }

  // Créer le conteneur du widget
  const createWidget = () => {
    const widgetId = 'coccinelle-booking-widget-' + Math.random().toString(36).substr(2, 9);

    if (position === 'inline') {
      // Mode inline: remplacer le script par l'iframe
      const container = document.createElement('div');
      container.id = widgetId;
      container.style.cssText = `
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      `;

      const iframe = document.createElement('iframe');
      iframe.src = `${WIDGET_URL}/book/${tenantId}`;
      iframe.style.cssText = `
        width: 100%;
        height: 700px;
        border: none;
        display: block;
      `;
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('title', 'Réservation en ligne');

      container.appendChild(iframe);
      currentScript.parentNode.insertBefore(container, currentScript);

      // Responsive height adjustment
      window.addEventListener('message', (event) => {
        if (event.data.type === 'coccinelle-resize' && event.data.widgetId === widgetId) {
          iframe.style.height = event.data.height + 'px';
        }
      });

    } else if (position === 'button') {
      // Mode button: bouton flottant qui ouvre une modal
      const button = document.createElement('button');
      button.id = widgetId + '-btn';
      button.textContent = buttonText;
      button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: ${buttonColor};
        color: white;
        padding: 16px 24px;
        border-radius: 50px;
        border: none;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        z-index: 9998;
        transition: all 0.2s ease;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      });

      document.body.appendChild(button);

      // Créer la modal (cachée par défaut)
      const modal = document.createElement('div');
      modal.id = widgetId + '-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 16px;
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        overflow: hidden;
        position: relative;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      `;

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(0, 0, 0, 0.1);
        border: none;
        font-size: 32px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #333;
        transition: background 0.2s ease;
      `;

      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = 'rgba(0, 0, 0, 0.2)';
      });

      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
      });

      const iframe = document.createElement('iframe');
      iframe.src = `${WIDGET_URL}/book/${tenantId}`;
      iframe.style.cssText = `
        width: 100%;
        height: 80vh;
        border: none;
        display: block;
      `;
      iframe.setAttribute('title', 'Réservation en ligne');

      modalContent.appendChild(closeButton);
      modalContent.appendChild(iframe);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Event listeners
      button.addEventListener('click', () => {
        modal.style.display = 'flex';
      });

      closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });

      // Écouter les confirmations de réservation pour fermer la modal
      window.addEventListener('message', (event) => {
        if (event.data.type === 'coccinelle-booking-confirmed') {
          setTimeout(() => {
            modal.style.display = 'none';
          }, 3000);
        }
      });

    } else if (position === 'popup') {
      // Mode popup: affiche automatiquement après 5 secondes
      setTimeout(() => {
        const popup = document.createElement('div');
        popup.id = widgetId + '-popup';
        popup.style.cssText = `
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 400px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          z-index: 9999;
          overflow: hidden;
          animation: slideIn 0.3s ease-out;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
          background-color: ${buttonColor};
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Prendre rendez-vous';
        title.style.cssText = `
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        `;

        header.appendChild(title);
        header.appendChild(closeBtn);

        const iframe = document.createElement('iframe');
        iframe.src = `${WIDGET_URL}/book/${tenantId}`;
        iframe.style.cssText = `
          width: 100%;
          height: 500px;
          border: none;
          display: block;
        `;
        iframe.setAttribute('title', 'Réservation en ligne');

        popup.appendChild(header);
        popup.appendChild(iframe);
        document.body.appendChild(popup);

        closeBtn.addEventListener('click', () => {
          popup.remove();
        });

      }, 5000);
    }
  };

  // Initialiser le widget une fois le DOM chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

  // Ajouter l'animation CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  console.log('[Coccinelle Widget] Initialized for tenant:', tenantId);
})();
