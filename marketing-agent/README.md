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

## Plus tard
Publication automatique Instagram (API Graph, compte pro + page Facebook). TikTok reste manuel (publication directe impossible pour une app non auditée).
