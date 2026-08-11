"""
Contexte d'appel — tenant resolu, partage par tous les outils.

POURQUOI CE MODULE (08/08/2026) :
`_get_client()` de knowledge.py, messaging.py et transfer.py lisait
`VOIXIA_TENANT_ID` dans /opt/voixia/.env — une valeur STATIQUE, la meme pour
tout le serveur. Le tenant resolu par resolve-phone n'etait jamais transmis :
tous les appels, tous clients confondus, interrogeaient la base de connaissances
du tenant inscrit dans le .env (« Agentic solutions »).

Constate en production : un appel resolu sur le tenant « testq » a recu un
extrait de la KB d'« Agentic solutions », sans rapport avec la question ; l'agent
a alors invente un tarif (69 euros pour une recharge de climatisation, alors que
la vraie fiche dit 79 / 129 euros). Fuite inter-tenant ET reponses fausses.

Le tenant est stocke dans un `ContextVar` : chaque job LiveKit tourne dans son
propre processus et sa propre tache asyncio, la valeur ne fuit donc pas d'un
appel a l'autre. Le .env reste un secours au demarrage (tests manuels, scripts).
"""

from __future__ import annotations

import logging
import os
from contextvars import ContextVar

logger = logging.getLogger("voixia.tools.context")

_tenant_id: ContextVar[str] = ContextVar("voixia_tenant_id", default="")
_api_key: ContextVar[str] = ContextVar("voixia_api_key", default="")


def set_call_context(tenant_id: str | None, api_key: str | None = None) -> None:
    """
    Fixe le tenant de l'appel en cours. Appele UNE fois par appel, juste apres
    resolve_tenant, avant la construction de la session.
    """
    if tenant_id:
        _tenant_id.set(tenant_id)
        logger.info("Contexte d'appel — tenant : %s", tenant_id)
    else:
        # On ne vide pas : mieux vaut le secours .env qu'un en-tete vide qui
        # ferait echouer tous les outils avec un 401 en plein appel.
        logger.warning("Contexte d'appel sans tenant_id — repli sur VOIXIA_TENANT_ID (.env)")
    if api_key:
        _api_key.set(api_key)


def get_tenant_id() -> str:
    """Tenant de l'appel en cours, sinon celui du .env (secours)."""
    return _tenant_id.get() or os.environ.get("VOIXIA_TENANT_ID", "")


def get_api_key() -> str:
    """Cle API VoixIA de l'appel en cours, sinon celle du .env."""
    return _api_key.get() or os.environ.get("VOIXIA_API_KEY", "")


def reset_call_context() -> None:
    """Remise a zero explicite — utile en tests."""
    _tenant_id.set("")
    _api_key.set("")
