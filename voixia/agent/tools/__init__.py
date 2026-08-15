"""
Outils d integration avec l API Coccinelle via les endpoints VoixIA.

Ce package regroupe tous les modules d interaction avec l API :
- appointments : gestion des rendez-vous
- messaging : envoi de SMS et e-mails
- crm : gestion des prospects
- products : recherche de produits
- knowledge : recherche dans la base de connaissances
- transfer : transfert vers un conseiller humain

Authentification par cle API (X-VoixIA-Key + X-VoixIA-Tenant).
"""

from .appointments import book_appointment, check_availability
from .products import search_products
from .knowledge import search_knowledge
from .messaging import send_sms  # send_email retire le 15/08/2026
from .crm import create_prospect
from .transfer import transfer_to_human

# Re-export des modules pour un acces direct
from . import appointments, messaging, crm, products, knowledge, transfer

__all__ = [
    "book_appointment",
    "check_availability",
    "search_products",
    "search_knowledge",
    "send_sms",
    "create_prospect",
    "transfer_to_human",
]
