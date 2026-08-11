"""
Configuration centrale du pipeline vocal VoixIA.

Ce module definit :
- La configuration des fournisseurs LLM (Mistral, Claude)
- Le type de prompt actif (generaliste, immobilier, rdv, sav)
- Les utilitaires pour acceder aux configurations
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMConfig:
    """Configuration d'un fournisseur LLM."""

    provider: str
    model_name: str
    base_url: Optional[str]
    api_key: str
    display_name: str
    max_tokens: int = 1000
    temperature: float = 0.1


# =============================================================================
# Fournisseurs LLM supportes
# =============================================================================

LLM_PROVIDERS: dict[str, dict] = {
    "mistral": {
        "model_name": "mistral-large-latest",
        "base_url": "https://api.mistral.ai/v1",
        "display_name": "Mistral Large",
        "api_key_env": "MISTRAL_API_KEY",
    },
    "claude": {
        "model_name": "claude-sonnet-4-20250514",
        "base_url": "https://api.anthropic.com/v1",
        "display_name": "Claude Sonnet 4",
        "api_key_env": "ANTHROPIC_API_KEY",
    },
}


# =============================================================================
# Type de prompt actif — configurable via .env (PROMPT_TYPE)
# =============================================================================
# Valeurs possibles : generaliste, immobilier, rdv, sav
PROMPT_TYPE: str = os.environ.get("PROMPT_TYPE", "generaliste").strip().lower()


def get_llm_config(provider: str) -> LLMConfig:
    """
    Retourne la configuration LLM pour le fournisseur demande.

    Args:
        provider: identifiant du fournisseur ("mistral", "claude").

    Returns:
        Instance de LLMConfig avec tous les parametres necessaires.

    Raises:
        ValueError: si le fournisseur n'est pas reconnu.
    """
    if provider not in LLM_PROVIDERS:
        fournisseurs_valides = ", ".join(LLM_PROVIDERS.keys())
        raise ValueError(
            f"Fournisseur LLM inconnu : '{provider}'. "
            f"Fournisseurs supportes : {fournisseurs_valides}"
        )

    cfg = LLM_PROVIDERS[provider]
    api_key = os.environ.get(cfg["api_key_env"], "")

    return LLMConfig(
        provider=provider,
        model_name=cfg["model_name"],
        base_url=cfg.get("base_url"),
        api_key=api_key,
        display_name=cfg["display_name"],
    )
