export const runtime = 'edge';

/**
 * Webhook Salesforce pour recevoir les changements
 * Utilise Salesforce Outbound Messages ou Platform Events
 *
 * Configuration Salesforce:
 * URL: https://votre-domaine.com/api/crm/webhooks/salesforce
 * Type: Outbound Message ou Platform Event
 */

import { NextRequest, NextResponse } from 'next/server';
// import { getCRMSyncService } from '@/services/crm/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    console.log('📥 [Salesforce Webhook] Event received');

    // Salesforce envoie du SOAP XML pour Outbound Messages
    // On peut aussi utiliser REST API avec Platform Events (JSON)

    // Parser SOAP si c'est un Outbound Message
    const isSoap = body.includes('soapenv:Envelope');

    if (isSoap) {
      // TODO: Parser le XML SOAP pour extraire les données Contact
      console.log('📄 [Salesforce] SOAP Outbound Message received');

      // Format SOAP typique:
      // <soapenv:Envelope>
      //   <soapenv:Body>
      //     <notifications>
      //       <Notification>
      //         <sObject>
      //           <sf:Id>0035...</sf:Id>
      //           <sf:FirstName>John</sf:FirstName>
      //           <sf:LastName>Doe</sf:LastName>
      //           <sf:Email>john@example.com</sf:Email>
      //         </sObject>
      //       </Notification>
      //     </notifications>
      //   </soapenv:Body>
      // </soapenv:Envelope>

      // TODO: Extraire l'ID du contact et synchroniser
      // const contactId = extractContactId(body);
      // await syncService.syncFromExternal(contactId, 'salesforce');

      // Salesforce attend une réponse SOAP
      const soapResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <notificationsResponse xmlns="http://soap.sforce.com/2005/09/outbound">
      <Ack>true</Ack>
    </notificationsResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

      return new NextResponse(soapResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    } else {
      // Platform Events (JSON)
      const event = JSON.parse(body);
      console.log('📊 [Salesforce] Platform Event received:', event);

      // TODO: Traiter l'événement
      // const { contactId, eventType } = event;

      return NextResponse.json({ success: true, message: 'Event processed' });
    }
  } catch (error: any) {
    console.error('❌ [Salesforce Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Salesforce CRM Webhook',
    version: '1.0.0',
  });
}
