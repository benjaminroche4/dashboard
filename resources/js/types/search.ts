/** Un résultat de la recherche unifiée ⌘K (miroir de SearchEverything::hit). */
export type SearchHit = {
    kind: string;
    id: number;
    uuid: string;
    title: string;
    subtitle: string | null;
    /** Libellé à droite : statut, formule, créneau… */
    meta: string | null;
    url: string;
    /** 3 = le titre commence par le texte, 2 = un mot commence par, 1 = trouvé ailleurs. */
    score: number;
};

export type SearchGroup = {
    kind: string;
    heading: string;
    hits: SearchHit[];
};

/** Réponse de la route `search` : les groupes classés, ou « mes dossiers » sans texte. */
export type SearchResponse = {
    groups: SearchGroup[];
    mine: SearchHit[];
};
