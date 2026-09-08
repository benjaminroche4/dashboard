import { Head } from '@inertiajs/react';
import { Globe, Mail, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { PartnerTypeBadge } from '@/components/partners/columns';
import {
    PartnerContacts,
    PartnerLeads,
} from '@/components/partners/partner-contacts';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailRow,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Button } from '@/components/ui/button';
import {
    destroy as partnerDestroy,
    index as partnersIndex,
} from '@/routes/partners';
import type { PartnerDetail, PartnerTypeOption } from '@/types';

type Props = {
    partner: PartnerDetail;
    types: PartnerTypeOption[];
};

export default function PartnerShow({ partner, types }: Props) {
    const [editing, setEditing] = useState(false);
    const address = formatAddress(partner);

    return (
        <>
            <Head title={`Partenaire ${partner.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={partner.name}
                    subtitle={
                        <>
                            <PartnerTypeBadge
                                type={partner.type}
                                label={partner.type_label}
                            />
                            {partner.website && (
                                <a
                                    href={partner.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <Globe className="size-3.5" aria-hidden />
                                    {partner.website.replace(
                                        /^https?:\/\//,
                                        '',
                                    )}
                                </a>
                            )}
                        </>
                    }
                    creator={partner.creator}
                    creatorAvatar={partner.creator_avatar}
                    createdAt={partner.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={partnerDestroy({ partner: partner.uuid }).url}
                    deleteTitle={`Supprimer le partenaire ${partner.name} ?`}
                    deleteDescription="Sa fiche sera effacée. Cette action est irréversible."
                    tone="bg-muted text-muted-foreground"
                    backHref={partnersIndex().url}
                    backLabel="Tous les partenaires"
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="divide-y">
                        <DetailSection title="Coordonnées">
                            <dl className="grid gap-3">
                                <DetailRow label="Téléphone">
                                    {partner.phone ? (
                                        <a
                                            href={`tel:${partner.phone.replace(/\s+/g, '')}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {partner.phone}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="E-mail">
                                    {partner.email ? (
                                        <a
                                            href={`mailto:${partner.email}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {partner.email}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Site web">
                                    {partner.website ? (
                                        <a
                                            href={partner.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {partner.website}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Adresse">
                                    {address ?? missingValue}
                                </DetailRow>
                            </dl>
                        </DetailSection>
                        <PartnerContacts
                            partnerUuid={partner.uuid}
                            contacts={partner.contacts}
                        />
                        <DetailSection title="Notes">
                            {partner.notes ? (
                                <p className="text-sm/6 whitespace-pre-line">
                                    {partner.notes}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucune note.
                                </p>
                            )}
                        </DetailSection>
                    </div>
                    <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                        <PartnerLeads leads={partner.leads} />
                        <section
                            aria-label="Joindre le partenaire"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="text-base font-medium">
                                Joindre{' '}
                                {partner.contacts[0]?.name ?? partner.name}
                            </h2>
                            {partner.phone || partner.email ? (
                                <div className="flex flex-wrap gap-2">
                                    {partner.phone && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`tel:${partner.phone.replace(/\s+/g, '')}`}
                                                >
                                                    <Phone aria-hidden />
                                                    Appeler
                                                </a>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`https://wa.me/${partner.phone.replace(/\D+/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <MessageCircle
                                                        aria-hidden
                                                    />
                                                    WhatsApp
                                                </a>
                                            </Button>
                                        </>
                                    )}
                                    {partner.email && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <a href={`mailto:${partner.email}`}>
                                                <Mail aria-hidden />
                                                Écrire
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucune coordonnée enregistrée.
                                </p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
            <PartnerDialog
                open={editing}
                onOpenChange={setEditing}
                types={types}
                partner={partner}
            />
        </>
    );
}

PartnerShow.layout = {
    breadcrumbs: [
        { title: 'Partenaires', href: partnersIndex() },
        { title: 'Détail', href: '#' },
    ],
};
