/** Entrée du journal d'activité (miroir de ActivityController::summary). */
export type ActivityActor = {
    id: number;
    name: string;
    avatar: string | null;
};

export type ActivityLead = {
    id: number;
    uuid: string;
    name: string;
};

export type Activity = {
    id: number;
    /** Phrase à la 3e personne sans sujet, préfixée du nom de l'acteur à l'affichage. */
    message: string;
    actor: ActivityActor | null;
    resource: string;
    resource_label: string;
    lead: ActivityLead | null;
    created_at: string;
};

/** Page du journal : 50 entrées, liens précédent/suivant. */
export type ActivityPage = {
    data: Activity[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export type ActivityMember = {
    id: number;
    name: string;
    avatar: string | null;
};

export type ActivityResourceOption = {
    value: string;
    label: string;
};

export type ActivityFilters = {
    member: number | null;
    resource: string | null;
    lead: string | null;
};
