import { Link, router } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { fromLead as companiesFromLead } from '@/routes/companies';
import { show as companyShow } from '@/routes/companies';
import type { LeadDirectoryCompany } from '@/types';

type Props = {
    /** UUID du lead, pour la route d'ajout. */
    leadUuid: string;
    /** Raison sociale saisie sur le lead ; sans elle, rien à ajouter. */
    company: string | null;
    /** Entreprise de l'annuaire déjà rattachée, le cas échéant. */
    directoryCompany: LeadDirectoryCompany | null;
};

/**
 * Petit rond « + » sur la ligne de la société d'un lead (demandé le 28
 * octobre 2026) : « Ajouter aux entreprises » fait entrer la raison sociale dans l'annuaire
 * des entreprises et y rattache le lead, en une requête ; une fois rattaché,
 * le même emplacement ouvre la fiche de l'entreprise. Rien sans société.
 */
export function LeadCompanyDirectoryButton({
    leadUuid,
    company,
    directoryCompany,
}: Props) {
    const [busy, setBusy] = useState(false);

    if (directoryCompany) {
        return (
            <Button
                asChild
                variant="outline"
                size="icon"
                className="size-6 rounded-full"
                aria-label={`Voir l’entreprise ${directoryCompany.name}`}
                title={`Voir l’entreprise ${directoryCompany.name}`}
            >
                <Link href={companyShow({ company: directoryCompany.uuid })}>
                    <Building2 aria-hidden className="size-3.5" />
                </Link>
            </Button>
        );
    }

    if (!company || company.trim() === '') {
        return null;
    }

    // Un simple rond « + » sur la ligne de la société (28 octobre 2026) ; le
    // serveur reprend une entreprise déjà connue sous une orthographe voisine.
    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-6 rounded-full"
            aria-label="Ajouter aux entreprises"
            title="Ajouter aux entreprises"
            disabled={busy}
            onClick={() =>
                router.post(
                    companiesFromLead({ lead: leadUuid }).url,
                    {},
                    {
                        preserveScroll: true,
                        onStart: () => setBusy(true),
                        onFinish: () => setBusy(false),
                    },
                )
            }
        >
            {busy ? (
                <Spinner className="size-3.5" />
            ) : (
                <Plus aria-hidden className="size-3.5" />
            )}
        </Button>
    );
}
