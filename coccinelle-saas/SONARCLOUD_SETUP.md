# Configuration SonarCloud pour Coccinelle.AI

## Étape 1 : Créer un compte SonarCloud

1. Allez sur [https://sonarcloud.io](https://sonarcloud.io)
2. Cliquez sur "Log in" et connectez-vous avec votre compte GitHub
3. Autorisez SonarCloud à accéder à vos repositories

## Étape 2 : Créer une organisation

1. Une fois connecté, cliquez sur le "+" en haut à droite
2. Sélectionnez "Analyze new project"
3. Créez une organisation (si vous n'en avez pas déjà une)
   - Nom : `coccinelle-ai` (ou votre nom d'organisation GitHub)
   - Clé : `coccinelle-ai`

## Étape 3 : Importer le projet

1. Sélectionnez votre repository GitHub
2. Ou cliquez sur "Manually" pour configurer manuellement
3. Définissez les paramètres :
   - Project key : `coccinelle-ai-saas`
   - Organization : `coccinelle-ai`

## Étape 4 : Générer un token

1. Allez dans "My Account" > "Security"
2. Cliquez sur "Generate Token"
3. Nom du token : `coccinelle-saas-local`
4. Copiez le token généré (vous ne pourrez plus le voir après)

## Étape 5 : Configuration locale

Créez un fichier `.env.local` (si pas déjà existant) et ajoutez :

```bash
SONAR_TOKEN=votre_token_ici
```

## Étape 6 : Installer SonarScanner

### Option A : Via npm (Recommandé)
```bash
npm install -g sonar-scanner
```

### Option B : Via Homebrew (macOS)
```bash
brew install sonar-scanner
```

### Option C : Téléchargement manuel
1. Téléchargez depuis [https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
2. Extrayez et ajoutez au PATH

## Étape 7 : Lancer l'analyse

### Analyse locale (avec token)
```bash
sonar-scanner \
  -Dsonar.organization=coccinelle-ai \
  -Dsonar.projectKey=coccinelle-ai-saas \
  -Dsonar.sources=. \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.token=$SONAR_TOKEN
```

Ou simplement (après avoir configuré le token) :
```bash
npm run sonar
```

## Étape 8 : Intégration GitHub Actions (Optionnel)

Créez `.github/workflows/sonarcloud.yml` :

```yaml
name: SonarCloud Analysis

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarcloud:
    name: SonarCloud
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

N'oubliez pas d'ajouter `SONAR_TOKEN` dans les secrets GitHub :
1. Settings > Secrets and variables > Actions
2. New repository secret
3. Name: `SONAR_TOKEN`
4. Value: votre token SonarCloud

## Résultats de l'analyse

Une fois l'analyse terminée, vous verrez :
- **Quality Gate** : ✅ Pass ou ❌ Failed
- **Bugs** : Nombre de bugs détectés
- **Vulnerabilities** : Failles de sécurité
- **Code Smells** : Problèmes de maintenabilité
- **Coverage** : Couverture de tests (si configurée)
- **Duplications** : Code dupliqué
- **Security Hotspots** : Points sensibles de sécurité

## Configuration avancée

Le fichier `sonar-project.properties` est déjà configuré avec :
- Exclusions : node_modules, .next, build, tests
- Sources : src, app, lib
- Encoding : UTF-8

Vous pouvez le modifier selon vos besoins.

## Liens utiles

- [Documentation SonarCloud](https://docs.sonarcloud.io)
- [Dashboard SonarCloud](https://sonarcloud.io/projects)
- [Rules Explorer](https://rules.sonarsource.com/)
