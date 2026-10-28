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
 * Petit geste à côté de la société d'un lead (demandé le 28 octobre 2026) :
 * « Ajouter aux entreprises » fait entrer la raison sociale dans l'annuaire
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
            <Button asChild variant="outline" size="sm" className="h-7">
                <Link href={companyShow({ company: directoryCompany.uuid })}>
                    <Building2 aria-hidden />
                    Voir l’entreprise
                </Link>
            </Button>
        );
    }

    if (!company || company.trim() === '') {
        return null;
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
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
            {busy ? <Spinner /> : <Plus aria-hidden />}
            Ajouter aux entreprises
        </Button>
    );
}
