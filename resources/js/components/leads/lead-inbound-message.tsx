import { router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    Globe,
    Mail,
    MessageCircle,
    MessageSquareText,
    Phone,
    PhoneIncoming,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { assign as leadAssign, status as leadStatus } from '@/routes/leads';
import type { LeadDetail, LeadInboundMessage as Inbound } from '@/types';

const kinds = {
    website: { icon: Globe, title: 'Message reçu depuis le site' },
    call: { icon: PhoneIncoming, title: 'Résumé de l’appel entrant' },
    sms: { icon: MessageSquareText, title: 'SMS reçu' },
} as const;

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

/** Lien WhatsApp vers un numéro saisi librement (indicatif compris). */
export function whatsAppUrl(phone: string): string {
    return `https://wa.me/${phone.replace(/\D+/g, '')}`;
}

/**
 * Ce que le lead nous a dit en arrivant, mis en avant tant qu'il est à traiter,
 * puis replié sur une ligne. Les boutons répondent par le canal de son choix,
 * « Je m'en occupe » m'attribue le lead et le passe en « En cours ».
 */
export function LeadInboundMessage({
    lead,
    inbound,
    className,
}: {
    lead: LeadDetail;
    inbound: Inbound;
    className?: string;
}) {
    const { auth } = usePage().props;
    const pending = lead.status === 'todo';
    const [open, setOpen] = useState(pending);
    const [claiming, setClaiming] = useState(false);
    const { icon: Icon, title } = kinds[inbound.kind];
    const when = inbound.at ? dateTime.format(new Date(inbound.at)) : null;

    const claim = () => {
        setClaiming(true);
        router.patch(
            leadAssign({ lead: lead.uuid }).url,
            { user_id: auth.user.id },
            {
                preserveScroll: true,
                onError: () => setClaiming(false),
                onSuccess: () =>
                    router.patch(
                        leadStatus({ lead: lead.uuid }).url,
                        { status: 'in_progress' },
                        {
                            preserveScroll: true,
                            onSuccess: () =>
                                notify.success(
                                    'Lead pris en charge, il passe en « En cours ».',
                                ),
                            onFinish: () => setClaiming(false),
                        },
                    ),
            },
        );
    };

    return (
        <section
            aria-label={title}
            data-testid="lead-inbound"
            data-state={open ? 'open' : 'collapsed'}
            className={cn(
                'bg-sidebar border-l-primary grid gap-3 rounded-xl border border-l-4 p-4',
                className,
            )}
        >
            <header className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-medium">{title}</h2>
                        <p className="text-muted-foreground truncate text-xs">
                            {inbound.meta}
                            {when ? ` · ${when}` : ''}
                        </p>
                    </div>
                </div>
                {!pending && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-expanded={open}
                        onClick={() => setOpen((value) => !value)}
                    >
                        {open ? 'Replier' : 'Afficher'}
                        <ChevronDown
                            className={cn(
                                'transition-transform',
                                open && 'rotate-180',
                            )}
                            aria-hidden
                        />
                    </Button>
                )}
            </header>
            {open && (
                <>
                    <blockquote className="text-base/7 whitespace-pre-line">
                        {inbound.body}
                    </blockquote>
                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                        {lead.email && (
                            <Button variant="outline" size="sm" asChild>
                                <a href={`mailto:${lead.email}`}>
                                    <Mail aria-hidden />
                                    Répondre par e-mail
                                </a>
                            </Button>
                        )}
                        {lead.phone && (
                            <>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                                    >
                                        <Phone aria-hidden />
                                        Appeler
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={whatsAppUrl(lead.phone)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <MessageCircle aria-hidden />
                                        WhatsApp
                                    </a>
                                </Button>
                            </>
                        )}
                        {pending && (
                            <Button
                                type="button"
                                size="sm"
                                className="sm:ml-auto"
                                disabled={claiming}
                                onClick={claim}
                            >
                                {claiming ? (
                                    <Spinner />
                                ) : (
                                    <UserCheck aria-hidden />
                                )}
                                Je m’en occupe
                            </Button>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
