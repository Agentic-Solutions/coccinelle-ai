// Fonction pour générer la page RDV (style Claude.ai)
export function generateAppointmentPage(appointment, token) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon rendez-vous - Coccinelle.ai</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f7f7f8;
      color: #2d2d2d;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
      overflow: hidden;
    }
    .header {
      padding: 24px;
      border-bottom: 1px solid #e5e5e5;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      color: #2d2d2d;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 14px;
      color: #666;
    }
    .status {
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
    }
    .status.confirmed {
      background: #f0fdf4;
      color: #166534;
      border-bottom: 1px solid #bbf7d0;
    }
    .status.cancelled {
      background: #fef2f2;
      color: #991b1b;
      border-bottom: 1px solid #fecaca;
    }
    .content {
      padding: 24px;
    }
    .info-block {
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-block:last-child {
      border-bottom: none;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .info-value {
      font-size: 16px;
      color: #2d2d2d;
      font-weight: 500;
    }
    .info-sub {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .actions {
      padding: 24px;
      background: #fafafa;
      border-top: 1px solid #e5e5e5;
    }
    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 12px;
    }
    .btn:last-child {
      margin-bottom: 0;
    }
    .btn-primary {
      background: #2d2d2d;
      color: white;
    }
    .btn-primary:hover {
      background: #1a1a1a;
    }
    .btn-secondary {
      background: white;
      color: #2d2d2d;
      border: 1px solid #d0d0d0;
    }
    .btn-secondary:hover {
      background: #f5f5f5;
    }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 13px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      
      <div class="header">
        <h1>Votre rendez-vous</h1>
        <p>Coccinelle.ai</p>
      </div>
      
      ${appointment.status === 'cancelled' ? `
        <div class="status cancelled">
          Rendez-vous annulé${appointment.cancellation_reason ? ` · ${appointment.cancellation_reason}` : ''}
        </div>
      ` : `
        <div class="status confirmed">
          Rendez-vous confirmé
        </div>
      `}
      
      <div class="content">
        
        <div class="info-block">
          <div class="info-label">Date et heure</div>
          <div class="info-value">${formatDateTime(appointment.scheduled_at)}</div>
          <div class="info-sub">Durée : ${appointment.duration_minutes} minutes</div>
        </div>
        
        ${appointment.property_title ? `
        <div class="info-block">
          <div class="info-label">Bien concerné</div>
          <div class="info-value">${appointment.property_title}</div>
          ${appointment.property_address ? `<div class="info-sub">${appointment.property_address}</div>` : ''}
        </div>
        ` : ''}
        
        ${appointment.agent_first_name ? `
        <div class="info-block">
          <div class="info-label">Conseiller</div>
          <div class="info-value">${appointment.agent_first_name} ${appointment.agent_last_name}</div>
        </div>
        ` : ''}
        
      </div>
      
      ${appointment.status !== 'cancelled' ? `
      <div class="actions">
        <button class="btn btn-primary" onclick="modifyAppointment()">Modifier la date</button>
        <button class="btn btn-secondary" onclick="cancelAppointment()">Annuler le rendez-vous</button>
      </div>
      ` : ''}
      
    </div>
    
    <div class="footer">
      Coccinelle.ai
    </div>
  </div>
  
  <script>
    async function modifyAppointment() {
      const newDate = prompt('Nouvelle date et heure\\n\\nFormat : JJ/MM/AAAA HH:MM\\nExemple : 06/10/2025 14:30');
      if (!newDate) return;
      
      try {
        const [datePart, timePart] = newDate.split(' ');
        const [day, month, year] = datePart.split('/');
        const isoDate = new Date(\`\${year}-\${month}-\${day}T\${timePart}:00Z\`).toISOString();
        
        const response = await fetch('/rdv/${token}/modify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_date: isoDate })
        });
        
        const data = await response.json();
        if (data.success) {
          alert('Rendez-vous modifié avec succès');
          location.reload();
        } else {
          alert('Erreur : ' + data.error);
        }
      } catch (err) {
        alert('Format de date invalide. Utilisez JJ/MM/AAAA HH:MM');
      }
    }
    
    async function cancelAppointment() {
      if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
        return;
      }
      
      const reason = prompt('Raison de l\\'annulation (optionnel) :');
      
      try {
        const response = await fetch('/rdv/${token}/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        });
        
        const data = await response.json();
        if (data.success) {
          alert('Rendez-vous annulé');
          location.reload();
        }
      } catch (err) {
        alert('Erreur lors de l\\'annulation');
      }
    }
  </script>
</body>
</html>`;
}

function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
