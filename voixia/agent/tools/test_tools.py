#!/usr/bin/env python3
"""
Tests des tool calls VoixIA — Script standalone.

Ce script teste chaque outil independamment en verifiant :
1. Les variables d'environnement (VOIXIA_API_KEY, VOIXIA_TENANT_ID)
2. La connexion a l'API VoixIA Coccinelle
3. Chaque fonction tool (appointments, messaging, crm, products, knowledge)

Usage :
    cd agent/
    python -m tools.test_tools

Prerequis :
    - Variables d'environnement definies dans .env :
      VOIXIA_API_KEY, VOIXIA_TENANT_ID, COCCINELLE_API_BASE
    - Dependances installees : httpx, python-dotenv
"""

import asyncio
import os
import sys
from pathlib import Path

# --- Charger le .env depuis la racine du projet ---
_env_path = Path(__file__).parent.parent.parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=_env_path, override=True)
    print(f"[OK] Fichier .env charge depuis : {_env_path}")
else:
    print(f"[ATTENTION] Fichier .env introuvable : {_env_path}")

# Ajouter le dossier agent/ au path pour les imports
_agent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(_agent_dir))


# --- Compteurs de resultats ---
_total = 0
_succes = 0
_echecs = 0


def _afficher_resultat(nom_test: str, succes: bool, message: str) -> None:
    """Affiche le resultat d'un test avec un indicateur visuel."""
    global _total, _succes, _echecs
    _total += 1
    if succes:
        _succes += 1
        print(f"  [OK] {nom_test} : {message}")
    else:
        _echecs += 1
        print(f"  [ECHEC] {nom_test} : {message}")


def test_variables_env() -> bool:
    """Verifie que les variables d'environnement necessaires sont definies."""
    print("\n=== Test 1 : Variables d'environnement ===")

    api_key = os.getenv("VOIXIA_API_KEY")
    tenant_id = os.getenv("VOIXIA_TENANT_ID")
    api_base = os.getenv("COCCINELLE_API_BASE")

    ok = True

    if api_key and api_key != "COLLE_TA_CLE_ICI":
        _afficher_resultat(
            "VOIXIA_API_KEY",
            True,
            f"definie ({len(api_key)} caracteres)",
        )
    else:
        _afficher_resultat("VOIXIA_API_KEY", False, "non definie ou placeholder")
        ok = False

    if tenant_id and tenant_id != "METS_TON_TENANT_ID":
        _afficher_resultat("VOIXIA_TENANT_ID", True, tenant_id)
    else:
        _afficher_resultat("VOIXIA_TENANT_ID", False, "non defini ou placeholder")
        ok = False

    if api_base:
        _afficher_resultat("COCCINELLE_API_BASE", True, api_base)
    else:
        _afficher_resultat(
            "COCCINELLE_API_BASE",
            True,
            "non definie — utilisation de la valeur par defaut",
        )

    return ok


def test_headers_auth() -> bool:
    """Verifie que les headers d'authentification sont correctement construits."""
    print("\n=== Test 2 : Construction des headers VoixIA ===")

    try:
        from tools.appointments import _get_client
        client = _get_client()

        headers = dict(client.headers)
        has_key = "x-voixia-key" in headers or "X-VoixIA-Key" in headers
        has_tenant = "x-voixia-tenant" in headers or "X-VoixIA-Tenant" in headers

        # httpx normalise les headers en minuscules
        key_val = headers.get("x-voixia-key", "")
        tenant_val = headers.get("x-voixia-tenant", "")

        if has_key and key_val:
            _afficher_resultat(
                "Header X-VoixIA-Key",
                True,
                f"present ({len(key_val)} caracteres)",
            )
        else:
            _afficher_resultat("Header X-VoixIA-Key", False, "absent ou vide")

        if has_tenant and tenant_val:
            _afficher_resultat("Header X-VoixIA-Tenant", True, f"present ({tenant_val})")
        else:
            _afficher_resultat("Header X-VoixIA-Tenant", False, "absent ou vide")

        # Verifier qu'il n'y a plus de header Authorization/JWT
        has_auth = "authorization" in headers
        if not has_auth:
            _afficher_resultat(
                "Pas de header Authorization",
                True,
                "JWT correctement supprime",
            )
        else:
            _afficher_resultat(
                "Header Authorization",
                False,
                f"encore present : {headers['authorization'][:30]}...",
            )

        # Fermer le client
        asyncio.get_event_loop().run_until_complete(client.aclose())
        return has_key and has_tenant and not has_auth
    except Exception as e:
        _afficher_resultat("Construction headers", False, str(e))
        return False


async def test_check_availability() -> None:
    """Teste la verification de disponibilite des creneaux."""
    print("\n=== Test 3 : check_availability ===")

    try:
        from tools.appointments import check_availability
        resultat = await check_availability("2026-03-25", "consultation")
        _afficher_resultat("check_availability", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("check_availability", False, str(e))


async def test_book_appointment() -> None:
    """Teste la reservation d'un rendez-vous."""
    print("\n=== Test 4 : book_appointment ===")

    try:
        from tools.appointments import book_appointment
        test_phone = os.environ.get("TEST_PHONE_NUMBER", "+33600000000")
        resultat = await book_appointment(
            customer_name="Jean Test",
            customer_phone=test_phone,
            date_time="2026-03-25T10:00:00",
            service="consultation",
        )
        _afficher_resultat("book_appointment", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("book_appointment", False, str(e))


async def test_send_sms() -> None:
    """Teste l'envoi d'un SMS."""
    print("\n=== Test 5 : send_sms ===")

    try:
        from tools.messaging import send_sms
        test_phone = os.environ.get("TEST_PHONE_NUMBER", "+33600000000")
        resultat = await send_sms(
            to=test_phone,
            message="Test VoixIA — ceci est un message de test.",
        )
        _afficher_resultat("send_sms", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("send_sms", False, str(e))


async def test_send_email() -> None:
    """Teste l'envoi d'un e-mail."""
    print("\n=== Test 6 : send_email ===")

    try:
        from tools.messaging import send_email
        resultat = await send_email(
            to="test@coccinelle.ai",
            subject="Test VoixIA",
            body="Ceci est un e-mail de test envoye par l'agent VoixIA.",
        )
        _afficher_resultat("send_email", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("send_email", False, str(e))


async def test_create_prospect() -> None:
    """Teste la creation d'un prospect dans le CRM."""
    print("\n=== Test 7 : create_prospect ===")

    try:
        from tools.crm import create_prospect
        test_phone = os.environ.get("TEST_PHONE_NUMBER", "+33600000000")
        resultat = await create_prospect(
            name="Marie Test",
            phone=test_phone,
            email="marie.test@example.com",
        )
        _afficher_resultat("create_prospect", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("create_prospect", False, str(e))


async def test_search_products() -> None:
    """Teste la recherche de produits."""
    print("\n=== Test 8 : search_products ===")

    try:
        from tools.products import search_products
        resultat = await search_products("appartement paris")
        _afficher_resultat("search_products", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("search_products", False, str(e))


async def test_search_knowledge() -> None:
    """Teste la recherche dans la base de connaissances."""
    print("\n=== Test 9 : search_knowledge ===")

    try:
        from tools.knowledge import search_knowledge
        resultat = await search_knowledge("Quels sont les horaires d'ouverture ?")
        _afficher_resultat("search_knowledge", True, resultat[:100])
    except Exception as e:
        _afficher_resultat("search_knowledge", False, str(e))


async def main() -> None:
    """Fonction principale — execute tous les tests sequentiellement."""
    print("=" * 60)
    print("  Tests des tool calls VoixIA")
    print("  Auth : X-VoixIA-Key + X-VoixIA-Tenant")
    print("  API  : " + os.getenv("COCCINELLE_API_BASE", "https://coccinelle-api.youssef-amrouche.workers.dev"))
    print("=" * 60)

    # --- Tests synchrones ---
    env_ok = test_variables_env()
    headers_ok = test_headers_auth()

    if not env_ok:
        print("\n[ARRET] Les variables d'environnement ne sont pas configurees.")
        print("Editez le fichier .env et renseignez VOIXIA_API_KEY et VOIXIA_TENANT_ID.")
        print(f"\nResultat : {_succes}/{_total} tests reussis, {_echecs} echec(s).")
        sys.exit(1)

    # --- Tests asynchrones (appels API) ---
    await test_check_availability()
    await test_book_appointment()
    await test_send_sms()
    await test_send_email()
    await test_create_prospect()
    await test_search_products()
    await test_search_knowledge()

    # --- Resume ---
    print("\n" + "=" * 60)
    print(f"  Resultats : {_succes}/{_total} tests reussis, {_echecs} echec(s).")
    print("=" * 60)

    if _echecs > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
