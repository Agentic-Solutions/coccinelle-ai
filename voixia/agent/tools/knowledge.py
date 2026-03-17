"""
VoixIA - Tool Base de connaissances
Recherche semantique dans la base de connaissances du tenant via l'API Coccinelle.
"""

from __future__ import annotations

import logging
from typing import Annotated

from livekit.agents import llm
import httpx

logger = logging.getLogger("voixia.tools.knowledge")


class KnowledgeTools(llm.FunctionContext):
    """Tool pour la recherche dans la base de connaissances Coccinelle."""

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
            timeout=15.0,  # Plus long car la recherche semantique peut etre lente
        )

    @llm.ai_callable(
        description=(
            "Rechercher dans la base de connaissances de l'entreprise. "
            "Utilise cet outil pour trouver des informations sur l'entreprise, "
            "ses services, ses procedures, sa politique, ses horaires, "
            "ou toute autre question a laquelle tu ne connais pas la reponse."
        )
    )
    async def search_knowledge(
        self,
        query: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Question ou termes de recherche pour trouver "
                    "l'information dans la base de connaissances"
                )
            ),
        ],
    ) -> str:
        """Interroge la base de connaissances Coccinelle via recherche semantique."""
        try:
            response = await self._client.post(
                "/api/v1/knowledge/search",
                json={
                    "query": query,
                    "topK": 5,
                    "provider": "workersai",
                },
            )
            response.raise_for_status()
            data = response.json()

            results = data.get("data", {}).get(
                "results", data.get("results", [])
            )

            if not results:
                return (
                    f'Je n\'ai pas trouve d\'information pertinente pour "{query}" '
                    "dans notre base de connaissances. "
                    "Souhaitez-vous que je vous mette en relation avec un conseiller ?"
                )

            # Combiner les contenus les plus pertinents
            knowledge_parts: list[str] = []
            sources: set[str] = set()

            for result in results[:3]:
                content = result.get("content", "").strip()
                title = result.get("title", "")
                score = result.get("score", 0)

                if content and score > 0.3:
                    # Tronquer le contenu pour le contexte vocal
                    if len(content) > 500:
                        content = content[:497] + "..."
                    knowledge_parts.append(content)
                    if title:
                        sources.add(title)

            if not knowledge_parts:
                return (
                    "Les resultats trouves ne semblent pas assez pertinents "
                    f'pour repondre a votre question sur "{query}". '
                    "Puis-je vous aider autrement ?"
                )

            # Retourner le contenu brut pour que le LLM formule une reponse naturelle
            combined = "\n\n".join(knowledge_parts)

            preamble = (
                "Voici les informations trouvees dans notre base de connaissances. "
                "Utilise ces informations pour repondre au client de maniere naturelle :\n\n"
            )

            source_note = ""
            if sources:
                source_note = f"\n\n(Sources : {', '.join(sources)})"

            return preamble + combined + source_note

        except httpx.HTTPStatusError as exc:
            logger.error("search_knowledge HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu consulter notre base de connaissances. "
                "Puis-je repondre autrement a votre question ?"
            )
        except Exception as exc:
            logger.error("search_knowledge error: %s", exc)
            return (
                "Une erreur technique m'empeche de rechercher cette information. "
                "Souhaitez-vous que je vous transfere a un conseiller ?"
            )
