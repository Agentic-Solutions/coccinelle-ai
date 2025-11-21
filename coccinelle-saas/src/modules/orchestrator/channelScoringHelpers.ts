/**
 * Helpers pour le scoring des canaux de communication
 * Extrait de channelOrchestrator.ts pour réduire la complexité
 */

import { ChannelType, MessageContext, MessageContent, ChannelPreferences } from './channelOrchestrator';

export interface ChannelScore {
  score: number;
  reasons: string[];
  cost: number;
  deliveryTime: number;
}

/**
 * Score basé sur les préférences utilisateur (+30 points)
 */
export function scoreByUserPreference(
  channel: ChannelType,
  context: MessageContext
): { score: number; reason?: string } {
  if (context.preferences?.preferredChannels.includes(channel)) {
    return { score: 30, reason: 'Preferred channel' };
  }
  return { score: 0 };
}

/**
 * Score basé sur l'urgence du message (+5 à +25 points)
 */
export function scoreByPriority(
  channel: ChannelType,
  priority: 'urgent' | 'high' | 'normal' | 'low'
): { score: number; reason?: string; deliveryTime: number } {
  if (priority === 'urgent') {
    if (channel === 'sms') {
      return { score: 25, reason: 'SMS best for urgent messages (98% open rate)', deliveryTime: 10 };
    } else if (channel === 'whatsapp') {
      return { score: 20, reason: 'WhatsApp good for urgent messages', deliveryTime: 30 };
    } else if (channel === 'email') {
      return { score: 5, reason: 'Email slower for urgent messages', deliveryTime: 300 };
    }
  } else if (priority === 'normal') {
    if (channel === 'email') {
      return { score: 20, reason: 'Email ideal for normal priority', deliveryTime: 60 };
    } else if (channel === 'sms') {
      return { score: 15, reason: 'SMS works for normal priority', deliveryTime: 10 };
    }
  } else if (priority === 'low') {
    if (channel === 'email') {
      return { score: 25, reason: 'Email best for low priority (cost-effective)', deliveryTime: 120 };
    }
  }
  return { score: 0, deliveryTime: 60 };
}

/**
 * Score basé sur le type de contenu (rich content, attachments)
 */
export function scoreByContentType(
  channel: ChannelType,
  content: MessageContent
): { score: number; reason?: string } {
  if (!content.html && !content.attachments) {
    return { score: 0 };
  }

  if (channel === 'email') {
    return { score: 25, reason: 'Email supports rich content and attachments' };
  } else if (channel === 'whatsapp') {
    return { score: 15, reason: 'WhatsApp supports rich media' };
  } else if (channel === 'sms') {
    return { score: -20, reason: 'SMS limited for rich content' };
  }

  return { score: 0 };
}

/**
 * Score basé sur la longueur du message
 */
export function scoreByMessageLength(
  channel: ChannelType,
  messageLength: number
): { score: number; reason?: string } {
  if (messageLength <= 160) {
    return { score: 0 };
  }

  if (channel === 'email') {
    return { score: 20, reason: 'Email better for long messages' };
  } else if (channel === 'sms') {
    return { score: -10, reason: 'SMS expensive for long messages' };
  }

  return { score: 0 };
}

/**
 * Score et coût par canal
 */
export function scoreByCost(
  channel: ChannelType,
  priority: 'urgent' | 'high' | 'normal' | 'low'
): { score: number; reason?: string; cost: number } {
  switch (channel) {
    case 'sms':
      if (priority === 'low') {
        return { score: -10, reason: 'SMS costly for low priority', cost: 0.05 };
      }
      return { score: 0, cost: 0.05 };

    case 'email':
      return { score: 15, reason: 'Email very cost-effective', cost: 0.0006 };

    case 'whatsapp':
      return { score: 10, reason: 'WhatsApp affordable', cost: 0.01 };

    case 'telegram':
      return { score: 20, reason: 'Telegram free', cost: 0 };

    default:
      return { score: 0, cost: 0 };
  }
}

/**
 * Score basé sur les heures de silence
 */
export function scoreByQuietHours(
  channel: ChannelType,
  preferences: ChannelPreferences | undefined,
  isQuiet: boolean
): { score: number; reason?: string } {
  if (!isQuiet) {
    return { score: 0 };
  }

  if (channel === 'sms' && !preferences?.allowSMSDuringQuietHours) {
    return { score: -30, reason: 'Quiet hours - SMS intrusive' };
  } else if (channel === 'email') {
    return { score: 10, reason: 'Email respectful during quiet hours' };
  }

  return { score: 0 };
}

/**
 * Score basé sur le type de message (appointment, marketing, etc.)
 */
export function scoreByMessageType(
  channel: ChannelType,
  messageType: 'appointment' | 'notification' | 'marketing' | 'survey' | 'general'
): { score: number; reason?: string } {
  if (messageType === 'appointment') {
    if (channel === 'sms') {
      return { score: 15, reason: 'SMS excellent for appointments' };
    }
  } else if (messageType === 'marketing') {
    if (channel === 'email') {
      return { score: 20, reason: 'Email ideal for marketing' };
    } else if (channel === 'sms') {
      return { score: -15, reason: 'SMS intrusive for marketing' };
    }
  } else if (messageType === 'notification') {
    if (channel === 'sms' || channel === 'whatsapp') {
      return { score: 15, reason: 'Instant channel good for notifications' };
    }
  }

  return { score: 0 };
}

/**
 * Vérifier si on est en heures de silence
 */
export function isQuietHours(preferences?: ChannelPreferences): boolean {
  if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Gérer le cas où les heures de silence passent minuit
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * Calculer le score total pour un canal
 */
export function calculateTotalScore(
  channel: ChannelType,
  context: MessageContext,
  content: MessageContent
): ChannelScore {
  const results = {
    score: 0,
    reasons: [] as string[],
    cost: 0,
    deliveryTime: 0
  };

  // 1. Préférences utilisateur
  const prefScore = scoreByUserPreference(channel, context);
  results.score += prefScore.score;
  if (prefScore.reason) results.reasons.push(prefScore.reason);

  // 2. Urgence
  const priorityScore = scoreByPriority(channel, context.priority.level);
  results.score += priorityScore.score;
  results.deliveryTime = priorityScore.deliveryTime;
  if (priorityScore.reason) results.reasons.push(priorityScore.reason);

  // 3. Type de contenu
  const contentScore = scoreByContentType(channel, content);
  results.score += contentScore.score;
  if (contentScore.reason) results.reasons.push(contentScore.reason);

  // 4. Longueur du message
  const lengthScore = scoreByMessageLength(channel, content.body.length);
  results.score += lengthScore.score;
  if (lengthScore.reason) results.reasons.push(lengthScore.reason);

  // 5. Coût
  const costScore = scoreByCost(channel, context.priority.level);
  results.score += costScore.score;
  results.cost = costScore.cost;
  if (costScore.reason) results.reasons.push(costScore.reason);

  // 6. Heures de silence
  const quietScore = scoreByQuietHours(channel, context.preferences, isQuietHours(context.preferences));
  results.score += quietScore.score;
  if (quietScore.reason) results.reasons.push(quietScore.reason);

  // 7. Type de message
  const typeScore = scoreByMessageType(channel, context.messageType);
  results.score += typeScore.score;
  if (typeScore.reason) results.reasons.push(typeScore.reason);

  // Normaliser le score entre 0 et 1
  const normalizedScore = Math.max(0, Math.min(1, results.score / 100));

  return {
    score: normalizedScore,
    reasons: results.reasons,
    cost: results.cost,
    deliveryTime: results.deliveryTime
  };
}
