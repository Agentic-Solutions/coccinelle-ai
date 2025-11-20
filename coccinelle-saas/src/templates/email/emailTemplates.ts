/**
 * Email Templates - Coccinelle.AI
 *
 * Templates HTML pour emails professionnels
 */

export interface EmailTemplateData {
  companyName?: string;
  companyLogo?: string;
  firstName?: string;
  lastName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentLocation?: string;
  agentName?: string;
  agentPhoto?: string;
  agentPhone?: string;
  agentEmail?: string;
  confirmationLink?: string;
  cancellationLink?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyPrice?: string;
  propertyPhotos?: string[];
  propertyLink?: string;
  documentLink?: string;
  documentName?: string;
  surveyLink?: string;
  unsubscribeLink?: string;
  [key: string]: string | string[] | undefined;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'appointment' | 'property' | 'document' | 'survey' | 'marketing' | 'notification';
  subject: string;
  html: string;
  variables: string[];
  description: string;
}

/**
 * Helper pour générer le header HTML commun
 */
function getEmailHeader(companyName: string, companyLogo?: string): string {
  return `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
      ${companyLogo
        ? `<img src="${companyLogo}" alt="${companyName}" style="max-width: 150px; height: auto; margin-bottom: 10px;" />`
        : `<h1 style="color: white; margin: 0; font-size: 28px;">${companyName}</h1>`
      }
    </div>
  `;
}

/**
 * Helper pour générer le footer HTML commun
 */
function getEmailFooter(companyName: string, unsubscribeLink?: string): string {
  return `
    <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px;">
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${companyName}. Tous droits réservés.</p>
      <p style="margin: 5px 0;">Propulsé par Coccinelle.AI - Assistant IA intelligent</p>
      ${unsubscribeLink
        ? `<p style="margin: 10px 0;"><a href="${unsubscribeLink}" style="color: #6b7280; text-decoration: underline;">Se désabonner</a></p>`
        : ''
      }
    </div>
  `;
}

/**
 * Collection de templates Email
 */
export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  // === RAPPELS RDV ===
  APPOINTMENT_CONFIRMATION_EMAIL: {
    id: 'appointment_confirmation_email',
    name: 'Confirmation de RDV (Email)',
    category: 'appointment',
    subject: '✅ RDV confirmé - {{appointmentDate}} à {{appointmentTime}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        {{header}}

        <div style="padding: 30px 20px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Bonjour {{firstName}},</h2>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Votre rendez-vous a été <strong style="color: #10b981;">confirmé avec succès</strong> !
          </p>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #047857; margin-top: 0; font-size: 18px;">📅 Détails du rendez-vous</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">📆 Date</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">{{appointmentDate}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">⏰ Heure</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">{{appointmentTime}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">📍 Lieu</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">{{appointmentLocation}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">👤 Agent</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">{{agentName}}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{confirmationLink}}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Voir les détails
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
            💡 <strong>Besoin d'annuler ou de reporter ?</strong><br/>
            <a href="{{cancellationLink}}" style="color: #6b7280; text-decoration: underline;">Cliquez ici</a> ou contactez-nous au {{agentPhone}}
          </p>

          <p style="color: #4b5563; margin-top: 25px;">
            À bientôt,<br/>
            <strong>{{agentName}}</strong><br/>
            {{companyName}}
          </p>
        </div>

        {{footer}}
      </div>
    `,
    variables: ['firstName', 'appointmentDate', 'appointmentTime', 'appointmentLocation', 'agentName', 'agentPhone', 'confirmationLink', 'cancellationLink', 'companyName'],
    description: 'Email de confirmation de rendez-vous avec tous les détails',
  },

  APPOINTMENT_REMINDER_24H_EMAIL: {
    id: 'appointment_reminder_24h_email',
    name: 'Rappel RDV 24h (Email)',
    category: 'appointment',
    subject: '⏰ Rappel: RDV demain à {{appointmentTime}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        {{header}}

        <div style="padding: 30px 20px;">
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
            <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">⏰ Rappel de rendez-vous</h2>
            <p style="color: #78350f; margin: 0; font-size: 16px;">
              Votre rendez-vous est <strong>demain</strong> !
            </p>
          </div>

          <p style="color: #4b5563; font-size: 16px;">
            Bonjour {{firstName}},
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Nous vous rappelons votre rendez-vous prévu <strong>demain</strong> :
          </p>

          <table style="width: 100%; background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 6px;">
            <tr>
              <td style="padding: 10px; color: #6b7280;">📆 Date</td>
              <td style="padding: 10px; color: #1f2937; font-weight: 600;">{{appointmentDate}}</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #6b7280;">⏰ Heure</td>
              <td style="padding: 10px; color: #1f2937; font-weight: 600;">{{appointmentTime}}</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #6b7280;">📍 Lieu</td>
              <td style="padding: 10px; color: #1f2937; font-weight: 600;">{{appointmentLocation}}</td>
            </tr>
          </table>

          <p style="color: #6b7280; font-size: 14px; background: #eff6ff; padding: 15px; border-radius: 6px;">
            💡 <strong>Conseil</strong> : Prévoyez d'arriver 5 minutes en avance
          </p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="{{cancellationLink}}" style="color: #dc2626; text-decoration: underline; font-size: 14px;">
              Besoin d'annuler ou reporter ?
            </a>
          </div>
        </div>

        {{footer}}
      </div>
    `,
    variables: ['firstName', 'appointmentDate', 'appointmentTime', 'appointmentLocation', 'cancellationLink'],
    description: 'Rappel automatique 24h avant le rendez-vous',
  },

  // === BIENS IMMOBILIERS ===
  NEW_PROPERTY_ALERT: {
    id: 'new_property_alert',
    name: 'Alerte Nouveau Bien',
    category: 'property',
    subject: '🏡 Nouveau bien: {{propertyTitle}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        {{header}}

        <div style="padding: 30px 20px;">
          <h2 style="color: #1f2937; margin-bottom: 15px;">🏡 Nouveau bien correspondant à vos critères !</h2>

          <p style="color: #4b5563; font-size: 16px;">
            Bonjour {{firstName}},
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Nous avons le plaisir de vous présenter un bien qui pourrait vous intéresser :
          </p>

          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 25px 0;">
            {{#if propertyPhotos}}
            <img src="{{propertyPhotos.0}}" alt="{{propertyTitle}}" style="width: 100%; height: 300px; object-fit: cover;" />
            {{/if}}

            <div style="padding: 20px;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 22px;">{{propertyTitle}}</h3>
              <p style="color: #6b7280; margin: 5px 0;">📍 {{propertyAddress}}</p>
              <p style="color: #10b981; font-size: 28px; font-weight: 700; margin: 15px 0;">{{propertyPrice}}</p>

              <a href="{{propertyLink}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px;">
                Voir le bien en détail →
              </a>
            </div>
          </div>

          <p style="color: #6b7280; font-size: 14px; background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 20px;">
            💡 <strong>Intéressé(e) ?</strong> Contactez {{agentName}} au {{agentPhone}} pour organiser une visite !
          </p>
        </div>

        {{footer}}
      </div>
    `,
    variables: ['firstName', 'propertyTitle', 'propertyAddress', 'propertyPrice', 'propertyPhotos', 'propertyLink', 'agentName', 'agentPhone'],
    description: 'Alerte email pour nouveau bien immobilier',
  },

  // === DOCUMENTS ===
  DOCUMENT_READY_EMAIL: {
    id: 'document_ready_email',
    name: 'Document Prêt',
    category: 'document',
    subject: '📄 Votre document est prêt: {{documentName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        {{header}}

        <div style="padding: 30px 20px;">
          <h2 style="color: #1f2937; margin-bottom: 15px;">📄 Votre document est prêt</h2>

          <p style="color: #4b5563; font-size: 16px;">
            Bonjour {{firstName}},
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Votre document <strong>{{documentName}}</strong> est maintenant disponible au téléchargement.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{documentLink}}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              📥 Télécharger le document
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; background: #eff6ff; padding: 15px; border-radius: 6px;">
            🔒 <strong>Sécurité</strong> : Ce lien est valide pendant 7 jours
          </p>

          <p style="color: #4b5563; margin-top: 25px;">
            Cordialement,<br/>
            <strong>{{companyName}}</strong>
          </p>
        </div>

        {{footer}}
      </div>
    `,
    variables: ['firstName', 'documentName', 'documentLink', 'companyName'],
    description: 'Notification de document prêt avec lien de téléchargement',
  },

  // === ENQUÊTES ===
  SATISFACTION_SURVEY_EMAIL: {
    id: 'satisfaction_survey_email',
    name: 'Enquête de Satisfaction',
    category: 'survey',
    subject: '⭐ Votre avis nous intéresse - {{companyName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        {{header}}

        <div style="padding: 30px 20px;">
          <h2 style="color: #1f2937; margin-bottom: 15px;">⭐ Votre avis compte pour nous</h2>

          <p style="color: #4b5563; font-size: 16px;">
            Bonjour {{firstName}},
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Merci d'avoir fait confiance à {{companyName}}. Nous aimerions connaître votre expérience pour continuer à nous améliorer.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; margin-bottom: 15px;">Comment évaluez-vous notre service ?</p>

            <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
              <a href="{{surveyLink}}?rating=5" style="display: inline-block; background: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 5px;">
                ⭐⭐⭐⭐⭐ Excellent
              </a>
              <a href="{{surveyLink}}?rating=4" style="display: inline-block; background: #6366f1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 5px;">
                ⭐⭐⭐⭐ Très bien
              </a>
              <a href="{{surveyLink}}?rating=3" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 5px;">
                ⭐⭐⭐ Bien
              </a>
            </div>
          </div>

          <p style="color: #6b7280; font-size: 13px; text-align: center;">
            Cela ne prendra qu'une minute et nous aide énormément !
          </p>
        </div>

        {{footer}}
      </div>
    `,
    variables: ['firstName', 'companyName', 'surveyLink'],
    description: 'Enquête de satisfaction post-service',
  },

  // === MARKETING ===
  WELCOME_EMAIL: {
    id: 'welcome_email',
    name: 'Email de Bienvenue',
    category: 'marketing',
    subject: '👋 Bienvenue chez {{companyName}} !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        {{header}}

        <div style="padding: 30px 20px;">
          <h2 style="color: #1f2937; margin-bottom: 15px;">👋 Bienvenue {{firstName}} !</h2>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Merci de faire confiance à <strong>{{companyName}}</strong>. Nous sommes ravis de vous accompagner dans votre projet !
          </p>

          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #047857; margin-top: 0;">🎯 Prochaines étapes</h3>
            <ol style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li>Parcourez nos biens disponibles</li>
              <li>Contactez-nous pour une visite</li>
              <li>Laissez-nous vous guider dans votre projet</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{propertyLink}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Découvrir nos biens
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; background: #eff6ff; padding: 15px; border-radius: 6px;">
            💬 <strong>Besoin d'aide ?</strong> Notre équipe est à votre écoute au {{agentPhone}} ou par email à {{agentEmail}}
          </p>
        </div>

        {{footer}}
      </div>
    `,
    variables: ['firstName', 'companyName', 'propertyLink', 'agentPhone', 'agentEmail'],
    description: 'Email de bienvenue pour nouveaux clients',
  },
};

/**
 * Rendre un template email avec les données
 */
export function renderEmailTemplate(
  templateId: string,
  data: EmailTemplateData
): { subject: string; html: string } {
  const template = EMAIL_TEMPLATES[templateId];

  if (!template) {
    throw new Error(`Template Email "${templateId}" non trouvé`);
  }

  let renderedHtml = template.html;
  let renderedSubject = template.subject;

  // Ajouter header et footer
  const header = getEmailHeader(data.companyName || 'Coccinelle.AI', data.companyLogo);
  const footer = getEmailFooter(data.companyName || 'Coccinelle.AI', data.unsubscribeLink);

  renderedHtml = renderedHtml.replace('{{header}}', header);
  renderedHtml = renderedHtml.replace('{{footer}}', footer);

  // Remplacer les variables simples
  template.variables.forEach(variable => {
    const value = data[variable];
    if (value && !Array.isArray(value)) {
      const placeholder = `{{${variable}}}`;
      renderedHtml = renderedHtml.replace(new RegExp(placeholder, 'g'), value);
      renderedSubject = renderedSubject.replace(new RegExp(placeholder, 'g'), value);
    }
  });

  // Gérer les conditionnels {{#if propertyPhotos}}
  renderedHtml = renderedHtml.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return data[varName] ? content : '';
  });

  return {
    subject: renderedSubject,
    html: renderedHtml,
  };
}

/**
 * Obtenir tous les templates d'une catégorie
 */
export function getEmailTemplatesByCategory(
  category: EmailTemplate['category']
): EmailTemplate[] {
  return Object.values(EMAIL_TEMPLATES).filter(t => t.category === category);
}
