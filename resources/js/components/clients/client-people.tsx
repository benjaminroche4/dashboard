import { router, useForm, usePage } from '@inertiajs/react';
import {
    Pencil,
    Plus,
    ShieldCheck,
    UserRound,
    UserRoundCheck,
    X,
    type LucideIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { DetailSection } from '@/components/real-estate/detail-header';
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
import { WatcherDialog } from '@/components/clients/watcher-dialog';
import { RentAffordabilityAlert } from '@/components/clients/rent-affordability-alert';
import { formatMoney } from '@/lib/format';
import { totalIncomeCents } from '@/lib/rent-affordability';
import { people as clientPeople } from '@/routes/clients';
import clientWatchers from '@/routes/clients/watchers';
import type {
    ClientDetail,
    ClientGuarantor,
    ClientWatcher,
    TenantProfile,
    TenantSlot,
} from '@/types';

/**
 * Sous-titre d'un garant : ce qu'il fait dans la vie, puis ce qu'il gagne —
 * une agence juge la garantie sur les deux, pas sur le seul montant.
 */
export function guarantorRole(guarantor: ClientGuarantor): string | null {
    return guarantor.occupation ?? guarantor.employment_status_label;
}

/** Initiales d'un nom, pour l'avatar de repli. */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

/**
 * Bloc d'une catégorie de personnes : la carte commune des fiches
 * (`DetailSection`), avec le compte et le bouton d'ajout dans son en-tête.
 */
function Group({
    title,
    count,
    hint,
    action,
    icon,
    children,
}: {
    title: string;
    count: number;
    /** Pictogramme de la catégorie : locataires, garants, suivi. */
    icon?: LucideIcon;
    /** Phrase d'aide, seulement là où elle apprend quelque chose. */
    hint?: string;
    /** Bouton ou lien de la catégorie (ajouter, modifier…). */
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        // Un « 0 » à côté de l'intitulé n'apprend rien : le compte n'apparaît
        // qu'à partir d'une personne.
        <DetailSection
            title={title}
            count={count > 0 ? count : undefined}
            action={action}
            icon={icon}
        >
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            {children}
        </DetailSection>
    );
}

/** Une ligne de détail d'un locataire : libellé discret, puis la valeur. */
function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-2">
            <dt className="text-muted-foreground truncate">{label}</dt>
            <dd className="truncate">{value}</dd>
        </div>
    );
}

/**
 * Une personne du dossier, sur une ligne comme sur les fiches d'annuaire :
 * identité à gauche, coordonnées cliquables alignées à droite, actions au
 * bout ; pour un locataire, ses détails sous un filet.
 */
/**
 * Carte d'une personne du dossier, sur le moule d'une ligne de facture :
 * un bandeau en petites capitales dit ce qu'elle est ici, les actions vivent
 * à droite de ce bandeau, et le chiffre qui la concerne se lit aligné à
 * droite, comme un total de ligne.
 */
/** Revenu mensuel déclaré sur la fiche d'un locataire, mis en forme. */
function income(profile: TenantProfile | undefined, currency: string) {
    return profile?.income_cents == null
        ? null
        : formatMoney(profile.income_cents, currency);
}

function PersonCard({
    overline,
    name,
    subtitle,
    email,
    phone,
    avatar,
    profile,
    amount,
    amountLabel,
    onEdit,
    onRemove,
}: {
    /** Ce que la personne est sur ce dossier (« Locataire », « Garant 1 »…). */
    overline: string;
    name: string;
    subtitle?: string | null;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    /** Renseigné pour un locataire seulement. */
    profile?: TenantProfile;
    /** Chiffre mis en avant à droite (le revenu d'un garant). */
    amount?: string | null;
    amountLabel?: string;
    onEdit?: () => void;
    onRemove?: () => void;
}) {
    const details = profile ? tenantDetails(profile) : [];

    return (
        <li className="bg-sidebar grid gap-4 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                    {overline}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Modifier les informations de ${name}`}
                            onClick={onEdit}
                        >
                            <Pencil aria-hidden />
                        </Button>
                    )}
                    {onRemove && (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Retirer ${name}`}
                            onClick={onRemove}
                        >
                            <X aria-hidden />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="size-9 shrink-0">
                        {avatar && <AvatarImage src={avatar} alt="" />}
                        <AvatarFallback className="text-xs">
                            {initials(name) || <UserRound className="size-4" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 gap-0.5">
                        <span className="truncate font-medium">{name}</span>
                        {subtitle && (
                            <span className="text-muted-foreground truncate text-xs">
                                {subtitle}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-muted-foreground grid gap-0.5 text-xs">
                    {phone && (
                        <a
                            href={`tel:${phone.replace(/\s+/g, '')}`}
                            className="hover:text-foreground tabular-nums underline-offset-4 hover:underline"
                        >
                            {phone}
                        </a>
                    )}
                    {email && (
                        <a
                            href={`mailto:${email}`}
                            className="hover:text-foreground max-w-64 truncate underline-offset-4 hover:underline"
                        >
                            {email}
                        </a>
                    )}
                </div>
                {amount !== undefined && amount !== null && (
                    /* Le chiffre se lit à droite, comme le total d'une ligne. */
                    <div className="grid gap-1.5 text-right">
                        <span className="text-muted-foreground text-sm">
                            {amountLabel}
                        </span>
                        <span className="font-medium tabular-nums">
                            {amount}
                        </span>
                    </div>
                )}
            </div>

            {profile && (
                <div className="border-t pt-3 text-xs">
                    {details.length > 0 ? (
                        <dl className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
                            {details.map((detail) => (
                                <Detail
                                    key={detail.label}
                                    label={detail.label}
                                    value={detail.value}
                                />
                            ))}
                        </dl>
                    ) : (
                        <p className="text-muted-foreground">
                            Aucune information renseignée.
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}

/** Liste des personnes d'une catégorie, ou la phrase qui dit qu'il n'y en a pas. */
function People({
    empty,
    children,
}: {
    empty: string;
    children: React.ReactNode;
}) {
    const rows = React.Children.toArray(children).filter(Boolean);

    return rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
    ) : (
        <ul role="list" className="grid gap-3">
            {rows}
        </ul>
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
    watchers = [],
    tenantProfiles,
    residencyStatuses,
    employmentStatuses,
}: {
    client: ClientDetail;
    guarantors: ClientGuarantor[];
    /** Personnes en copie des e-mails du dossier. */
    watchers?: ClientWatcher[];
    /** Détails par emplacement de locataire ; le second n'y est que s'il existe. */
    tenantProfiles: Partial<Record<TenantSlot, TenantProfile>>;
    residencyStatuses: { value: string; label: string }[];
    employmentStatuses: { value: string; label: string }[];
}) {
    const { staff } = usePage().props;
    const [editing, setEditing] = useState(false);
    const [watcher, setWatcher] = useState<ClientWatcher | 'new' | null>(null);
    const removeWatcher = (person: ClientWatcher) =>
        router.delete(
            clientWatchers.destroy({ lead: client.uuid, watcher: person.uuid })
                .url,
            { preserveScroll: true },
        );
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
    });

    const submit = () => {
        form.patch(clientPeople({ lead: client.uuid }).url, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    return (
        <div className="grid gap-4">
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
                icon={UserRound}
                title="Locataires"
                count={client.co_tenant?.name ? 2 : 1}
                hint="Les e-mails du dossier partent aux deux locataires."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil aria-hidden />
                        {client.co_tenant
                            ? 'Modifier le second locataire'
                            : 'Ajouter un second locataire'}
                    </Button>
                }
            >
                <People empty="Aucun locataire sur ce dossier.">
                    {/* Statut professionnel sous le nom et revenu à droite :
                        ce qui décide d'un dossier de location se lit d'abord. */}
                    <PersonCard
                        key="primary"
                        overline="Locataire"
                        name={client.name}
                        subtitle={tenantProfiles.primary?.employment_label}
                        email={client.email}
                        phone={client.phone}
                        profile={tenantProfiles.primary}
                        amountLabel="Revenu mensuel"
                        amount={income(tenantProfiles.primary, client.currency)}
                        onEdit={() => setTenant('primary')}
                    />
                    {client.co_tenant?.name ? (
                        <PersonCard
                            key="co"
                            overline="Second locataire"
                            name={client.co_tenant.name}
                            subtitle={tenantProfiles.co?.employment_label}
                            email={client.co_tenant.email}
                            phone={client.co_tenant.phone}
                            profile={tenantProfiles.co}
                            amountLabel="Revenu mensuel"
                            amount={income(tenantProfiles.co, client.currency)}
                            onEdit={() => setTenant('co')}
                        />
                    ) : null}
                </People>
            </Group>

            <Group
                icon={ShieldCheck}
                title="Garants"
                count={guarantors.length}
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGuarantor('new')}
                    >
                        <Plus aria-hidden />
                        Ajouter un garant
                    </Button>
                }
            >
                <People empty="Aucun garant sur ce dossier.">
                    {guarantors.map((person, index) => (
                        <PersonCard
                            key={person.uuid}
                            overline={`Garant ${index + 1}`}
                            name={person.name}
                            subtitle={guarantorRole(person)}
                            email={person.email}
                            phone={person.phone}
                            amountLabel="Revenu mensuel"
                            amount={
                                person.income_cents === null
                                    ? null
                                    : formatMoney(
                                          person.income_cents,
                                          client.currency,
                                      )
                            }
                            onEdit={() => setGuarantor(person)}
                        />
                    ))}
                </People>
            </Group>

            <Group
                icon={UserRoundCheck}
                title="Personnes de suivi"
                count={watchers.length}
                hint="Des proches ou des contacts du client, en copie des e-mails du dossier."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWatcher('new')}
                    >
                        <Plus aria-hidden />
                        Ajouter une personne
                    </Button>
                }
            >
                <People empty="Personne en copie pour l’instant.">
                    {watchers.map((person) => (
                        <PersonCard
                            key={person.uuid}
                            overline="Personne de suivi"
                            name={person.name}
                            subtitle={person.role ?? 'En copie des e-mails'}
                            email={person.email}
                            phone={person.phone}
                            onEdit={() => setWatcher(person)}
                            onRemove={() => removeWatcher(person)}
                        />
                    ))}
                </People>
            </Group>

            <WatcherDialog
                clientUuid={client.uuid}
                watcher={watcher === 'new' ? null : watcher}
                open={watcher !== null}
                onOpenChange={(next) => !next && setWatcher(null)}
                key={watcher === 'new' ? 'new' : (watcher?.uuid ?? 'none')}
            />

            <GuarantorDialog
                clientUuid={client.uuid}
                guarantor={guarantor === 'new' ? null : guarantor}
                employmentStatuses={employmentStatuses}
                open={guarantor !== null}
                onOpenChange={(next) => !next && setGuarantor(null)}
                key={guarantor === 'new' ? 'new' : (guarantor?.uuid ?? 'none')}
            />

            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Personnes du dossier</DialogTitle>
                        <DialogDescription>
                            Second locataire du foyer et membre de l’équipe qui
                            suit le dossier.
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
