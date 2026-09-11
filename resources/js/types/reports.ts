export type ReportGranularity = 'hour' | 'day' | 'week' | 'month';

export type Report = {
    period: { from: string; to: string };
    /** Pas des courbes, choisi d'après la longueur de la période. */
    granularity: ReportGranularity;
    leads: {
        /** Leads reçus sur la période. */
        total: number;
        /** Leads reçus sur la période précédente de même durée. */
        previous_total: number;
        /** « Du 1 août 2026 au 31 août 2026 ». */
        previous_label: string;
        series: ReportPoint[];
    };
    visits: {
        /** Visites réservées (hors annulées) sur la période. */
        total: number;
        series: { label: string; count: number }[];
        /** Qui a réservé les visites de la période, du plus actif au moins actif. */
        by_booker: ReportBooker[];
    };
};

/** Une tranche de la courbe des leads : période choisie contre période précédente. */
export type ReportPoint = {
    label: string;
    current: number;
    previous: number;
};

/** Visites réservées par un membre sur la période. */
export type ReportBooker = {
    /** Nom du membre, ou « Sans auteur ». */
    name: string;
    /** Photo de profil du membre, absente pour « Sans auteur ». */
    avatar: string | null;
    total: number;
    done: number;
    cancelled: number;
};

/** Raccourci de période proposé dans le sélecteur des rapports. */
export type ReportPeriodOption = { value: string; label: string };
