import { Link, router } from '@inertiajs/react';
import { CircleCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { SearchSelect } from '@/components/search-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { show as clientShow } from '@/routes/clients';
import { assign as propertyAssign } from '@/routes/properties';
import type { Property } from '@/types';

/** Client proposé à l'attribution : un lead converti. */
export type AssignableClient = {
    id: number;
    name: string;
    reference?: string | null;
};

/**
 * Pastille verte « Attribué à … » : un bien attribué est pris, il n'est plus
 * proposé en visite. Rien ne s'affiche pour un bien libre.
 */
export function PropertyAssignmentBadge({
    property,
    className,
}: {
    /** Tout objet qui porte son attribution : bien de l'annuaire ou du dossier. */
    property: Pick<Property, 'assigned_lead'>;
    className?: string;
}) {
    if (property.assigned_lead === null) {
        return null;
    }

    return (
        <Badge
            className={cn(
                'gap-1 border-transparent bg-green-100 font-medium text-green-900 dark:bg-green-950 dark:text-green-200',
                className,
            )}
            aria-label={`Attribué à ${property.assigned_lead.name}`}
        >
            <UserCheck className="size-3" aria-hidden />
            Attribué à {property.assigned_lead.name}
        </Badge>
    );
}

/**
 * Bandeau vert de la fiche d'un bien attribué : à qui, depuis quand, et le
 * rappel qu'il n'est plus proposé en visite. Le nom mène au dossier.
 */
export function PropertyAssignmentBanner({ property }: { property: Property }) {
    if (property.assigned_lead === null) {
        return null;
    }

    return (
        <section
            aria-label="Bien attribué"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
        >
            <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
            >
                <CircleCheck className="size-5" />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="font-semibold">
                    Attribué à{' '}
                    <Link
                        href={clientShow({
                            lead: property.assigned_lead.uuid,
                        })}
                        className="underline underline-offset-4"
                    >
                        {property.assigned_lead.name}
                    </Link>
                </p>
                <p className="text-green-800 dark:text-green-200/80">
                    Ce bien est pris : il n’est plus proposé pour une visite ni
                    suggéré sur un dossier.
                </p>
            </div>
        </section>
    );
}

/**
 * Bouton « Attribuer à un client » et sa modale ; sur un bien déjà attribué,
 * le même bouton propose de le libérer.
 */
export function PropertyAssignmentButton({
    property,
    clients,
}: {
    property: Property;
    /** Clients (leads convertis) auxquels le bien peut être attribué. */
    clients: AssignableClient[];
}) {
    const [open, setOpen] = useState(false);
    const [leadId, setLeadId] = useState(
        property.assigned_lead === null ? '' : 'assigned',
    );
    const [busy, setBusy] = useState(false);
    const assigned = property.assigned_lead !== null;

    const submit = (id: string) => {
        setBusy(true);
        router.patch(
            propertyAssign({ property: property.uuid }).url,
            { lead_id: id === '' ? null : Number(id) },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setOpen(false);
                },
            },
        );
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                    setLeadId('');
                    setOpen(true);
                }}
            >
                <UserCheck />
                {assigned ? 'Changer l’attribution' : 'Attribuer à un client'}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {assigned
                                ? `Attribution de ${property.label}`
                                : `Attribuer ${property.label}`}
                        </DialogTitle>
                        <DialogDescription>
                            Un bien attribué est pris : il disparaît des biens
                            proposables pour une visite.
                        </DialogDescription>
                    </DialogHeader>
                    {clients.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Aucun dossier n’est rattaché à ce bien : liez-le
                            d’abord à un client depuis son dossier.
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="property-assignee">Client</Label>
                            <SearchSelect
                                id="property-assignee"
                                value={leadId}
                                onChange={setLeadId}
                                placeholder="Choisir un client"
                                searchPlaceholder="Rechercher un client (nom, référence)…"
                                noResults="Aucun client ne correspond."
                                options={clients.map((client) => ({
                                    value: String(client.id),
                                    label: client.name,
                                    hint: client.reference ?? null,
                                }))}
                            />
                        </div>
                    )}
                    <DialogFooter className="sm:justify-between">
                        {assigned ? (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                onClick={() => submit('')}
                            >
                                Libérer le bien
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                disabled={busy || leadId === ''}
                                onClick={() => submit(leadId)}
                            >
                                Attribuer
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
