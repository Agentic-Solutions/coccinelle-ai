"""
Outil de transfert vers un conseiller humain via l API VoixIA Coccinelle.

Logique :
1. Si transfer_enabled=1 et transfer_number → transferer l appel
2. Si transfer_enabled=0 → proposer un rappel (callback)
   - L agent collecte nom + numero + creneau
   - Puis appelle create_prospect + send_sms

Authentification par cle API (X-VoixIA-Key + X-VoixIA-Tenant).
"""

import logging
import os

import httpx

from .context import get_api_key, get_tenant_id

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDES = 10
_BASE_URL = "https://coccinelle-api.youssef-amrouche.workers.dev"


def _get_client() -> httpx.AsyncClient:
    base_url = os.environ.get("COCCINELLE_API_BASE", _BASE_URL)
    api_key = get_api_key()
    # Tenant de l\'APPEL en cours (contexte), plus la valeur figee du .env :
    # celle-ci faisait lire la KB d\'un autre client a chaque appel.
    tenant_id = get_tenant_id()

    return httpx.AsyncClient(
        base_url=base_url,
        headers={
            "X-VoixIA-Key": api_key,
            "X-VoixIA-Tenant": tenant_id,
        },
        timeout=_TIMEOUT_SECONDES,
    )


async def transfer_to_human(reason: str) -> str:
    """
    Demande le transfert vers un conseiller humain via POST /api/v1/voixia/transfer.
    Si le transfert direct n est pas disponible, guide l agent pour proposer un rappel.

    Args:
        reason: Raison du transfert demande par le client.

    Returns:
        Instructions pour l agent vocal.
    """
    logger.info("Transfert vers un humain demande : %s", reason)
    try:
        async with _get_client() as client:
            reponse = await client.post(
                "/api/v1/voixia/transfer",
                json={"reason": reason},
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            data = donnees.get("data", donnees)
            logger.info("Transfert reponse : %s", data)

            # Verifier si le transfert est possible
            if data.get("transfer_possible", False):
                return "Je vous transfere vers un conseiller. Veuillez patienter un instant."
            else:
                # Transfert impossible — proposer un rappel
                return (
                    "Le transfert direct n est pas disponible actuellement. "
                    "Propose un rappel au client : dis-lui que tu peux organiser un rappel "
                    "par un conseiller. Demande-lui quel est le meilleur moment pour le rappeler, "
                    "puis son nom et son numero de telephone. "
                    "Ensuite utilise create_prospect avec status callback_requested "
                    "et les notes contenant le creneau souhaite. "
                    "Puis envoie un SMS de confirmation avec send_sms."
                )
    except httpx.HTTPStatusError as exc:
        logger.error("Erreur HTTP transfert : %s", exc.response.text)
        return (
            "Le transfert n est pas disponible. Propose un rappel : "
            "demande au client son nom, numero et creneau prefere pour etre rappele. "
            "Utilise create_prospect avec status callback_requested puis send_sms pour confirmer."
        )
    except Exception as exc:
        logger.exception("Erreur inattendue lors du transfert")
        return (
            "Le transfert n est pas disponible. Propose un rappel : "
            "demande au client son nom, numero et creneau prefere pour etre rappele."
        )
