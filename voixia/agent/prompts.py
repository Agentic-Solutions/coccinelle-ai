"""
Systeme de prompts pour l'assistant vocal VoixIA.

Ce module centralise tous les prompts systeme et messages d'accueil.
Le prompt actif est selectionne via la variable PROMPT_TYPE dans le .env.

Types disponibles :
- generaliste : assistant vocal polyvalent en francais
- immobilier  : specialise Coccinelle.ai (CRM, visites, produits)
- rdv         : focalise sur la prise de rendez-vous
- sav         : service apres-vente et reclamations
"""

import logging
import re
import unicodedata

logger = logging.getLogger("voixia.prompts")

# =============================================================================
# Prompts systeme — un par cas d'usage
# =============================================================================

# ---------------------------------------------------------------------------
# Generaliste — Assistant vocal polyvalent en francais
# ---------------------------------------------------------------------------
prompt_generaliste: str = (
    "Tu es un assistant vocal intelligent qui repond en francais.\n\n"
    "Regles de comportement :\n"
    "1. Reponds toujours en francais, de maniere naturelle et chaleureuse.\n"
    "2. Sois concis : 2 a 3 phrases maximum par reponse (lecture a voix haute).\n"
    "3. Adapte ton ton au contexte : professionnel mais accessible.\n"
    "4. Si tu ne connais pas la reponse, dis-le honnêtement.\n"
    "5. Propose de l'aide proactivement quand c'est pertinent.\n"
    "6. Utilise les outils disponibles quand c'est necessaire.\n"
)

# ---------------------------------------------------------------------------
# Immobilier — Specialise Coccinelle.ai (CRM, visites, produits)
# ---------------------------------------------------------------------------
prompt_immobilier: str = (
    "Tu es l'assistant vocal intelligent de Coccinelle.ai, specialise dans "
    "l'immobilier et la gestion de la relation client (CRM).\n\n"
    "Regles de comportement :\n"
    "1. Accueille chaleureusement l'appelant en francais.\n"
    "2. Identifie rapidement le besoin de l'appelant.\n"
    "3. Identifie rapidement le besoin : prise de rendez-vous, "
    "renseignement sur un bien, estimation, ou reclamation.\n"
    "4. Si l'appelant cherche un bien, utilise l'outil de recherche produits "
    "pour lui proposer des biens correspondants.\n"
    "5. Propose un creneau de rendez-vous pour une visite si pertinent.\n"
    "6. Propose une confirmation par SMS ou e-mail.\n"
    "7. Cree un prospect dans le CRM si c'est un nouveau contact.\n"
    "8. Adopte un ton professionnel, naturel et concis.\n"
    "9. Tes reponses doivent etre courtes (2 a 3 phrases) car elles "
    "sont destinees a etre lues a voix haute.\n"
    "10. Utilise les outils disponibles (CRM, rendez-vous, SMS, produits, "
    "base de connaissances) quand c'est necessaire.\n"
)

# ---------------------------------------------------------------------------
# RDV — Focalise sur la prise de rendez-vous
# ---------------------------------------------------------------------------
prompt_rdv: str = (
    "Tu es un assistant vocal specialise dans la prise de rendez-vous. "
    "Tu travailles pour l'entreprise de l'appelant.\n\n"
    "Regles de comportement :\n"
    "1. Ton objectif principal est de fixer un rendez-vous.\n"
    "2. Demande le nom, le service souhaite et la date preferee.\n"
    "3. Verifie la disponibilite avec l'outil check_availability.\n"
    "4. Propose les creneaux disponibles les plus proches.\n"
    "5. Confirme le rendez-vous avec l'outil book_appointment.\n"
    "6. Propose une confirmation par SMS.\n"
    "7. Sois direct et efficace : ne t'egare pas dans des sujets annexes.\n"
    "8. Tes reponses doivent etre courtes (2 a 3 phrases).\n"
)

# ---------------------------------------------------------------------------
# SAV — Service apres-vente et reclamations
# ---------------------------------------------------------------------------
prompt_sav: str = (
    "Tu es un assistant vocal specialise dans le service apres-vente. "
    "Tu geres les reclamations et les demandes de suivi.\n\n"
    "Regles de comportement :\n"
    "1. Accueille l'appelant avec empathie et professionnalisme.\n"
    "2. Ecoute attentivement le probleme decrit par l'appelant.\n"
    "3. Pose des questions precises pour comprendre la situation.\n"
    "4. Recherche dans la base de connaissances des solutions connues.\n"
    "5. Si le probleme ne peut pas etre resolu immediatement, "
    "propose de creer un ticket ou de rappeler le client.\n"
    "6. Note les informations du client dans le CRM (prospect).\n"
    "7. Reste calme et rassurant, meme face a un client mecontent.\n"
    "8. Tes reponses doivent etre courtes (2 a 3 phrases).\n"
)


# =============================================================================
# Instructions d'accueil par defaut (sans tenant)
#
# Ces textes sont passes en tant qu'INSTRUCTIONS au LLM via
# session.generate_reply(instructions=...). Ils doivent etre rediges
# a l'imperatif pour indiquer au LLM QUOI DIRE, pas du texte a lire.
# =============================================================================

GREETINGS: dict[str, str] = {
    "generaliste": "Bonjour ! Comment puis-je vous aider ?",
    "immobilier": "Bonjour ! Comment puis-je vous aider pour votre projet immobilier ?",
    "rdv": "Bonjour ! Comment puis-je vous aider ?",
    "sav": "Bonjour ! Comment puis-je vous aider ?",
    "automobile": "Bonjour ! Comment puis-je vous aider ?",
    "sante": "Bonjour ! Comment puis-je vous aider ?",
    "restaurant": "Bonjour ! Comment puis-je vous aider ?",
    "beaute": "Bonjour ! Comment puis-je vous aider ?",
    "fitness": "Bonjour ! Comment puis-je vous aider ?",
    "education": "Bonjour ! Comment puis-je vous aider ?",
    "ecommerce": "Bonjour ! Comment puis-je vous aider ?",
    "artisan": "Bonjour ! Comment puis-je vous aider ?",
    "juridique": "Bonjour ! Comment puis-je vous aider ?",
    "autre": "Bonjour ! Comment puis-je vous aider ?",
}

# Description du secteur par prompt_type, utilisee dans le greeting dynamique
SECTOR_HINTS: dict[str, str] = {
    "generaliste": "",
    "immobilier": " pour son projet immobilier",
    "rdv": " et pour quel service il souhaite prendre rendez-vous",
    "sav": " concernant son probleme ou sa reclamation",
    "automobile": " pour son projet automobile",
    "sante": " pour sa demande de sante",
    "restaurant": " pour sa reservation ou sa demande",
}


# =============================================================================
# Dictionnaire des prompts — acces par cle
# =============================================================================

PROMPTS: dict[str, str] = {
    "generaliste": prompt_generaliste,
    "immobilier": prompt_immobilier,
    "rdv": prompt_rdv,
    "sav": prompt_sav,
}


def get_prompt(prompt_type: str) -> str:
    """
    Retourne le prompt systeme correspondant au type demande.

    Args:
        prompt_type: type de prompt ("generaliste", "immobilier", "rdv", "sav").

    Returns:
        Le prompt systeme sous forme de chaine de caracteres.

    Raises:
        ValueError: si le type de prompt n'est pas reconnu.
    """
    if prompt_type not in PROMPTS:
        logger.warning(
            "Type de prompt inconnu : '%s' — fallback sur 'generaliste'",
            prompt_type,
        )
        return PROMPTS["generaliste"]
    return PROMPTS[prompt_type]


# =============================================================================
# Formatage du nom d'entreprise pour le greeting (prefixe metier par secteur)
# =============================================================================

# Prefixe d'etablissement par secteur (13 secteurs de lib/prompts.ts).
# "" = pas de prefixe metier -> fallback neutre « l'entreprise ... ».
SECTOR_ESTABLISHMENT: dict[str, str] = {
    "immobilier":  "Agence",
    "sante":       "Cabinet médical",
    "dentiste":    "Cabinet dentaire",
    "restaurant":  "Restaurant",
    "automobile":  "Garage",
    "beaute":      "Salon",
    "fitness":     "Salle de sport",
    "ecommerce":   "Boutique",
    "juridique":   "Cabinet",            # avocat/conseil ; notaire (Etude) indistinguable du secteur
    "education":   "Centre de formation",
    "artisan":     "",                   # neutre (« Entreprise Dupont » sonne mal)
    "generaliste": "",
    "autre":       "",
}

# Si le nom contient deja un mot d'etablissement, on ne prefixe pas
# (eviter « Garage Garage Dupont »). Match par mot entier, sans accents.
_ESTABLISHMENT_WORDS: set[str] = {
    "garage", "cabinet", "etude", "agence", "salon", "restaurant", "resto",
    "boutique", "entreprise", "societe", "centre", "ecole", "clinique",
    "salle", "club", "atelier", "institut", "pharmacie", "hotel", "studio",
    "brasserie", "maison", "sarl", "sas", "eurl", "notaire", "notarial", "office",
}


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def format_company_for_greeting(company_name: str, sector: str | None) -> str:
    """
    Formate le nom pour le greeting vocal : prefixe metier selon le secteur,
    sauf si le nom contient deja un type d'etablissement. Fallback neutre.

    Ex. (automobile, "AMROUCHE")      -> "Garage AMROUCHE"
        (automobile, "Garage Dupont") -> "Garage Dupont" (inchange)
        (generaliste, "AMROUCHE")     -> "l'entreprise AMROUCHE"
    """
    name = (company_name or "").strip()
    if not name:
        return name

    words = set(re.findall(r"[a-z]+", _strip_accents(name).lower()))
    if words & _ESTABLISHMENT_WORDS:
        return name  # deja un type d'etablissement -> pas de double prefixe

    prefix = SECTOR_ESTABLISHMENT.get(sector or "", "")
    if prefix:
        return f"{prefix} {name}"
    # Tête de phrase (« … , bonjour ! ») -> capitale, sans article.
    return f"Entreprise {name}"


def get_greeting(
    prompt_type: str,
    company_name: str | None = None,
    assistant_name: str | None = None,
) -> str:
    """
    Retourne l'instruction d'accueil dynamique.

    Le greeting est une COURTE phrase d'accueil. Il ne doit PAS demander
    a l'agent de se presenter (le system_prompt gere la personnalite).
    Cela evite la double presentation (greeting + system_prompt).

    Args:
        prompt_type: type de prompt ("generaliste", "immobilier", etc.).
        company_name: nom de l'entreprise resolu via le tenant (optionnel).
        assistant_name: prenom de l'assistant extrait du system_prompt (optionnel).

    Returns:
        L'instruction d'accueil sous forme de chaine de caracteres.
    """
    if not company_name:
        return GREETINGS.get(prompt_type, GREETINGS["generaliste"])

    company_display = format_company_for_greeting(company_name, prompt_type)
    return f"{company_display}, bonjour ! Comment puis-je vous aider ?"
