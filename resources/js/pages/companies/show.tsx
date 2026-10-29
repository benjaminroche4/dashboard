import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Contact,
    Globe,
    Home,
    Mail,
    NotebookPen,
    Phone,
    Send,
    TriangleAlert,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { AddressMap } from '@/components/address-map-dialog';
import { ClampedText } from '@/components/clamped-text';
import { CompanyClients } from '@/components/companies/company-clients';
import { CompanyContacts } from '@/components/companies/company-contacts';
import { CompanyDialog } from '@/components/companies/company-dialog';
import {
    CompanyFollowUpDialog,
    followUpRecipients,
} from '@/components/companies/company-follow-up-dialog';
import {
    CompanyLogoMenuItem,
    CompanyLogoTile,
} from '@/components/companies/company-logo-upload';
import { CreatedBy } from '@/components/created-by';
import { InlineField, type InlineValue } from '@/components/inline-field';
import { Rows, Section, type Fact } from '@/components/leads/lead-show-body';
import { formatAddress } from '@/components/real-estate/columns';
import { missingValue } from '@/components/real-estate/detail-header';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { notify } from '@/lib/toast';
import {
    destroy as companyDestroy,
    fields as companyFields,
    index as companiesIndex,
    show as companyShow,
} from '@/routes/companies';
import type {
    CompanyClientOption,
    CompanyDetail,
    CompanyDuplicate,
} from '@/types';

type Props = {
    company: CompanyDetail;
    /** Dossiers clients encore libres, pour « Rattacher un client ». */
    clientOptions?: CompanyClientOption[];
    /** Entreprises qui partagent l'e-mail ou le téléphone. */
    duplicates?: CompanyDuplicate[];
};

/** Valeur d'une ligne de contact : lien cliquable, texte, ou « Non renseigné ». */
function contactValue(
    value: string | null | undefined,
    href: string | null,
    external = false,
) {
    if (!value) {
        return missingValue;
    }

    return href ? (
        <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="underline-offset-4 hover:underline"
        >
            {value}
        </a>
    ) : (
        value
    );
}

/**
 * Fiche d'une entreprise, **sur le moule des fiches agent, agence et
 * partenaire** (29 octobre 2026) : deux moitiés égales séparées d'un filet. À
 * gauche, l'alerte doublons, l'en-tête gris (pastille-logo, nom, contacts et
 * dossiers, site, « Ajouté(e) par », menu « ⋯ » avec Modifier, « Envoyer un
 * e-mail » et le retrait du logo), le contact en lignes deux par deux
 * modifiables en place (`companies.fields`) avec l'adresse en une ligne
 * Google Places, puis les notes modifiables. À droite, les contacts et les
 * dossiers clients en accordéons.
 */
export default function CompanyShow({
    company,
    clientOptions = [],
    duplicates = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const [writing, setWriting] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { features } = usePage().props;
    const address = formatAddress(company);
    // L'entreprise et ses contacts : les seules adresses possibles.
    const recipients = followUpRecipients(company, company.contacts);
    const saveField = (name: string, value: InlineValue) => {
        setSavingField(name);
        setFieldErrors({});
        router.patch(
            companyFields({ company: company.uuid }).url,
            // Un champ composé (l'adresse) envoie ses trois colonnes.
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : { [name]: value },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ??
                        'Le champ n’a pas pu être enregistré.';
                    setFieldErrors({ [name]: message });
                    notify.error('Modification refusée', message);
                },
                onFinish: () => setSavingField(null),
            },
        );
    };

    const contact: Fact[] = [
        {
            label: 'Téléphone',
            icon: <Phone className="size-3.5" aria-hidden />,
            value: contactValue(
                company.phone,
                company.phone
                    ? `tel:${company.phone.replace(/\s+/g, '')}`
                    : null,
            ),
            edit: { name: 'phone', kind: 'text', value: company.phone },
        },
        {
            label: 'E-mail',
            icon: <Mail className="size-3.5" aria-hidden />,
            value: contactValue(
                company.email,
                company.email ? `mailto:${company.email}` : null,
            ),
            edit: { name: 'email', kind: 'text', value: company.email },
        },
        {
            label: 'Site web',
            icon: <Globe className="size-3.5" aria-hidden />,
            value: contactValue(
                company.website?.replace(/^https?:\/\//, ''),
                company.website,
                true,
            ),
            edit: {
                name: 'website',
                kind: 'text',
                value: company.website,
                placeholder: 'https://',
            },
        },
        {
            label: 'Adresse',
            icon: <Home className="size-3.5" aria-hidden />,
            value: address ?? missingValue,
            edit: {
                name: 'address',
                kind: 'postal_address',
                street: company.street,
                postalCode: company.postal_code,
                city: company.city,
                enabled: features.addressAutocomplete,
            },
        },
    ];

    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="company-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                <CompanyLogoTile company={company} />
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-medium">
                        {company.name}
                    </h1>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                            <Users className="size-3.5" aria-hidden />
                            {company.primary_contacts_count} contact(s)
                            principal(aux) · {company.clients.length} dossier(s)
                            client(s)
                        </span>
                        {company.website && (
                            <>
                                <span>·</span>
                                <a
                                    href={company.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <Globe className="size-3.5" aria-hidden />
                                    {company.website.replace(
                                        /^https?:\/\//,
                                        '',
                                    )}
                                </a>
                            </>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                        <CreatedBy
                            name={company.creator}
                            avatar={company.creator_avatar}
                            date={company.created_at}
                            verb="Ajouté(e) par"
                        />
                    </p>
                </div>
            </div>
            {/* Toutes les actions dans le menu « ⋯ », comme sur les autres fiches. */}
            <RealEstateRowActions
                triggerVariant="outline"
                name={company.name}
                deleteUrl={companyDestroy({ company: company.uuid }).url}
                deleteTitle={`Supprimer l’entreprise ${company.name} ?`}
                deleteDescription="Sa fiche et ses contacts seront effacés. Les dossiers clients rattachés sont conservés. Cette action est irréversible."
                onEdit={() => setEditing(true)}
                extra={
                    <>
                        {recipients.length > 0 && (
                            <DropdownMenuItem onSelect={() => setWriting(true)}>
                                <Send aria-hidden />
                                Envoyer un e-mail
                            </DropdownMenuItem>
                        )}
                        <CompanyLogoMenuItem company={company} />
                    </>
                }
            />
        </div>
    );

    return (
        <>
            <Head title={`Entreprise ${company.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-10 lg:pb-0">
                <div
                    className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
                    data-testid="company-columns"
                >
                    {/* L'entreprise et ce qu'on en sait. */}
                    <div className="grid content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3">
                        {duplicates.length > 0 && (
                            <Alert variant="warning">
                                <TriangleAlert aria-hidden />
                                <AlertTitle>
                                    {duplicates.length > 1
                                        ? 'D’autres entreprises partagent ce contact'
                                        : 'Une autre entreprise partage ce contact'}
                                </AlertTitle>
                                <AlertDescription>
                                    <ul role="list" className="grid gap-0.5">
                                        {duplicates.map((duplicate) => (
                                            <li key={duplicate.uuid}>
                                                <Link
                                                    href={companyShow({
                                                        company: duplicate.uuid,
                                                    })}
                                                    className="font-medium underline-offset-4 hover:underline"
                                                >
                                                    {duplicate.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                        {header}
                        <div>
                            <Section
                                title="Contact"
                                icon={Contact}
                                className="border-b pb-6 last:pb-6"
                            >
                                <AddressMap
                                    place={{
                                        name: company.name,
                                        address,
                                        street: company.street,
                                        latitude: null,
                                        longitude: null,
                                    }}
                                />
                                <Rows
                                    facts={contact}
                                    columns={2}
                                    onSave={saveField}
                                    saving={savingField}
                                    errors={fieldErrors}
                                />
                            </Section>
                            {/* Les notes libres, modifiables en place ; une
                                entreprise n'a pas de suivi d'échanges daté. */}
                            <Section title="Notes" icon={NotebookPen}>
                                <InlineField
                                    label="Notes"
                                    display={
                                        company.notes ? (
                                            <ClampedText
                                                text={company.notes}
                                                className="text-sm/6"
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Aucune note.
                                            </span>
                                        )
                                    }
                                    edit={{
                                        kind: 'textarea',
                                        value: company.notes,
                                        placeholder:
                                            'Accord cadre, interlocuteurs RH, habitudes…',
                                    }}
                                    saving={savingField === 'notes'}
                                    error={fieldErrors.notes}
                                    onSave={(value) =>
                                        saveField('notes', value)
                                    }
                                />
                            </Section>
                        </div>
                    </div>
                    {/* Ses contacts et ses dossiers. */}
                    <div className="grid min-w-0 content-start lg:pb-10 lg:pl-8">
                        <div className="divide-y">
                            <CompanyContacts
                                companyUuid={company.uuid}
                                contacts={company.contacts}
                            />
                            <CompanyClients
                                companyUuid={company.uuid}
                                clients={company.clients}
                                options={clientOptions}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <CompanyDialog
                open={editing}
                onOpenChange={setEditing}
                company={company}
            />
            <CompanyFollowUpDialog
                companyUuid={company.uuid}
                recipients={recipients}
                open={writing}
                onOpenChange={setWriting}
            />
        </>
    );
}

CompanyShow.layout = {
    breadcrumbs: [
        { title: 'Entreprises', href: companiesIndex() },
        { title: 'Détail', href: '#' },
    ],
};
