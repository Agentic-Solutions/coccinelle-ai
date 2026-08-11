"""Tool VoixIA — create_task
Cree une tache et l affecte au bon membre de l equipe.
A utiliser UNIQUEMENT si :
- La KB ne peut pas repondre a la demande
- OU le client est insatisfait de la reponse KB
- OU c est une urgence physique (sinistre, fuite, panne)
- OU le client demande explicitement un humain
"""
import os
import logging
import httpx

logger = logging.getLogger('voixia.tools.tasks')

API_URL = os.getenv('COCCINELLE_API_URL',
    'https://coccinelle-api.youssef-amrouche.workers.dev')
VOIXIA_API_KEY = os.getenv('VOIXIA_API_KEY', '')


async def call_create_task(
    tenant_id: str,
    description: str,
    keywords: str,
    contact_name: str = '',
    contact_phone: str = '',
    secteur: str = '',
    kb_response: str = '',
    kb_satisfied: bool = False,
) -> str:
    """Appelle POST /api/v1/voixia/create-task"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f'{API_URL}/api/v1/voixia/create-task',
                headers={
                    'X-VoixIA-Key': VOIXIA_API_KEY,
                    'X-VoixIA-Tenant': tenant_id,
                    'Content-Type': 'application/json',
                },
                json={
                    'contact_name': contact_name,
                    'contact_phone': contact_phone,
                    'task_type_keywords': keywords,
                    'description': description,
                    'secteur': secteur,
                    'kb_response': kb_response,
                    'kb_satisfied': kb_satisfied,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                assignee = data.get('assignee_name', 'un conseiller')
                logger.info('Task created: %s -> %s', data.get('task_id'), assignee)
                return (
                    f'Votre demande a bien ete transmise '
                    f'a {assignee} qui prendra contact '
                    f'avec vous rapidement.'
                )
            logger.warning('create-task HTTP %d: %s', resp.status_code, resp.text[:200])
    except Exception as e:
        logger.error('create-task error: %s', e)
    return (
        'Votre demande a ete enregistree. '
        'Un conseiller vous recontactera.'
    )
