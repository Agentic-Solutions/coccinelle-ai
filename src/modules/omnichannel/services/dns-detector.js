/**
 * Service DNS Detector - Détection automatique du provider DNS
 */

import { omniLogger } from '../utils/logger.js';

export class DNSDetectorService {
  /**
   * Détecter le provider DNS d'un domaine
   */
  async detectProvider(domain) {
    try {
      omniLogger.info('Detecting DNS provider', { domain });

      // Récupérer les nameservers via DNS lookup
      const nameservers = await this.getNameservers(domain);

      if (!nameservers || nameservers.length === 0) {
        return {
          provider: 'unknown',
          nameservers: [],
          canAutoConfig: false
        };
      }

      // Analyser les nameservers pour identifier le provider
      const provider = this.identifyProvider(nameservers);

      omniLogger.info('DNS provider detected', { domain, provider, nameservers });

      return {
        provider: provider.name,
        providerName: provider.displayName,
        nameservers,
        canAutoConfig: provider.canAutoConfig,
        requiresOAuth: provider.requiresOAuth,
        supportsAPI: provider.supportsAPI
      };

    } catch (error) {
      omniLogger.error('Failed to detect DNS provider', { domain, error: error.message });
      return {
        provider: 'unknown',
        nameservers: [],
        canAutoConfig: false,
        error: error.message
      };
    }
  }

  /**
   * Récupérer les nameservers d'un domaine via DNS lookup
   */
  async getNameservers(domain) {
    try {
      // Utiliser l'API DNS-over-HTTPS de Cloudflare
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`,
        {
          headers: {
            'Accept': 'application/dns-json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`DNS query failed: ${response.status}`);
      }

      const data = await response.json();

      // Extraire les nameservers
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer
          .filter(answer => answer.type === 2) // Type 2 = NS record
          .map(answer => answer.data.toLowerCase().replace(/\.$/, '')); // Enlever le point final
      }

      return [];
    } catch (error) {
      omniLogger.error('Failed to get nameservers', { domain, error: error.message });
      throw error;
    }
  }

  /**
   * Identifier le provider à partir des nameservers
   */
  identifyProvider(nameservers) {
    const ns = nameservers.join(' ').toLowerCase();

    // Cloudflare
    if (ns.includes('cloudflare.com')) {
      return {
        name: 'cloudflare',
        displayName: 'Cloudflare',
        canAutoConfig: true,
        requiresOAuth: true,
        supportsAPI: true
      };
    }

    // OVH
    if (ns.includes('ovh.net') || ns.includes('ovh.com')) {
      return {
        name: 'ovh',
        displayName: 'OVH',
        canAutoConfig: false, // API disponible mais complexe pour particuliers
        requiresOAuth: false,
        supportsAPI: true
      };
    }

    // IONOS (1&1)
    if (ns.includes('ionos.com') || ns.includes('1and1.com') || ns.includes('1und1.de') || ns.includes('ui-dns')) {
      return {
        name: 'ionos',
        displayName: 'IONOS',
        canAutoConfig: false,
        requiresOAuth: false,
        supportsAPI: false
      };
    }

    // GoDaddy
    if (ns.includes('domaincontrol.com') || ns.includes('godaddy.com')) {
      return {
        name: 'godaddy',
        displayName: 'GoDaddy',
        canAutoConfig: false,
        requiresOAuth: false,
        supportsAPI: true
      };
    }

    // Gandi
    if (ns.includes('gandi.net')) {
      return {
        name: 'gandi',
        displayName: 'Gandi',
        canAutoConfig: false,
        requiresOAuth: false,
        supportsAPI: true
      };
    }

    // Namecheap
    if (ns.includes('namecheap.com') || ns.includes('registrar-servers.com')) {
      return {
        name: 'namecheap',
        displayName: 'Namecheap',
        canAutoConfig: false,
        requiresOAuth: false,
        supportsAPI: true
      };
    }

    // Google Domains / Google Cloud DNS
    if (ns.includes('googledomains.com') || ns.includes('google.com')) {
      return {
        name: 'google',
        displayName: 'Google Domains',
        canAutoConfig: false,
        requiresOAuth: false,
        supportsAPI: true
      };
    }

    // Route53 (AWS)
    if (ns.includes('awsdns')) {
      return {
        name: 'route53',
        displayName: 'AWS Route53',
        canAutoConfig: false,
        requiresOAuth: false,
        supportsAPI: true
      };
    }

    // Provider inconnu
    return {
      name: 'unknown',
      displayName: 'Autre hébergeur',
      canAutoConfig: false,
      requiresOAuth: false,
      supportsAPI: false
    };
  }

  /**
   * Générer les instructions de forwarding email selon le provider
   */
  generateForwardingInstructions(provider, emailAddress, forwardingAddress) {
    const instructions = {
      provider: provider,
      steps: []
    };

    switch (provider) {
      case 'ovh':
        instructions.title = 'Configuration sur OVH';
        instructions.steps = [
          {
            step: 1,
            title: 'Accéder à l\'espace client OVH',
            description: 'Connectez-vous sur https://www.ovh.com/manager/',
            url: 'https://www.ovh.com/manager/'
          },
          {
            step: 2,
            title: 'Sélectionner votre domaine',
            description: 'Dans la section "Noms de domaine", cliquez sur votre domaine'
          },
          {
            step: 3,
            title: 'Créer la redirection email',
            description: `Allez dans l'onglet "Emails" puis "Redirections"`,
            details: [
              `De : ${emailAddress}`,
              `Vers : ${forwardingAddress}`,
              'Type : Redirection simple'
            ]
          },
          {
            step: 4,
            title: 'Valider',
            description: 'Cliquez sur "Ajouter une redirection" et validez'
          }
        ];
        break;

      case 'ionos':
        instructions.title = 'Configuration sur IONOS';
        instructions.steps = [
          {
            step: 1,
            title: 'Accéder à l\'espace client IONOS',
            description: 'Connectez-vous sur https://www.ionos.fr',
            url: 'https://www.ionos.fr'
          },
          {
            step: 2,
            title: 'Gérer les emails',
            description: 'Allez dans "Email" puis "Gérer les adresses email"'
          },
          {
            step: 3,
            title: 'Créer une redirection',
            description: `Créez ou modifiez l'adresse ${emailAddress}`,
            details: [
              'Type : Redirection',
              `Rediriger vers : ${forwardingAddress}`
            ]
          }
        ];
        break;

      case 'godaddy':
        instructions.title = 'Configuration sur GoDaddy';
        instructions.steps = [
          {
            step: 1,
            title: 'Accéder au compte GoDaddy',
            description: 'Connectez-vous sur https://www.godaddy.com',
            url: 'https://www.godaddy.com'
          },
          {
            step: 2,
            title: 'Gérer les emails',
            description: 'Allez dans "Email" et sélectionnez votre domaine'
          },
          {
            step: 3,
            title: 'Créer un transfert',
            description: 'Créez un transfert d\'email',
            details: [
              `De : ${emailAddress}`,
              `Vers : ${forwardingAddress}`
            ]
          }
        ];
        break;

      case 'gandi':
        instructions.title = 'Configuration sur Gandi';
        instructions.steps = [
          {
            step: 1,
            title: 'Accéder à Gandi',
            description: 'Connectez-vous sur https://www.gandi.net',
            url: 'https://www.gandi.net'
          },
          {
            step: 2,
            title: 'Gérer les emails',
            description: 'Allez dans "Email" puis "Redirections"'
          },
          {
            step: 3,
            title: 'Créer une redirection',
            description: 'Ajoutez une nouvelle redirection',
            details: [
              `Source : ${emailAddress}`,
              `Destination : ${forwardingAddress}`
            ]
          }
        ];
        break;

      default:
        instructions.title = 'Configuration manuelle';
        instructions.steps = [
          {
            step: 1,
            title: 'Accéder à votre hébergeur',
            description: 'Connectez-vous à l\'interface de gestion de votre domaine'
          },
          {
            step: 2,
            title: 'Trouver la section Email',
            description: 'Cherchez "Redirections email", "Transferts" ou "Email forwarding"'
          },
          {
            step: 3,
            title: 'Créer une redirection',
            description: 'Créez une redirection d\'email avec ces paramètres :',
            details: [
              `Email source : ${emailAddress}`,
              `Email de destination : ${forwardingAddress}`,
              'Type : Redirection simple (pas de copie locale)'
            ]
          },
          {
            step: 4,
            title: 'Besoin d\'aide ?',
            description: 'Contactez le support de votre hébergeur ou consultez leur documentation sur les redirections email'
          }
        ];
        break;
    }

    return instructions;
  }
}
