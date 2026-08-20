#!/usr/bin/env python3
"""
Banc de test du BUDGET de resolution du tenant (chantier latence, 20/08/2026).

── CE QUE CE TEST PROTEGE ──
Le 18/08 a 12h41, `resolve-phone` a repondu ReadTimeout puis 500 : l'appelant a
attendu **30,2 s** avant le moindre son, parce que l'accueil personnalise attend
cette reponse. Le delai unitaire a ete ramene a 5 s le 18/08, mais un delai
unitaire ne borne pas le total — 3 essais + 2 pauses = 15,6 s au pire.

Ce banc verifie que le budget borne l'ENSEMBLE, pas chaque essai. Il ne touche
NI le reseau NI la production : `httpx.AsyncClient` est remplace par un double
qui dort le temps qu'on lui demande.

Lancement :  python3 scripts/test_resolution_budget.py
"""

import asyncio
import os
import sys
import time
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE / "voixia" / "agent"))

# `tenant.py` lit VOIXIA_API_KEY a l'import ; une valeur bidon suffit, aucune
# requete reelle n'est emise.
os.environ.setdefault("VOIXIA_API_KEY", "cle-de-test-non-fonctionnelle")

try:
    import httpx  # noqa: E402
except ModuleNotFoundError:
    # ── POURQUOI UN SUBSTITUT (20/08/2026) ──
    # `httpx` vit dans le venv du serveur VoixIA, pas sur le poste de dev ni dans
    # `npm test`. Reserver ce banc au serveur reviendrait a ne jamais le lancer —
    # et CLAUDE.md le dit deja : un garde-fou que personne n'execute n'est pas un
    # garde-fou. Ce qui est teste ici est NOTRE arithmetique de budget, pas httpx :
    # seuls `Timeout` (avec .read / .connect) et les classes d'exception sont
    # necessaires. Quand le vrai httpx est present, c'est LUI qui est utilise.
    import types

    class _Timeout:
        def __init__(self, read, connect=None):
            self.read = read
            self.connect = connect if connect is not None else read

    httpx = types.ModuleType("httpx")
    httpx.Timeout = _Timeout
    httpx.AsyncClient = object
    httpx.ReadTimeout = type("ReadTimeout", (Exception,), {})
    httpx.HTTPStatusError = type(
        "HTTPStatusError", (Exception,),
        {"__init__": lambda self, *a, **kw: Exception.__init__(self, *a)},
    )
    httpx.ConnectError = type("ConnectError", (Exception,), {})
    sys.modules["httpx"] = httpx

import tenant as mod  # noqa: E402

ECHECS = []
TOTAL = 0


def verifier(nom, condition, detail=""):
    global TOTAL
    TOTAL += 1
    if condition:
        print(f"  ok   {nom}")
    else:
        print(f"  ECHEC {nom} — {detail}")
        ECHECS.append(nom)


class _ReponseFactice:
    def __init__(self, charge):
        self._charge = charge

    def raise_for_status(self):
        return None

    def json(self):
        return self._charge


class _ClientFactice:
    """
    Double d'`httpx.AsyncClient`. `comportement` est appele a chaque essai et
    decide quoi faire : dormir, echouer, ou repondre.
    """

    comportement = None
    essais = 0

    def __init__(self, *a, timeout=None, **kw):
        self.timeout = timeout
        _ClientFactice.timeouts_vus.append(timeout)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, headers=None):
        _ClientFactice.essais += 1
        return await _ClientFactice.comportement(_ClientFactice.essais, self.timeout)


def _installer(comportement):
    _ClientFactice.comportement = comportement
    _ClientFactice.essais = 0
    _ClientFactice.timeouts_vus = []
    httpx.AsyncClient = _ClientFactice


_VRAI_CLIENT = httpx.AsyncClient


async def cas_nominal_non_penalise():
    """Le chemin normal (46-84 ms mesures en prod) ne doit rien perdre au budget."""
    async def rapide(essai, timeout):
        await asyncio.sleep(0.02)
        return _ReponseFactice({
            "tenant_id": "tenant_test", "company_name": "Garage Toulouse",
            "prompt_type": "automobile", "greeting": "Garage Toulouse, bonjour !",
            "agent_name": "Julien",
        })

    _installer(rapide)
    t0 = time.monotonic()
    res = await mod.resolve_tenant("+33939035761", caller="+33760762153", budget_s=1.5)
    ecoule = time.monotonic() - t0

    verifier("nominal : le tenant est resolu",
             res["tenant_id"] == "tenant_test", f"recu {res['tenant_id']!r}")
    verifier("nominal : l'accueil PERSONNALISE est conserve",
             res["greeting"] == "Garage Toulouse, bonjour !", f"recu {res['greeting']!r}")
    verifier("nominal : un seul essai",
             _ClientFactice.essais == 1, f"{_ClientFactice.essais} essais")
    verifier("nominal : pas de penalite de latence (< 0,3 s)",
             ecoule < 0.3, f"{ecoule:.3f} s")


async def cas_backend_muet_borne_a_1_5s():
    """Le cas du 18/08 : le backend ne repond jamais. C'est LE test du lot."""
    async def muet(essai, timeout):
        await asyncio.sleep(30)  # ne repondra jamais dans le temps imparti
        raise AssertionError("ne devrait jamais aboutir")

    _installer(muet)
    t0 = time.monotonic()
    res = await mod.resolve_tenant("+33939035761", budget_s=1.5)
    ecoule = time.monotonic() - t0

    verifier("backend muet : rend la main avant 2 s",
             ecoule < 2.0, f"{ecoule:.3f} s — l'appelant attend ce temps EN SILENCE")
    verifier("backend muet : ne rend pas la main trop tot (budget consomme)",
             ecoule >= 1.4, f"{ecoule:.3f} s")
    verifier("backend muet : repli sur les valeurs par defaut",
             res["tenant_id"] == "" and res["prompt_type"] == mod.DEFAULT_PROMPT_TYPE,
             f"recu {res['tenant_id']!r} / {res['prompt_type']!r}")
    verifier("backend muet : PAS de raison sociale d'un autre (accueil neutre)",
             res["company_name"] == "", f"recu {res['company_name']!r}")
    verifier("backend muet : le delai unitaire est rabote sur le budget",
             all(t.read <= 1.5 + 1e-6 for t in _ClientFactice.timeouts_vus),
             f"delais vus : {[t.read for t in _ClientFactice.timeouts_vus]}")


async def cas_18_aout_timeout_puis_500():
    """Rejeu fidele du 18/08 : essai 1 en timeout, essai 2 en 500."""
    async def timeout_puis_500(essai, timeout):
        if essai == 1:
            await asyncio.sleep(timeout.read + 1)
            raise httpx.ReadTimeout("")
        await asyncio.sleep(0.05)
        raise httpx.HTTPStatusError("500", request=None, response=None)

    _installer(timeout_puis_500)
    t0 = time.monotonic()
    res = await mod.resolve_tenant("+33939035761", budget_s=1.5)
    ecoule = time.monotonic() - t0

    verifier("18/08 rejoue : borne a 1,5 s (etait 30,2 s en production)",
             ecoule < 2.0, f"{ecoule:.3f} s")
    verifier("18/08 rejoue : repli propre, l'appel continue",
             res["prompt_type"] == mod.DEFAULT_PROMPT_TYPE, f"recu {res['prompt_type']!r}")


async def cas_lenteur_moderee_reste_personnalise():
    """Un backend lent mais dans le budget doit garder l'accueil personnalise."""
    async def lent_mais_ok(essai, timeout):
        await asyncio.sleep(0.6)
        return _ReponseFactice({
            "tenant_id": "tenant_test", "company_name": "Garage Toulouse",
            "greeting": "Garage Toulouse, bonjour !",
        })

    _installer(lent_mais_ok)
    res = await mod.resolve_tenant("+33939035761", budget_s=1.5)
    verifier("lenteur moderee (0,6 s) : l'accueil personnalise est CONSERVE",
             res["greeting"] == "Garage Toulouse, bonjour !", f"recu {res['greeting']!r}")


async def cas_sans_budget_inchange():
    """Sans budget, le comportement historique est intact (scripts, tests manuels)."""
    async def echoue(essai, timeout):
        raise httpx.ConnectError("hors ligne")

    _installer(echoue)
    res = await mod.resolve_tenant("+33939035761", budget_s=None)
    verifier("sans budget : les 3 essais historiques sont conserves",
             _ClientFactice.essais == 3, f"{_ClientFactice.essais} essais")
    verifier("sans budget : repli par defaut inchange",
             res["prompt_type"] == mod.DEFAULT_PROMPT_TYPE, f"recu {res['prompt_type']!r}")


async def principal():
    print("── Budget de resolution du tenant ──\n")
    for cas in (
        cas_nominal_non_penalise,
        cas_backend_muet_borne_a_1_5s,
        cas_18_aout_timeout_puis_500,
        cas_lenteur_moderee_reste_personnalise,
        cas_sans_budget_inchange,
    ):
        print(f"{cas.__doc__.strip().splitlines()[0]}")
        await cas()
        print()

    httpx.AsyncClient = _VRAI_CLIENT
    print("═" * 43)
    if ECHECS:
        print(f"RESULTAT : {TOTAL - len(ECHECS)}/{TOTAL} — ECHECS : {', '.join(ECHECS)}")
        return 1
    print(f"RESULTAT : {TOTAL}/{TOTAL}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
