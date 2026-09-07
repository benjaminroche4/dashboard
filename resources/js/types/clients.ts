/** Un client : lead converti, vu comme un dossier en cours. */
export type Client = {
    id: number;
    uuid: string;
    reference: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    offer_label: string | null;
    arrival_at: string | null;
    /** Date de passage en « Converti » (ISO 8601). */
    converted_at: string | null;
    assignee: { id: number; name: string; avatar: string | null } | null;
    invoices_count: number;
    document_requests_count: number;
};

/** Fiche d'un dossier client : le client et son projet de logement. */
export type ClientDetail = Client & {
    language_label: string;
    origin_city: string | null;
    budget_cents: number | null;
    currency: string;
    districts: number[];
    property_types: string[];
    duration_label: string | null;
    furnished_label: string | null;
    guarantor_label: string | null;
    message: string | null;
    score: number | null;
};

/** Facturé, encaissé et reste dû d'un dossier, par devise (hors factures annulées). */
export type ClientTotals = {
    currency: string;
    invoiced_cents: number;
    paid_cents: number;
    due_cents: number;
};

export type ClientNote = {
    id: number;
    body: string;
    by: string | null;
    avatar: string | null;
    at: string | null;
};
