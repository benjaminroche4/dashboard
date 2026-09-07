/*
 * Palette bleue de shadcn (jetons `--chart-1` et `--chart-2` définis dans
 * app.css, en clair comme en sombre) : bleu franc pour ce qui arrive (leads,
 * émis), bleu clair pour ce qui aboutit (convertis, encaissé).
 * Chaque graphique garde son tableau de valeurs pour la lecture sans couleur.
 */
export const reportColors = {
    primary: 'var(--chart-1)',
    success: 'var(--chart-2)',
} as const;
