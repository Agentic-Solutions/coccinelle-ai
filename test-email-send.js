// Test envoi email depuis sara@coccinelle.ai
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_XXXXXXXX'; // Remplace si nécessaire

async function testEmail() {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Sara <sara@coccinelle.ai>',
      to: 'y.amrouche1301@gmail.com',
      subject: '🐞 Test Coccinelle.ai - Email fonctionne !',
      html: '<h1>Bonjour !</h1><p>Ceci est un test d\'envoi depuis <strong>sara@coccinelle.ai</strong>.</p><p>Si vous recevez cet email, le canal email est 100% opérationnel ! 🎉</p>'
    })
  });
  
  const data = await response.json();
  console.log('Résultat:', data);
}

testEmail();
