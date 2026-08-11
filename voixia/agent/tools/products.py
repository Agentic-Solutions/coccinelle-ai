"""
Outil de recherche de produits via l'API VoixIA Coccinelle.

Ce module fournit la fonction ``search_products`` pour rechercher
des produits dans le catalogue via GET /api/v1/voixia/products.

Authentification par cle API (X-VoixIA-Key + X-VoixIA-Tenant).
"""

import logging
import os

import httpx

from .context import get_api_key, get_tenant_id

logger = logging.getLogger(__name__)

# Timeout par defaut pour les requetes HTTP (en secondes)
_TIMEOUT_SECONDES = 10

# URL de base de l'API VoixIA Coccinelle
_BASE_URL = "https://coccinelle-api.youssef-amrouche.workers.dev"


def _get_client() -> httpx.AsyncClient:
    """
    Retourne un client HTTP configure pour l'API VoixIA Coccinelle.

    Le client est pre-configure avec :
    - L'URL de base (COCCINELLE_API_BASE ou valeur par defaut)
    - Les headers d'authentification VoixIA (X-VoixIA-Key + X-VoixIA-Tenant)
    - Un timeout de 10 secondes
    """
    base_url = os.environ.get("COCCINELLE_API_BASE", _BASE_URL)
    # Tenant de l'appel en cours, pas celui du .env : sans cela, l'agent
    # cite le catalogue d'une autre entreprise.
    api_key = get_api_key()
    tenant_id = get_tenant_id()

    return httpx.AsyncClient(
        base_url=base_url,
        headers={
            "X-VoixIA-Key": api_key,
            "X-VoixIA-Tenant": tenant_id,
        },
        timeout=_TIMEOUT_SECONDES,
    )


async def search_products(query: str) -> str:
    """
    Recherche des produits dans le catalogue via GET /api/v1/voixia/products.

    Instrumente avec New Relic pour le suivi des performances.

    Args:
        query: Termes de recherche saisis par l'utilisateur.

    Returns:
        Resultats de recherche formates en francais ou message d'erreur.
    """
    # Instrumentation New Relic (import lazy)
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "search_products")
        newrelic.agent.add_custom_parameter("query", query)
    except Exception:
        pass

    logger.info("Recherche de produits avec la requete : \u00ab %s \u00bb", query)
    try:
        async with _get_client() as client:
            reponse = await client.get(
                "/api/v1/voixia/products",
                params={"search": query},
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info(
                "Produits trouves : %d resultat(s)",
                len(donnees.get("products", [])),
            )

            produits = donnees.get("products", [])
            if not produits:
                return f"Aucun produit trouve pour la recherche \u00ab {query} \u00bb."

            lignes = []
            for produit in produits:
                nom = produit.get("title", produit.get("name", "Sans nom"))
                prix = produit.get("price", "N/A")
                description = produit.get("short_description", produit.get("description", ""))
                ligne = f"  - {nom} — {prix} \u20ac"
                if description:
                    ligne += f" : {description}"
                lignes.append(ligne)

            return (
                f"Resultats pour \u00ab {query} \u00bb ({len(produits)} produit(s)) :\n"
                + "\n".join(lignes)
            )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Erreur HTTP lors de la recherche de produits : %s", exc.response.text
        )
        return (
            f"Erreur lors de la recherche de produits : "
            f"{exc.response.status_code} — {exc.response.text}"
        )
    except httpx.TimeoutException:
        logger.error("Timeout lors de la recherche de produits")
        return "Erreur : le serveur n'a pas repondu a temps pour la recherche de produits."
    except Exception as exc:
        logger.exception("Erreur inattendue lors de la recherche de produits")
        return f"Erreur inattendue lors de la recherche de produits : {exc}"
