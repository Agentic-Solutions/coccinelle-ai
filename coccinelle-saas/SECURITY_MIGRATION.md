# Guide de Migration : localStorage vers httpOnly Cookies

## Contexte

Actuellement, l'application stocke les tokens d'authentification dans localStorage, ce qui expose l'application aux attaques XSS (Cross-Site Scripting). Un attaquant qui parvient à injecter du JavaScript malveillant peut facilement accéder à `localStorage.getItem('auth_token')`.

## Solution Recommandée: httpOnly Cookies

Les cookies httpOnly ne peuvent pas être accédés via JavaScript, ce qui les rend immunisés contre les attaques XSS.

## Implémentation

### 1. Modifications Backend (Cloudflare Workers)

#### A. Endpoint de Login (`/api/v1/auth/login`)

```typescript
// Au lieu de retourner le token dans le JSON
return new Response(JSON.stringify({
  success: true,
  user: userData,
  tenant: tenantData
}), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`, // 7 jours
  }
});
```

#### B. Endpoint de Signup (`/api/v1/auth/signup`)

Même approche : définir le cookie au lieu de retourner le token dans le body.

#### C. Middleware d'authentification

```typescript
function extractTokenFromCookies(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies.auth_token || null;
}
```

#### D. Endpoint de Logout

```typescript
// Supprimer le cookie
return new Response(JSON.stringify({ success: true }), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Set-Cookie': 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
  }
});
```

### 2. Modifications Frontend (Next.js)

#### A. Supprimer les accès localStorage

Retirer de tous les fichiers :
```typescript
// À SUPPRIMER
localStorage.setItem('auth_token', data.token);
localStorage.getItem('auth_token');
localStorage.removeItem('auth_token');
```

#### B. Appels API

Les cookies sont automatiquement envoyés avec les requêtes fetch si on configure correctement :

```typescript
fetch(`${API_URL}/api/v1/auth/me`, {
  credentials: 'include', // IMPORTANT : envoie les cookies
  headers: {
    'Content-Type': 'application/json'
  }
});
```

#### C. Protection CSRF (Cross-Site Request Forgery)

Implémenter un token CSRF pour les requêtes mutantes (POST, PUT, DELETE) :

```typescript
// Backend : générer un CSRF token
const csrfToken = crypto.randomUUID();

// Stocker dans un cookie non-httpOnly (accessible en JS)
'Set-Cookie': `csrf_token=${csrfToken}; Secure; SameSite=Strict; Path=/; Max-Age=604800`

// Frontend : l'envoyer dans les headers
fetch(`${API_URL}/api/v1/auth/profile`, {
  method: 'PUT',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCookie('csrf_token')
  },
  body: JSON.stringify(data)
});
```

### 3. Configuration CORS

#### Backend (Cloudflare Workers)

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://votre-domaine-frontend.com',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
};
```

### 4. Fichiers à Modifier

#### Frontend

1. `app/signup/page.tsx` (lignes 66-68, 99-101)
2. `app/login/page.tsx`
3. `src/components/onboarding/ProfileStep.jsx`
4. `src/components/settings/ProfileForm.tsx` (ligne 26)
5. Tous les fichiers qui font `localStorage.getItem('auth_token')`

#### Backend (Cloudflare Workers)

1. `src/routes/auth.ts` (login, signup endpoints)
2. `src/middleware/auth.ts` (extraction du token)
3. `src/routes/*` (tous les endpoints protégés)

## Avantages

✅ Protection contre XSS
✅ Protection contre CSRF (avec token CSRF)
✅ Expiration automatique des cookies
✅ Transmission automatique dans les requêtes

## Inconvénients

⚠️ Nécessite une configuration CORS stricte
⚠️ Requiert un domaine HTTPS en production
⚠️ Complexité accrue avec le token CSRF

## Plan de Migration

### Phase 1 : Préparation
- [ ] Implémenter le support des cookies dans le backend
- [ ] Supporter les deux méthodes (localStorage + cookies) temporairement
- [ ] Tester en environnement de développement

### Phase 2 : Migration
- [ ] Déployer le backend avec support cookies
- [ ] Déployer le frontend avec cookies uniquement
- [ ] Invalider tous les tokens localStorage existants

### Phase 3 : Nettoyage
- [ ] Retirer le code de support localStorage
- [ ] Documenter la nouvelle architecture

## Notes de Production

1. **Environnement de développement** : Les cookies Secure nécessitent HTTPS. Utiliser `Secure: false` en dev local.

2. **Domaines multiples** : Si vous avez plusieurs sous-domaines, configurer `Domain=.votre-domaine.com`.

3. **Expiration** : Aligner l'expiration du cookie avec celle du JWT.

4. **Refresh tokens** : Considérer l'implémentation de refresh tokens pour améliorer la sécurité.

## Ressources

- [OWASP: HttpOnly](https://owasp.org/www-community/HttpOnly)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [CSRF Protection](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## État Actuel

🔴 **NON IMPLÉMENTÉ** - Le système utilise encore localStorage

## Priorité

🔴 **HAUTE** - Vulnérabilité XSS active

---

*Document généré le 2024-12-20 - Coccinelle.AI Security Team*
