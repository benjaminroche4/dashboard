import { Head, Link } from '@inertiajs/react';
import { Globe, Send, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { ActivityFeed } from '@/components/activity/activity-feed';
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
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    destroy as companyDestroy,
    index as companiesIndex,
    show as companyShow,
} from '@/routes/companies';
import type {
    Activity,
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
    /** Journal : les dernières actions du backoffice sur cette entreprise. */
    activities?: Activity[];
};

export default function CompanyShow({
    company,
    clientOptions = [],
    duplicates = [],
    activities = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const [writing, setWriting] = useState(false);
    const address = formatAddress(company);
    // L'entreprise et ses contacts : les seules adresses possibles.
    const recipients = followUpRecipients(company, company.contacts);

    const rows = [
        {
            label: 'Téléphone',
            value: company.phone,
            href: company.phone
                ? `tel:${company.phone.replace(/\s+/g, '')}`
                : null,
        },
        {
            label: 'E-mail',
            value: company.email,
            href: company.email ? `mailto:${company.email}` : null,
        },
        {
            label: 'Site web',
            value: company.website?.replace(/^https?:\/\//, '') ?? null,
            href: company.website,
            external: true,
        },
        { label: 'Adresse', value: address, href: null },
    ];

    return (
        <>
            <Head title={`Entreprise ${company.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={company.name}
                    avatar={<CompanyLogoTile company={company} />}
                    menu={<CompanyLogoMenuItem company={company} />}
                    subtitle={
                        <>
                            <span className="tabular-nums">
                                {company.primary_contacts_count} contact(s)
                                principal(aux) · {company.clients.length}{' '}
                                dossier(s) client(s)
                            </span>
                            {company.website && (
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
                            )}
                        </>
                    }
                    creator={company.creator}
                    creatorAvatar={company.creator_avatar}
                    createdAt={company.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={companyDestroy({ company: company.uuid }).url}
                    deleteTitle={`Supprimer l’entreprise ${company.name} ?`}
                    deleteDescription="Sa fiche et ses contacts seront effacés. Les dossiers clients rattachés sont conservés. Cette action est irréversible."
                    tone="bg-muted text-muted-foreground"
                    actions={
                        <>
                            {recipients.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setWriting(true)}
                                >
                                    <Send aria-hidden />
                                    Envoyer un e-mail
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6">
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
                        <DetailSection title="Coordonnées">
                            <dl className="divide-border grid divide-y text-sm">
                                {rows.map((row) => (
                                    <div
                                        key={row.label}
                                        className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                                    >
                                        <dt className="text-muted-foreground">
                                            {row.label}
                                        </dt>
                                        <dd className="break-words">
                                            {row.value ? (
                                                row.href ? (
                                                    <a
                                                        href={row.href}
                                                        {...(row.external
                                                            ? {
                                                                  target: '_blank',
                                                                  rel: 'noreferrer',
                                                              }
                                                            : {})}
                                                        className="underline-offset-4 hover:underline"
                                                    >
                                                        {row.value}
                                                    </a>
                                                ) : (
                                                    row.value
                                                )
                                            ) : (
                                                missingValue
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </DetailSection>
                        <CompanyContacts
                            companyUuid={company.uuid}
                            contacts={company.contacts}
                        />
                    </div>
                    <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                        <CompanyClients
                            companyUuid={company.uuid}
                            clients={company.clients}
                            options={clientOptions}
                        />
                        {company.notes && (
                            <DetailSection title="Notes">
                                <p className="text-sm whitespace-pre-line">
                                    {company.notes}
                                </p>
                            </DetailSection>
                        )}
                        {activities.length > 0 && (
                            <ActivityFeed
                                groups={[
                                    {
                                        label: 'Dernières actions',
                                        items: activities,
                                    },
                                ]}
                                collapseAfter={5}
                            />
                        )}
                    </aside>
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
