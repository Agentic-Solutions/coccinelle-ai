import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppClientFromEnv } from '@/modules/channels/whatsapp/whatsappClient';
import { createWhatsAppService } from '@/modules/channels/whatsapp/whatsappService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, templateId, data, mediaUrl } = body;

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
    const whatsappClient = createWhatsAppClientFromEnv(process.env);
    const whatsappService = createWhatsAppService(whatsappClient);

    // Envoyer le message WhatsApp
    const result = await whatsappService.sendTemplatedMessage({
      tenantId: 'test', // TODO: Get from session
      to,
      customMessage: message,
      templateId,
      data,
      mediaUrl: mediaUrl ? [mediaUrl] : undefined,
    });

    return NextResponse.json({
      success: true,
      channel: 'whatsapp',
      messageId: result.id,
      status: result.status,
      to: result.to,
      from: result.from,
    });
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send WhatsApp message',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
