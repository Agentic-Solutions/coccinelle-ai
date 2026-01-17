export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createChannelOrchestrator } from '@/modules/orchestrator/channelOrchestrator';
import { createSMSService } from '@/modules/channels/sms/smsService';
import { createEmailService } from '@/modules/channels/email/emailService';
import { createTwilioClientFromEnv } from '@/modules/channels/sms/twilioClient';
import { createEmailClientFromEnv } from '@/modules/channels/email/emailClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phone,
      email,
      message,
      subject,
      priority = 'normal',
      messageType = 'general',
      prospectName = 'Prospect',
    } = body;

    // Vérifier qu'au moins un canal est configuré
    const hasSMS = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
    const hasEmail = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;

    if (!hasSMS && !hasEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'No communication channels configured. Please add Twilio or Resend/SendGrid credentials to .env.local',
        },
        { status: 400 }
      );
    }

    // Initialiser les services disponibles
    const services: any = {};

    if (hasSMS) {
      const twilioClient = createTwilioClientFromEnv(process.env);
      services.smsService = createSMSService(twilioClient);
    }

    if (hasEmail) {
      const emailClient = createEmailClientFromEnv(process.env);
      services.emailService = createEmailService(emailClient);
    }

    // Créer l'orchestrator
    const orchestrator = createChannelOrchestrator(services);

    // Obtenir la décision de routage
    const decision = await orchestrator.decideChannel(
      {
        tenantId: 'test',
        prospectId: 'test_prospect',
        prospectName,
        prospectPhone: phone,
        prospectEmail: email,
        messageType,
        priority: { level: priority as any },
      },
      {
        subject,
        body: message,
      }
    );

    // Routage automatique
    const result = await orchestrator.routeMessage(
      {
        tenantId: 'test',
        prospectId: 'test_prospect',
        prospectName,
        prospectPhone: phone,
        prospectEmail: email,
        messageType,
        priority: { level: priority as any },
      },
      {
        subject,
        body: message,
      }
    );

    return NextResponse.json({
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
      status: result.status,
      fallbackUsed: result.fallbackAttempted || false,
      fallbackChannel: result.fallbackChannel,
      decision: {
        chosenChannel: decision.channel,
        reason: decision.reason,
        confidence: decision.confidence,
        estimatedCost: decision.estimatedCost,
        estimatedDeliveryTime: decision.estimatedDeliveryTime,
        alternatives: decision.alternativeChannels,
      },
    });
  } catch (error: any) {
    console.error('Auto routing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to route message',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
