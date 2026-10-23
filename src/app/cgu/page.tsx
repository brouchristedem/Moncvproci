import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation et confidentialité",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition">
            <ArrowLeft size={15} /> Retour à l&apos;accueil
          </Link>
          <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase">
            MON CV PRO CI
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-10 text-sm leading-relaxed text-foreground/75">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">
            Conditions générales d&apos;utilisation
          </h1>
          <p className="text-xs text-foreground/45">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">1. Objet</h2>
          <p>
            MON CV PRO CI est un service en ligne permettant de créer, personnaliser et télécharger
            un curriculum vitae au format PDF, avec possibilité d&apos;y associer une lettre de
            motivation assortie. L&apos;utilisation du service implique l&apos;acceptation pleine et
            entière des présentes conditions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">2. Fonctionnement du service</h2>
          <p>
            L&apos;éditeur permet de renseigner ses informations, de choisir un modèle parmi ceux
            proposés, puis d&apos;exporter son CV en PDF. La création et la modification du CV dans
            l&apos;éditeur sont gratuites et illimitées. Un aperçu gratuit filigrané est disponible
            avant tout paiement. En revanche, chaque téléchargement du PDF final (sans filigrane) est
            payant : 1 000 FCFA via Wave pour le CV seul, ou 1 500 FCFA pour le Pack Candidature
            Complète incluant en plus une lettre de motivation assortie au CV. Ce paiement s&apos;applique
            à chaque téléchargement — y compris pour retélécharger un CV déjà payé, ou télécharger une
            version modifiée après un premier paiement. Aucun abonnement : c&apos;est un paiement à
            l&apos;acte, pas un forfait récurrent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">3. Paiement</h2>
          <p>
            Le paiement s&apos;effectue par Wave et est dû à chaque téléchargement du PDF final. Une
            fois la transaction confirmée, ce téléchargement précis est débloqué ; un nouveau
            téléchargement (y compris après modification de votre CV) nécessite un nouveau paiement.
            Un code promotionnel valide peut remplacer un paiement lorsque l&apos;offre est active.
          </p>
        </section>

        <section id="confidentialite" className="space-y-2 scroll-mt-24">
          <h2 className="font-semibold text-foreground">4. Confidentialité des données</h2>
          <p>
            Les informations saisies dans l&apos;éditeur (nom, expériences, coordonnées, photo, etc.)
            sont utilisées uniquement pour générer votre CV et ne sont ni vendues ni partagées avec
            des tiers à des fins commerciales. Elles sont hébergées de façon sécurisée sur
            l&apos;infrastructure Firebase (Google Cloud) et conservées le temps nécessaire à
            l&apos;utilisation du service. Vous pouvez demander la suppression de vos données à tout
            moment en nous contactant (voir section 7) ; la demande sera traitée manuellement, notre
            service ne disposant pas encore d&apos;une suppression automatique en libre-service.
          </p>
          <p>
            <strong className="text-foreground">Fonction « Améliorer avec l&apos;IA ».</strong> Cette
            fonction est facultative. Lorsque vous l&apos;utilisez, le texte du champ concerné (par
            exemple une description d&apos;expérience ou le corps d&apos;une lettre) est envoyé à un
            prestataire d&apos;intelligence artificielle tiers (selon la disponibilité : Google Gemini,
            Groq, Cloudflare, OpenRouter ou Mistral) afin d&apos;être reformulé. Votre email et votre
            numéro de téléphone sont retirés avant l&apos;envoi, mais le reste du texte (noms,
            employeurs, parcours) peut s&apos;y trouver. Selon les conditions du prestataire pour les
            offres gratuites, ce texte peut être conservé temporairement, utilisé pour améliorer ses
            modèles, voire lu par des relecteurs humains. N&apos;envoyez donc pas d&apos;informations
            sensibles ou confidentielles via cette fonction. Si vous préférez éviter tout partage,
            n&apos;utilisez simplement pas ce bouton : le reste du service fonctionne sans IA.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">5. Propriété du contenu</h2>
          <p>
            Le contenu de votre CV (textes, photo, informations personnelles) vous appartient. Les
            modèles, le design et le code de la plateforme restent la propriété de MON CV PRO CI.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">6. Mentions légales</h2>
          <p>
            MON CV PRO CI est un service édité et exploité à titre individuel, pensé pour le marché
            ivoirien. Le service ne constitue pas une entité juridique distincte de son éditeur. Pour
            toute question sur l&apos;exploitation du service, utilisez les coordonnées de contact
            ci-dessous.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-foreground">7. Contact et réclamations</h2>
          <p>
            Pour toute question relative à ces conditions, à vos données, ou en cas de problème avec
            un paiement, contactez-nous via WhatsApp au +225 05 45 17 75 71. Chaque situation est
            étudiée individuellement ; nous n&apos;avons pas, à ce stade, de politique de remboursement
            automatisée.
          </p>
        </section>
      </main>
    </div>
  );
}
