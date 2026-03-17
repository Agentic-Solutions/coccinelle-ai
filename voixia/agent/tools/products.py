"""
VoixIA - Tool Catalogue Produits
Recherche dans le catalogue de produits et services via l'API Coccinelle.
"""

from __future__ import annotations

import logging
from typing import Annotated

from livekit.agents import llm
import httpx

logger = logging.getLogger("voixia.tools.products")


class ProductTools(llm.FunctionContext):
    """Tool pour la recherche dans le catalogue produits Coccinelle."""

    def __init__(self, api_base: str, api_token: str) -> None:
        super().__init__()
        self._api_base = api_base.rstrip("/")
        self._api_token = api_token
        self._client = httpx.AsyncClient(
            base_url=self._api_base,
            headers={
                "Authorization": f"Bearer {self._api_token}",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    @llm.ai_callable(
        description=(
            "Rechercher dans le catalogue de produits ou services. "
            "Utilise cet outil quand le client pose une question sur "
            "les produits, services, tarifs ou disponibilites du catalogue."
        )
    )
    async def search_products(
        self,
        query: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Termes de recherche : nom du produit, service, "
                    "categorie ou mots-cles"
                )
            ),
        ],
        category: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Categorie de produit pour affiner la recherche "
                    "(ex: immobilier, service, bien, etc.)"
                )
            ),
        ] = "",
    ) -> str:
        """Interroge l'API produits Coccinelle et retourne les resultats formates."""
        try:
            params: dict = {"status": "active", "limit": "10"}
            if category:
                params["category"] = category

            response = await self._client.get(
                "/api/v1/products",
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            products = data.get("data", {}).get(
                "products", data.get("products", [])
            )

            if not products:
                return (
                    "Je n'ai pas trouve de produits ou services correspondant "
                    f'a votre recherche pour "{query}". '
                    "Pourriez-vous preciser votre demande ?"
                )

            # Filtrer cote client si un terme de recherche est fourni
            if query:
                query_lower = query.lower()
                filtered = [
                    p
                    for p in products
                    if query_lower in (p.get("title", "") or "").lower()
                    or query_lower in (p.get("description", "") or "").lower()
                    or query_lower
                    in (p.get("short_description", "") or "").lower()
                    or query_lower in (p.get("category", "") or "").lower()
                    or query_lower in (p.get("keywords", "") or "").lower()
                ]
                if filtered:
                    products = filtered

            # Formater les resultats pour la lecture vocale (max 5)
            results: list[str] = []
            for p in products[:5]:
                title = p.get("title", "Sans titre")
                price = p.get("price")
                currency = p.get("price_currency", "EUR")
                desc = (
                    p.get("short_description") or p.get("description") or ""
                )

                # Tronquer la description pour le vocal
                if len(desc) > 120:
                    desc = desc[:117] + "..."

                line = f"- {title}"
                if price is not None:
                    line += f" : {_format_price(price, currency)}"
                if desc:
                    line += f". {desc}"

                results.append(line)

            total = data.get("data", {}).get(
                "total", data.get("total", len(products))
            )
            header = f"J'ai trouve {total} resultat{'s' if total > 1 else ''}."
            if total > 5:
                header += " Voici les 5 premiers :"

            return header + "\n" + "\n".join(results)

        except httpx.HTTPStatusError as exc:
            logger.error("search_products HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu consulter le catalogue pour le moment. "
                "Souhaitez-vous que je prenne note de votre demande ?"
            )
        except Exception as exc:
            logger.error("search_products error: %s", exc)
            return (
                "Une erreur technique m'empeche d'acceder au catalogue. "
                "Un conseiller pourra vous renseigner."
            )


def _format_price(price: float | int | str, currency: str = "EUR") -> str:
    """Formate un prix pour la lecture vocale en francais."""
    try:
        amount = float(price)
        if amount == int(amount):
            formatted = f"{int(amount):,}".replace(",", " ")
        else:
            formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",")

        symbol = {"EUR": "euros", "USD": "dollars", "GBP": "livres"}.get(
            currency, currency
        )
        return f"{formatted} {symbol}"
    except (ValueError, TypeError):
        return str(price)
