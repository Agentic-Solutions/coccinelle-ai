"""
Factory pour l'instanciation du client LLM.

Supporte deux modes :
1. Dynamique : provider + model passes en parametre (depuis resolve_tenant)
2. Statique  : lecture de LLM_PROVIDER depuis l'environnement (fallback)
"""

import logging
import os

from livekit.plugins import openai as lk_openai

from config import LLM_PROVIDERS, get_llm_config

logger = logging.getLogger("voixia.llm_factory")


def get_llm_client(
    provider: str | None = None,
    model: str | None = None,
) -> lk_openai.LLM:
    """
    Cree et retourne le client LLM.

    Args:
        provider: fournisseur LLM (ex: "mistral", "openai"). Si None, lit LLM_PROVIDER.
        model: modele specifique (ex: "mistral-large-latest"). Si None, utilise le defaut.

    Returns:
        Instance de lk_openai.LLM prete a l'emploi.
    """
    # Priorite 1 : provider passe en parametre
    # Priorite 2 : variable d'environnement LLM_PROVIDER
    resolved_provider = (provider or os.environ.get("LLM_PROVIDER", "")).strip().lower()

    if not resolved_provider:
        raise ValueError(
            "LLM_PROVIDER non defini. Valeurs acceptees : "
            + ", ".join(LLM_PROVIDERS.keys())
        )

    # Recuperer la config du fournisseur
    llm_config = get_llm_config(resolved_provider)

    # Si un modele specifique est fourni, on l'utilise — sinon celui de la config
    resolved_model = model or llm_config.model_name

    client = lk_openai.LLM(
        model=resolved_model,
        base_url=llm_config.base_url,
        api_key=llm_config.api_key,
        temperature=llm_config.temperature,
    )

    logger.info(
        "LLM actif : %s | modele : %s",
        llm_config.display_name, resolved_model,
    )

    return client
