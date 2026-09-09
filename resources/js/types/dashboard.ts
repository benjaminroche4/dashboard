import type { Lead } from '@/types';

/** Un bloc de « Mon travail » : les premières lignes et le total réel. */
export type MyWorkBlock = { items: Lead[]; total: number };

/** Leads et dossiers attribués au membre ; un bloc est null quand sa section lui est fermée. */
export type MyWork = {
    leads: MyWorkBlock | null;
    owner_leads: MyWorkBlock | null;
    clients: MyWorkBlock | null;
};
