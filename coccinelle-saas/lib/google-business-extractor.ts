// Extracteur intelligent pour les fiches d'établissement Google

export interface GoogleBusinessData {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: { [key: string]: string };
  description?: string;
  services?: string[];
  category?: string;
  rating?: number;
  reviews?: number;
}

/**
 * Extrait les données d'une fiche Google Business depuis une URL
 * Supporte: Google Maps, Google Search, etc.
 */
export async function extractGoogleBusinessData(url: string): Promise<GoogleBusinessData | null> {
  try {
    const axios = (await import('axios')).default;
    const cheerio = await import('cheerio');

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    const $ = cheerio.load(response.data);

    // Extraire les données JSON-LD (format structuré utilisé par Google)
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let businessData: GoogleBusinessData | null = null;

    jsonLdScripts.each((_, script) => {
      try {
        const jsonContent = $(script).html();
        if (!jsonContent) return;

        const data = JSON.parse(jsonContent);

        // Chercher les données de type LocalBusiness ou Organization
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Organization') {
          businessData = {
            name: data.name || '',
            address: formatAddress(data.address),
            phone: data.telephone || data.phone,
            website: data.url,
            description: data.description,
            category: data['@type'],
            rating: data.aggregateRating?.ratingValue,
            reviews: data.aggregateRating?.reviewCount
          };

          // Horaires d'ouverture
          if (data.openingHoursSpecification) {
            businessData.hours = parseOpeningHours(data.openingHoursSpecification);
          }
        }
      } catch (e) {
        // Ignorer les erreurs de parsing JSON
      }
    });

    // Si pas de JSON-LD, essayer d'extraire depuis le HTML
    if (!businessData) {
      businessData = extractFromHTML($);
    }

    return businessData;
  } catch (error) {
    console.error('Erreur extraction Google Business:', error);
    return null;
  }
}

/**
 * Formatte une adresse depuis les données JSON-LD
 */
function formatAddress(address: any): string {
  if (typeof address === 'string') return address;

  if (address && typeof address === 'object') {
    const parts = [
      address.streetAddress,
      address.addressLocality,
      address.postalCode,
      address.addressCountry
    ].filter(Boolean);

    return parts.join(', ');
  }

  return '';
}

/**
 * Parse les horaires d'ouverture
 */
function parseOpeningHours(hoursSpec: any): { [key: string]: string } {
  const hours: { [key: string]: string } = {};

  if (Array.isArray(hoursSpec)) {
    hoursSpec.forEach((spec: any) => {
      const day = spec.dayOfWeek?.replace('http://schema.org/', '') || spec.dayOfWeek;
      const opens = spec.opens;
      const closes = spec.closes;

      if (day && opens && closes) {
        hours[day] = `${opens} - ${closes}`;
      }
    });
  }

  return hours;
}

/**
 * Extrait les données directement depuis le HTML (fallback)
 */
function extractFromHTML($: any): GoogleBusinessData {
  const data: GoogleBusinessData = {
    name: '',
    address: ''
  };

  // Essayer différents sélecteurs pour le nom
  data.name =
    $('h1[class*="title"]').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().split('|')[0].trim();

  // Adresse
  data.address =
    $('[data-item-id*="address"]').text().trim() ||
    $('[class*="address"]').first().text().trim();

  // Téléphone
  const phoneText = $('[data-item-id*="phone"]').text().trim() ||
                    $('[class*="phone"]').first().text().trim();
  if (phoneText) {
    data.phone = phoneText;
  }

  // Site web
  const websiteLink = $('a[data-item-id*="authority"]').attr('href') ||
                      $('a[class*="website"]').attr('href');
  if (websiteLink) {
    data.website = websiteLink;
  }

  return data;
}

/**
 * Convertit les données Google Business en documents structurés
 */
export function googleBusinessToDocuments(data: GoogleBusinessData): Array<{ title: string; content: string; category: string }> {
  const documents = [];

  // Document principal - Informations générales
  let mainContent = `# ${data.name}\n\n`;

  if (data.description) {
    mainContent += `${data.description}\n\n`;
  }

  if (data.category) {
    mainContent += `**Catégorie**: ${data.category}\n\n`;
  }

  if (data.rating && data.reviews) {
    mainContent += `**Note**: ${data.rating}/5 (${data.reviews} avis)\n\n`;
  }

  documents.push({
    title: `À propos de ${data.name}`,
    content: mainContent,
    category: 'about'
  });

  // Document Contact
  let contactContent = `# Coordonnées\n\n`;
  contactContent += `**Adresse**: ${data.address}\n\n`;

  if (data.phone) {
    contactContent += `**Téléphone**: ${data.phone}\n\n`;
  }

  if (data.website) {
    contactContent += `**Site web**: ${data.website}\n\n`;
  }

  documents.push({
    title: 'Contact',
    content: contactContent,
    category: 'contact'
  });

  // Document Horaires
  if (data.hours && Object.keys(data.hours).length > 0) {
    let hoursContent = `# Horaires d'ouverture\n\n`;

    const dayNames: { [key: string]: string } = {
      'Monday': 'Lundi',
      'Tuesday': 'Mardi',
      'Wednesday': 'Mercredi',
      'Thursday': 'Jeudi',
      'Friday': 'Vendredi',
      'Saturday': 'Samedi',
      'Sunday': 'Dimanche'
    };

    Object.entries(data.hours).forEach(([day, hours]) => {
      const frenchDay = dayNames[day] || day;
      hoursContent += `**${frenchDay}**: ${hours}\n\n`;
    });

    documents.push({
      title: 'Horaires',
      content: hoursContent,
      category: 'schedule'
    });
  }

  // Document Services
  if (data.services && data.services.length > 0) {
    let servicesContent = `# Nos Services\n\n`;
    data.services.forEach(service => {
      servicesContent += `- ${service}\n`;
    });

    documents.push({
      title: 'Services',
      content: servicesContent,
      category: 'services'
    });
  }

  return documents;
}
