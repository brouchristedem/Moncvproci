# Agent marketing MON CV PRO CI

Chaque jour, l'agent crée **une affiche (1080×1350)**, **une vidéo verticale (1080×1920, TikTok/Reels)** et **les légendes Instagram + TikTok**, puis envoie tout sur ton Telegram. Tu n'as qu'à publier.
100 % gratuit (GitHub Actions + Groq gratuit + Telegram). Aucun chiffre ni témoignage inventé : conseils généraux, et l'offre réelle (Pass Candidature).

## Mise en route (une seule fois, ~10 min)

1. **Telegram** : dans Telegram, ouvre `@BotFather` → `/newbot` → copie le token. Écris ensuite un message à ton bot, puis ouvre `https://api.telegram.org/bot<TOKEN>/getUpdates` pour lire `chat.id`. (Tu peux réutiliser le bot et le chat de tes notifications de paiement.)
2. **Groq** (facultatif, pour des idées nouvelles chaque jour) : crée une clé gratuite sur console.groq.com. Sans clé, l'agent utilise la banque d'idées (`content-bank.json`).
3. **GitHub** → ton dépôt → Settings → Secrets and variables → Actions → *New repository secret* :
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `GROQ_API_KEY` (facultatif)
4. Onglet **Actions** → *Agent marketing (post du jour)* → **Run workflow** pour tester tout de suite. Ensuite il tourne seul chaque jour à 07h00.

## Rotation
`config.json` → `rotation` : conseil, à éviter/à faire, question, règle, conseil, à éviter/à faire, offre. Modifie la liste pour changer le rythme.

## Test en local
```
npm ci && npx playwright install chromium
node src/run.cjs --dry --no-ai      # crée out/post.png + out/post.mp4 sans rien envoyer
node src/preview.cjs                # aperçu de toutes les affiches dans out/preview/
```

## Sécurité du contenu
Les idées de l'IA passent par un validateur : pas de pourcentage, de statistique, de promesse (« garanti »), de gros chiffres. Si l'IA échoue ou est refusée, la banque prend le relais.

## Publication automatique Instagram (affiche + Reel)
Une fois configurée, l'agent publie lui-même l'affiche et le Reel avec la légende ; Telegram sert de confirmation (et de secours : en cas d'erreur tu reçois un message et tu publies à la main).

1. Ton compte Instagram doit être **Professionnel** (Paramètres → Type de compte → Passer à un compte professionnel, gratuit).
2. Va sur developers.facebook.com → *Mes apps* → *Créer une app* → type **Entreprise** → ajoute le produit **Instagram** → « API avec connexion Instagram ».
3. Dans *Rôles de l'app* → *Testeurs Instagram*, ajoute ton compte, puis accepte l'invitation dans Instagram (Paramètres → Sites web et applications → Invitations de testeur). Pas besoin de validation Meta tant que c'est ton propre compte.
4. Dans la configuration de l'API Instagram : *Générer un jeton d'accès* pour ton compte (permissions `instagram_business_basic` et `instagram_business_content_publish`). Copie le jeton et l'**ID du compte Instagram** affiché à côté.
5. Le jeton généré est de courte durée : échange-le contre un jeton **60 jours** avec
   `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<SECRET_APP>&access_token=<JETON>`
6. Ajoute dans GitHub (Secrets Actions) : `INSTAGRAM_ACCESS_TOKEN` et `INSTAGRAM_USER_ID`.
7. Tous les ~50 jours, régénère le jeton (étapes 4-5) et remplace le secret. Si le jeton expire, l'agent te prévient sur Telegram et continue d'envoyer les fichiers.

Pour tester sans publier : `node src/run.cjs --dry`. Pour envoyer sur Telegram sans Instagram : `--no-instagram`.

TikTok reste manuel (la publication directe est limitée aux apps auditées par TikTok).
