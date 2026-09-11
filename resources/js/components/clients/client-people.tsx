import { useForm, usePage } from '@inertiajs/react';
import { Mail, Pencil, Phone, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { SearchSelect } from '@/components/search-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientTenantProfileDialog } from '@/components/clients/client-tenant-profile-dialog';
import { capitalizeName } from '@/lib/format';
import { tenantDetails } from '@/lib/tenant-profile';
import { GuarantorDialog } from '@/components/clients/guarantor-dialog';
import { RentAffordabilityAlert } from '@/components/clients/rent-affordability-alert';
import { formatMoney } from '@/lib/format';
import { totalIncomeCents } from '@/lib/rent-affordability';
import { people as clientPeople } from '@/routes/clients';
import type {
    ClientDetail,
    ClientGuarantor,
    TenantProfile,
    TenantSlot,
} from '@/types';

/** Initiales d'un nom, pour l'avatar de repli. */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

/** Bloc d'une catégorie de personnes du dossier. */
function Group({
    title,
    hint,
    action,
    children,
}: {
    title: string;
    hint?: string;
    /** Bouton ou lien de la catégorie (ajouter, attribuer…). */
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section aria-label={title} className="grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-medium">{title}</h3>
                    {hint && (
                        <p className="text-muted-foreground text-sm">{hint}</p>
                    )}
                </div>
                {action}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">{children}</div>
        </section>
    );
}

/** Une ligne de détail, alignée avec les autres de la carte. */
function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-2">
            <dt className="text-muted-foreground truncate text-xs">{label}</dt>
            <dd className="truncate">{value}</dd>
        </div>
    );
}

/**
 * Carte d'une personne : nom, rôle, moyens de la joindre et, pour un
 * locataire seulement, ses détails (état civil, séjour, situation
 * professionnelle) avec le bouton qui ouvre sa fiche.
 */
function PersonCard({
    name,
    role,
    email,
    phone,
    avatar,
    profile,
    onEdit,
}: {
    name: string;
    role: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    /** Renseigné pour un locataire seulement. */
    profile?: TenantProfile;
    onEdit?: () => void;
}) {
    const details = profile ? tenantDetails(profile) : [];

    return (
        <div className="bg-card grid content-start gap-2 rounded-xl border p-4">
            <div className="flex items-center gap-3">
                <Avatar className="size-9">
                    {avatar && <AvatarImage src={avatar} alt="" />}
                    <AvatarFallback className="text-xs">
                        {initials(name) || <UserRound className="size-4" />}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-muted-foreground text-xs">{role}</p>
                </div>
                {onEdit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Modifier les informations de ${name}`}
                        onClick={onEdit}
                    >
                        <Pencil />
                        Modifier
                    </Button>
                )}
            </div>
            {(email || phone) && (
                <div className="text-muted-foreground grid gap-1 text-sm">
                    {email && (
                        <a
                            href={`mailto:${email}`}
                            className="hover:text-foreground flex min-w-0 items-center gap-2 underline-offset-4 hover:underline"
                        >
                            <Mail className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{email}</span>
                        </a>
                    )}
                    {phone && (
                        <a
                            href={`tel:${phone}`}
                            className="hover:text-foreground flex items-center gap-2 underline-offset-4 hover:underline"
                        >
                            <Phone className="size-3.5 shrink-0" aria-hidden />
                            {phone}
                        </a>
                    )}
                </div>
            )}
            {profile &&
                (details.length > 0 ? (
                    <dl className="grid gap-1 border-t pt-2 text-sm">
                        {details.map((detail) => (
                            <Detail
                                key={detail.label}
                                label={detail.label}
                                value={detail.value}
                            />
                        ))}
                    </dl>
                ) : (
                    <p className="text-muted-foreground border-t pt-2 text-sm">
                        Aucune information renseignée.
                    </p>
                ))}
        </div>
    );
}

/** Ligne vide d'une catégorie sans personne. */
function Empty({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            {children}
        </p>
    );
}

/**
 * Onglet « Personnes » du dossier : les locataires (jusqu'à deux), les garants
 * repris des listes de documents et les membres qui suivent le dossier
 * (jusqu'à deux). Le second locataire et le second suivi se modifient ici.
 */
export function ClientPeople({
    client,
    guarantors,
    tenantProfiles,
    residencyStatuses,
    employmentStatuses,
}: {
    client: ClientDetail;
    guarantors: ClientGuarantor[];
    /** Détails par emplacement de locataire ; le second n'y est que s'il existe. */
    tenantProfiles: Partial<Record<TenantSlot, TenantProfile>>;
    residencyStatuses: { value: string; label: string }[];
    employmentStatuses: { value: string; label: string }[];
}) {
    const { staff } = usePage().props;
    const [editing, setEditing] = useState(false);
    /** Locataire dont on modifie les détails. */
    const [tenant, setTenant] = useState<TenantSlot | null>(null);
    /** Garant en cours de saisie : `null` fermé, `'new'` à l'ajout. */
    const [guarantor, setGuarantor] = useState<ClientGuarantor | 'new' | null>(
        null,
    );
    const form = useForm({
        assigned_to: client.assignee ? String(client.assignee.id) : '',
        co_first_name: client.co_tenant?.first_name ?? '',
        co_last_name: client.co_tenant?.last_name ?? '',
        co_email: client.co_tenant?.email ?? '',
        co_phone: client.co_tenant?.phone ?? '',
        co_assigned_to: client.co_assignee ? String(client.co_assignee.id) : '',
        // Revenus mensuels nets, saisis en euros et envoyés en centimes.
        income:
            client.income_cents === null
                ? ''
                : String(client.income_cents / 100),
        co_income:
            client.co_tenant?.income_cents == null
                ? ''
                : String(client.co_tenant.income_cents / 100),
    });

    // Les revenus partent en centimes : leurs erreurs arrivent sur ces clés.
    const errors = form.errors as Record<string, string | undefined>;

    const submit = () => {
        form.transform((data) => {
            const values = data as Record<string, string>;
            const { income, co_income: coIncome, ...rest } = values;

            return {
                ...rest,
                income_cents:
                    income === '' ? null : Math.round(Number(income) * 100),
                co_income_cents:
                    coIncome === '' ? null : Math.round(Number(coIncome) * 100),
            };
        });
        form.patch(clientPeople({ lead: client.uuid }).url, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    return (
        <div className="grid gap-8">
            <p className="text-muted-foreground text-sm">
                Les personnes du dossier : locataires, garants et suivi par
                l’équipe.
            </p>

            <RentAffordabilityAlert
                incomeCents={totalIncomeCents([
                    client.income_cents,
                    client.co_tenant?.income_cents,
                    ...guarantors.map((person) => person.income_cents),
                ])}
                rentCents={client.budget_cents}
                currency={client.currency}
            />

            <Group
                title="Locataires"
                hint="Un dossier peut compter deux locataires ; les e-mails partent aux deux."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil />
                        {client.co_tenant
                            ? 'Modifier le second locataire'
                            : 'Ajouter un second locataire'}
                    </Button>
                }
            >
                <PersonCard
                    name={client.name}
                    role="Locataire"
                    email={client.email}
                    phone={client.phone}
                    profile={tenantProfiles.primary}
                    onEdit={() => setTenant('primary')}
                />
                {client.co_tenant?.name ? (
                    <PersonCard
                        name={client.co_tenant.name}
                        role="Second locataire"
                        email={client.co_tenant.email}
                        phone={client.co_tenant.phone}
                        profile={tenantProfiles.co}
                        onEdit={() => setTenant('co')}
                    />
                ) : (
                    <Empty>Aucun second locataire sur ce dossier.</Empty>
                )}
            </Group>

            <Group
                title="Garants"
                hint="Les personnes qui se portent garantes du dossier."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGuarantor('new')}
                    >
                        <Plus />
                        Ajouter un garant
                    </Button>
                }
            >
                {guarantors.length > 0 ? (
                    guarantors.map((person) => (
                        <PersonCard
                            key={person.uuid}
                            name={person.name}
                            role={
                                person.income_cents === null
                                    ? 'Garant'
                                    : `Garant · ${formatMoney(person.income_cents, client.currency)} par mois`
                            }
                            email={person.email}
                            phone={person.phone}
                            onEdit={() => setGuarantor(person)}
                        />
                    ))
                ) : (
                    <Empty>
                        Aucun garant sur ce dossier : ajoutez ses informations.
                    </Empty>
                )}
            </Group>

            <Group
                title="Personnes de suivi"
                hint="Les deux membres reçoivent une copie des e-mails du dossier."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil />
                        {client.assignee
                            ? 'Changer le suivi'
                            : 'Attribuer le dossier'}
                    </Button>
                }
            >
                {client.assignee ? (
                    <PersonCard
                        name={client.assignee.name}
                        role="Suivi principal"
                        avatar={client.assignee.avatar}
                    />
                ) : (
                    <Empty>Dossier non attribué.</Empty>
                )}
                {client.co_assignee ? (
                    <PersonCard
                        name={client.co_assignee.name}
                        role="Second suivi"
                        avatar={client.co_assignee.avatar}
                    />
                ) : (
                    <Empty>Aucun second membre sur le suivi.</Empty>
                )}
            </Group>

            <GuarantorDialog
                clientUuid={client.uuid}
                guarantor={guarantor === 'new' ? null : guarantor}
                open={guarantor !== null}
                onOpenChange={(next) => !next && setGuarantor(null)}
                key={guarantor === 'new' ? 'new' : (guarantor?.uuid ?? 'none')}
            />

            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Personnes du dossier</DialogTitle>
                        <DialogDescription>
                            Second locataire du foyer et second membre de
                            l’équipe sur le dossier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="co-first-name">Prénom</Label>
                                <Input
                                    id="co-first-name"
                                    value={form.data.co_first_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'co_first_name',
                                            event.target.value,
                                        )
                                    }
                                    onBlur={() =>
                                        form.setData(
                                            'co_first_name',
                                            capitalizeName(
                                                form.data.co_first_name,
                                            ),
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.co_first_name}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="co-last-name">Nom</Label>
                                <Input
                                    id="co-last-name"
                                    value={form.data.co_last_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'co_last_name',
                                            event.target.value,
                                        )
                                    }
                                    onBlur={() =>
                                        form.setData(
                                            'co_last_name',
                                            capitalizeName(
                                                form.data.co_last_name,
                                            ),
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.co_last_name}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tenant-income">
                                Revenu mensuel net du locataire
                            </Label>
                            <Input
                                id="tenant-income"
                                type="number"
                                min={0}
                                step={100}
                                inputMode="numeric"
                                placeholder="Ex. 4 500"
                                value={form.data.income}
                                onChange={(event) =>
                                    form.setData('income', event.target.value)
                                }
                            />
                            <InputError message={errors.income_cents} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="co-income">
                                Revenu mensuel net du second locataire
                            </Label>
                            <Input
                                id="co-income"
                                type="number"
                                min={0}
                                step={100}
                                inputMode="numeric"
                                placeholder="Ex. 3 200"
                                value={form.data.co_income}
                                onChange={(event) =>
                                    form.setData(
                                        'co_income',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={errors.co_income_cents} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="co-email">E-mail</Label>
                            <Input
                                id="co-email"
                                type="email"
                                value={form.data.co_email}
                                onChange={(event) =>
                                    form.setData('co_email', event.target.value)
                                }
                            />
                            <InputError message={form.errors.co_email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="co-phone">Téléphone</Label>
                            <PhoneInput
                                id="co-phone"
                                name="co_phone_national"
                                value={form.data.co_phone}
                                onChange={(value) =>
                                    form.setData('co_phone', value)
                                }
                            />
                            <InputError message={form.errors.co_phone} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assigned-to">Suivi principal</Label>
                            <SearchSelect
                                id="assigned-to"
                                value={form.data.assigned_to}
                                onChange={(value) =>
                                    form.setData('assigned_to', value)
                                }
                                placeholder="Choisir un membre"
                                searchPlaceholder="Rechercher un membre…"
                                noResults="Aucun membre ne correspond."
                                emptyLabel="Dossier non attribué"
                                options={staff.map((member) => ({
                                    value: String(member.id),
                                    label: member.name,
                                    hint: member.functions?.join(' · ') ?? null,
                                }))}
                            />
                            <InputError message={form.errors.assigned_to} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="co-assigned-to">
                                Second membre du suivi
                            </Label>
                            <SearchSelect
                                id="co-assigned-to"
                                value={form.data.co_assigned_to}
                                onChange={(value) =>
                                    form.setData('co_assigned_to', value)
                                }
                                placeholder="Choisir un membre"
                                searchPlaceholder="Rechercher un membre…"
                                noResults="Aucun membre ne correspond."
                                emptyLabel="Aucun second membre"
                                options={staff
                                    .filter(
                                        (member) =>
                                            String(member.id) !==
                                            form.data.assigned_to,
                                    )
                                    .map((member) => ({
                                        value: String(member.id),
                                        label: member.name,
                                        hint:
                                            member.functions?.join(' · ') ??
                                            null,
                                    }))}
                            />
                            <InputError message={form.errors.co_assigned_to} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEditing(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={form.processing}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {tenant && tenantProfiles[tenant] && (
                <ClientTenantProfileDialog
                    clientUuid={client.uuid}
                    slot={tenant}
                    profile={tenantProfiles[tenant]}
                    residencyStatuses={residencyStatuses}
                    employmentStatuses={employmentStatuses}
                    open
                    onOpenChange={(value) => !value && setTenant(null)}
                />
            )}
        </div>
    );
}
