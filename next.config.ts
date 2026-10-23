import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin ne doit pas être regroupé par le bundler : sur Vercel, sa
  // dépendance jwks-rsa/jose échouait au chargement (ERR_REQUIRE_ESM).
  serverExternalPackages: ["firebase-admin"],
  /* config options here */
  async redirects() {
    return [
      // Ancien domaine (avant l'achat de moncvproci.com) : toute visite,
      // y compris depuis une icône PWA déjà installée pointant vers cette
      // adresse, est renvoyée vers le nouveau domaine officiel.
      {
        source: "/:path*",
        has: [{ type: "host", value: "moncvpro-ci.vercel.app" }],
        destination: "https://moncvproci.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
