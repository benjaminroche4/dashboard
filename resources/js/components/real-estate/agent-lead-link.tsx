import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { show as clientShow } from '@/routes/clients';
import { show as leadShow } from '@/routes/leads';
import type { AgentLead } from '@/types';

/**
 * Une ligne « lead ou client » de l'annuaire : un lead converti porte le nom de
 * son foyer, un badge « Client » et mène à son dossier ; un lead en cours mène
 * à sa fiche, son statut rappelé en gris.
 */
export function AgentLeadLink({ lead }: { lead: AgentLead }) {
    return (
        <>
            <Link
                href={
                    lead.is_client
                        ? clientShow({ lead: lead.uuid })
                        : leadShow({ lead: lead.uuid })
                }
                className="truncate font-medium underline-offset-4 hover:underline"
            >
                {lead.name}
            </Link>
            {lead.is_client ? (
                <Badge
                    variant="secondary"
                    className="shrink-0 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                    Client
                </Badge>
            ) : (
                <span className="text-muted-foreground shrink-0 text-xs">
                    {lead.status_label}
                </span>
            )}
        </>
    );
}
