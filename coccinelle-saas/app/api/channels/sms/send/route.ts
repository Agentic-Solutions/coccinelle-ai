export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createTwilioClientFromEnv } from '@/modules/channels/sms/twilioClient';
import { createSMSService } from '@/modules/channels/sms/smsService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, templateId, data } = body;

    // Vérifier les variables d'environnement
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Twilio credentials not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.local'
        },
        { status: 400 }
      );
    }

    // Initialiser le service
    const twilioClient = createTwilioClientFromEnv(process.env);
    const smsService = createSMSService(twilioClient);

    // Envoyer le SMS
    const result = await smsService.sendTemplatedSMS({
      tenantId: 'test', // TODO: Get from session
      to,
      customMessage: message,
      templateId,
      data,
    });

    return NextResponse.json({
      success: true,
      channel: 'sms',
      messageId: result.id,
      status: result.status,
      to: result.to,
      from: result.from,
    });
  } catch (error: any) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send SMS',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
