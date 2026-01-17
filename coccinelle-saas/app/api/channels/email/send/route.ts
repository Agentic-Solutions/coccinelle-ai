export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createEmailClientFromEnv } from '@/modules/channels/email/emailClient';
import { createEmailService } from '@/modules/channels/email/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, templateId, data } = body;

    // Vérifier les variables d'environnement
    if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email provider not configured. Please add RESEND_API_KEY or SENDGRID_API_KEY to .env.local'
        },
        { status: 400 }
      );
    }

    // Initialiser le service
    const emailClient = createEmailClientFromEnv(process.env);
    const emailService = createEmailService(emailClient);

    // Envoyer l'email
    const result = await emailService.sendTemplatedEmail({
      tenantId: 'test', // TODO: Get from session
      to,
      customSubject: subject || 'Message de Coccinelle.AI',
      customHtml: message ? `<p style="font-family: Arial, sans-serif;">${message.replace(/\n/g, '<br>')}</p>` : undefined,
      templateId,
      data,
    });

    return NextResponse.json({
      success: true,
      channel: 'email',
      messageId: result.id,
      status: result.status,
      to: result.to,
      subject: result.subject,
    });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send email',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
