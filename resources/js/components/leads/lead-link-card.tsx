import { Link } from '@inertiajs/react';
import {
    Check,
    FolderOpen,
    Handshake,
    Link2,
    Unlink,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { show as clientShow } from '@/routes/clients';
import { search as leadsSearch, show as leadShow } from '@/routes/leads';
import {
    search as partnersSearch,
    show as partnerShow,
} from '@/routes/partners';
import type { LinkedPartner } from '@/types';

type LeadHit = { id: number; name: string; email: string | null };
type PartnerHit = {
    id: number;
    uuid: string;
    name: string;
    type_label: string;
    contact: string | null;
};

/** Lead (ou dossier client) rattaché à un document. */
export type LinkedLead = {
    id: number;
    uuid: string;
    name: string;
    /** Lead converti : c'est un dossier client, il s'ouvre comme tel. */
    is_client: boolean;
};

/** Recherche à deux sources, relancée à la frappe. */
function useSubjectSearch(query: string) {
    const [leads, setLeads] = useState<LeadHit[]>([]);
    const [partners, setPartners] = useState<PartnerHit[]>([]);

    useEffect(() => {
        const needle = query.trim();

        if (needle.length < 2) {
            setLeads([]);
            setPartners([]);

            return;
        }

        const controller = new AbortController();
        const fetchJson = (url: string) =>
            fetch(url, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => (response.ok ? response.json() : []))
                .catch(() => []);
        const timer = setTimeout(() => {
            // Une source fermée par les droits ne doit pas masquer l'autre.
            void fetchJson(leadsSearch({ query: { q: needle } }).url).then(
                (data: LeadHit[]) => setLeads(Array.isArray(data) ? data : []),
            );
            void fetchJson(partnersSearch({ query: { q: needle } }).url).then(
                (data: PartnerHit[]) =>
                    setPartners(Array.isArray(data) ? data : []),
            );
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return { leads, partners };
}

/**
 * Carte « Rattaché à » d'un devis, d'une facture ou d'une liste de pièces : le
 * document est adressé à un lead (ou à son dossier client) ou à un partenaire,
 * jamais aux deux. Lien vers la fiche, recherche dans les deux annuaires et
 * détachement ; le rattachement lui-même est confié à l'appelant, qui connaît
 * sa route.
 */
export function LeadLinkCard({
    lead,
    partner = null,
    canEdit,
    busy = false,
    onLink,
    onLinkPartner,
}: {
    lead: LinkedLead | null;
    partner?: LinkedPartner | null;
    canEdit: boolean;
    busy?: boolean;
    /** `null` détache. */
    onLink: (leadId: number | null, done: () => void) => void;
    /** `null` détache. Absent : le document ne se rattache qu'à un lead. */
    onLinkPartner?: (partnerId: number | null, done: () => void) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const { leads, partners } = useSubjectSearch(query);
    const withPartners = onLinkPartner !== undefined;
    const close = () => {
        setOpen(false);
        setQuery('');
    };
    const detach = () =>
        partner && withPartners
            ? onLinkPartner(null, () => undefined)
            : onLink(null, () => undefined);

    return (
        <section
            aria-label={withPartners ? 'Rattachement' : 'Lead ou client'}
            className="grid gap-2"
        >
            <h2 className="text-base font-medium">
                {withPartners ? 'Rattaché à' : 'Lead ou client'}
            </h2>
            {lead || partner ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    {lead ? (
                        <Link
                            href={
                                lead.is_client
                                    ? clientShow({ lead: lead.uuid })
                                    : leadShow({ lead: lead.uuid })
                            }
                            className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                        >
                            {lead.is_client ? (
                                <FolderOpen
                                    className="text-muted-foreground size-4"
                                    aria-hidden
                                />
                            ) : (
                                <UserRound
                                    className="text-muted-foreground size-4"
                                    aria-hidden
                                />
                            )}
                            {lead.name}
                            <span className="text-muted-foreground font-normal">
                                {lead.is_client ? '· dossier client' : '· lead'}
                            </span>
                        </Link>
                    ) : (
                        partner && (
                            <Link
                                href={partnerShow({ partner: partner.uuid })}
                                className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                            >
                                <Handshake
                                    className="text-muted-foreground size-4"
                                    aria-hidden
                                />
                                {partner.name}
                                <span className="text-muted-foreground font-normal">
                                    · {partner.type_label.toLowerCase()}
                                </span>
                            </Link>
                        )
                    )}
                    {canEdit && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={detach}
                        >
                            <Unlink aria-hidden />
                            Détacher
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">
                    {withPartners
                        ? 'Aucun lead, dossier client ni partenaire rattaché.'
                        : 'Aucun lead ni dossier client rattaché.'}
                </p>
            )}
            {canEdit && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-fit"
                        >
                            <Link2 aria-hidden />
                            {lead || partner
                                ? 'Changer'
                                : withPartners
                                  ? 'Lier à un lead, un client ou un partenaire'
                                  : 'Lier à un lead ou un client'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Nom, e-mail ou téléphone…"
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {query.trim().length < 2
                                        ? 'Tapez au moins deux caractères.'
                                        : withPartners
                                          ? 'Aucun lead, client ni partenaire trouvé.'
                                          : 'Aucun lead ni client trouvé.'}
                                </CommandEmpty>
                                {leads.length > 0 && (
                                    <CommandGroup
                                        heading={
                                            withPartners
                                                ? 'Leads et clients'
                                                : undefined
                                        }
                                    >
                                        {leads.map((hit) => (
                                            <CommandItem
                                                key={`lead-${hit.id}`}
                                                value={`lead-${hit.id}`}
                                                onSelect={() =>
                                                    onLink(hit.id, close)
                                                }
                                            >
                                                <span className="grid min-w-0">
                                                    <span className="truncate font-medium">
                                                        {hit.name}
                                                    </span>
                                                    {hit.email && (
                                                        <span className="text-muted-foreground truncate text-xs">
                                                            {hit.email}
                                                        </span>
                                                    )}
                                                </span>
                                                {lead?.id === hit.id && (
                                                    <Check
                                                        className="ml-auto size-4"
                                                        aria-hidden
                                                    />
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                {withPartners && partners.length > 0 && (
                                    <CommandGroup heading="Partenaires">
                                        {partners.map((hit) => (
                                            <CommandItem
                                                key={`partner-${hit.id}`}
                                                value={`partner-${hit.id}`}
                                                onSelect={() =>
                                                    onLinkPartner(hit.id, close)
                                                }
                                            >
                                                <Handshake
                                                    className="text-muted-foreground size-4 shrink-0"
                                                    aria-hidden
                                                />
                                                <span className="grid min-w-0">
                                                    <span className="truncate font-medium">
                                                        {hit.name}
                                                    </span>
                                                    <span className="text-muted-foreground truncate text-xs">
                                                        {hit.contact
                                                            ? `${hit.type_label} · ${hit.contact}`
                                                            : hit.type_label}
                                                    </span>
                                                </span>
                                                {partner?.uuid === hit.uuid && (
                                                    <Check
                                                        className="ml-auto size-4"
                                                        aria-hidden
                                                    />
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </section>
    );
}
