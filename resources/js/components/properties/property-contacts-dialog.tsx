import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { SearchSelect } from '@/components/search-select';
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
import { useCreatedOption } from '@/hooks/use-created-option';
import { fields as propertyFields } from '@/routes/properties';
import type { Property, PropertyFormOptions } from '@/types';

type Options = Pick<
    PropertyFormOptions,
    | 'owners'
    | 'agencies'
    | 'agents'
    | 'partners'
    | 'ownerKinds'
    | 'partnerTypes'
>;

type ContactValues = {
    owner_id: string;
    agency_id: string;
    agent_id: string;
    partner_id: string;
};

/** Valeur d'un `SearchSelect` (chaîne) vers l'identifiant envoyé. */
function toId(value: string): number | null {
    return value === '' ? null : Number(value);
}

/**
 * Action rapide « Contacts » de la fiche d'un bien (2 novembre 2026) :
 * propriétaire, agence, agent et partenaire se choisissent **ensemble**, dans
 * une seule modale, et chacun se crée sur place s'il n'existe pas encore —
 * le nouveau contact est aussitôt sélectionné. Choisir une agence ne propose
 * plus que ses agents ; choisir un agent rattaché pose son agence.
 */
export function PropertyContactsDialog({
    open,
    onOpenChange,
    property,
    agencyId,
    options,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    property: Property;
    /** Agence actuelle du bien (la sienne, sinon celle de son agent). */
    agencyId: number | null;
    options: Options;
}) {
    const initial = (): ContactValues => ({
        owner_id: property.owner ? String(property.owner.id) : '',
        agency_id: agencyId === null ? '' : String(agencyId),
        agent_id: property.agent ? String(property.agent.id) : '',
        partner_id: property.partner ? String(property.partner.id) : '',
    });
    const [values, setValues] = useState<ContactValues>(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [creating, setCreating] = useState<
        'owner' | 'agency' | 'agent' | 'partner' | null
    >(null);

    const set = (key: keyof ContactValues, value: string) =>
        setValues((current) => ({ ...current, [key]: value }));

    const chooseAgency = (value: string) =>
        setValues((current) => {
            const agent = options.agents.find(
                (item) => String(item.id) === current.agent_id,
            );
            // Un agent d'une autre agence ne reste pas sélectionné.
            const keepAgent =
                value === '' ||
                agent === undefined ||
                agent.agency_id === null ||
                agent.agency_id === undefined ||
                String(agent.agency_id) === value;

            return {
                ...current,
                agency_id: value,
                agent_id: keepAgent ? current.agent_id : '',
            };
        });

    const chooseAgent = (value: string) =>
        setValues((current) => {
            const agent = options.agents.find(
                (item) => String(item.id) === value,
            );

            return {
                ...current,
                agent_id: value,
                agency_id:
                    agent?.agency_id !== null && agent?.agency_id !== undefined
                        ? String(agent.agency_id)
                        : current.agency_id,
            };
        });

    const snapshotOwners = useCreatedOption(options.owners, (id) =>
        set('owner_id', String(id)),
    );
    const snapshotAgencies = useCreatedOption(options.agencies, (id) =>
        chooseAgency(String(id)),
    );
    const snapshotAgents = useCreatedOption(options.agents, (id) =>
        chooseAgent(String(id)),
    );
    const snapshotPartners = useCreatedOption(options.partners, (id) =>
        set('partner_id', String(id)),
    );

    const agents =
        values.agency_id === ''
            ? options.agents
            : options.agents.filter(
                  (agent) => String(agent.agency_id) === values.agency_id,
              );

    const submit = () => {
        setProcessing(true);
        router.patch(
            propertyFields({ property: property.uuid }).url,
            {
                owner_id: toId(values.owner_id),
                agency_id: toId(values.agency_id),
                agent_id: toId(values.agent_id),
                partner_id: toId(values.partner_id),
            },
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onError: (received) => setErrors(received),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const rows: {
        key: keyof ContactValues;
        label: string;
        placeholder: string;
        search: string;
        empty: string;
        createLabel: string;
        onChange: (value: string) => void;
        create: () => void;
        items: { value: string; label: string; hint?: string | null }[];
    }[] = [
        {
            key: 'owner_id',
            label: 'Propriétaire',
            placeholder: 'Aucun propriétaire',
            search: 'Rechercher un propriétaire…',
            empty: 'Aucun propriétaire',
            createLabel: 'Nouveau propriétaire',
            onChange: (value) => set('owner_id', value),
            create: () => {
                snapshotOwners();
                setCreating('owner');
            },
            items: options.owners.map((owner) => ({
                value: String(owner.id),
                label: owner.name,
            })),
        },
        {
            key: 'agency_id',
            label: 'Agence',
            placeholder: 'Aucune agence',
            search: 'Rechercher une agence…',
            empty: 'Aucune agence',
            createLabel: 'Nouvelle agence',
            onChange: chooseAgency,
            create: () => {
                snapshotAgencies();
                setCreating('agency');
            },
            items: options.agencies.map((agency) => ({
                value: String(agency.id),
                label: agency.name,
                hint: agency.address,
            })),
        },
        {
            key: 'agent_id',
            label: 'Agent',
            placeholder: 'Aucun agent',
            search: 'Rechercher un agent (nom, agence)…',
            empty: 'Aucun agent',
            createLabel: 'Nouvel agent',
            onChange: chooseAgent,
            create: () => {
                snapshotAgents();
                setCreating('agent');
            },
            items: agents.map((agent) => ({
                value: String(agent.id),
                label: agent.name,
                hint: agent.agency ?? 'Indépendant',
            })),
        },
        {
            key: 'partner_id',
            label: 'Partenaire',
            placeholder: 'Aucun partenaire',
            search: 'Rechercher un partenaire…',
            empty: 'Aucun partenaire',
            createLabel: 'Nouveau partenaire',
            onChange: (value) => set('partner_id', value),
            create: () => {
                snapshotPartners();
                setCreating('partner');
            },
            items: options.partners.map((partner) => ({
                value: String(partner.id),
                label: partner.name,
                hint: partner.type,
            })),
        },
    ];

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(next) => {
                    if (next) {
                        setValues(initial());
                        setErrors({});
                    }
                    onOpenChange(next);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contacts du bien</DialogTitle>
                        <DialogDescription>
                            Choisissez qui rattacher à {property.label}, ou
                            créez-le sur place.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        {rows.map((row) => (
                            <div key={row.key} className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label
                                        htmlFor={`property-contact-${row.key}`}
                                    >
                                        {row.label}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground h-7 px-2"
                                        onClick={row.create}
                                    >
                                        <Plus aria-hidden />
                                        {row.createLabel}
                                    </Button>
                                </div>
                                <SearchSelect
                                    id={`property-contact-${row.key}`}
                                    value={values[row.key]}
                                    onChange={row.onChange}
                                    options={row.items}
                                    placeholder={row.placeholder}
                                    searchPlaceholder={row.search}
                                    emptyLabel={row.empty}
                                    noResults="Aucun résultat."
                                />
                                <InputError message={errors[row.key]} />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            disabled={processing}
                            onClick={submit}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Créés par-dessus la modale : le nouveau contact est aussitôt choisi. */}
            <OwnerDialog
                open={creating === 'owner'}
                onOpenChange={(next) => !next && setCreating(null)}
                kinds={options.ownerKinds}
            />
            <AgencyDialog
                open={creating === 'agency'}
                onOpenChange={(next) => !next && setCreating(null)}
            />
            <AgentDialog
                open={creating === 'agent'}
                onOpenChange={(next) => !next && setCreating(null)}
                agencies={options.agencies}
                defaultAgencyId={toId(values.agency_id)}
            />
            <PartnerDialog
                open={creating === 'partner'}
                onOpenChange={(next) => !next && setCreating(null)}
                types={options.partnerTypes}
            />
        </>
    );
}
