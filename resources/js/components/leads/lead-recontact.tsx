import { router } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, ChevronDownIcon, Mail } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { parisFormat } from '@/lib/datetime';
import { formatDate } from '@/lib/format';
import { DEFAULT_TIME, timeSlotsWith } from '@/lib/time-slots';
import { recontactChannelIcons } from '@/lib/recontact-channel-icons';
import { notify } from '@/lib/toast';
import { daysUntil } from '@/lib/lead-urgency';
import { cn } from '@/lib/utils';
import { recontact as leadRecontact, visio as leadVisio } from '@/routes/leads';
import type { LabeledOption, LeadDetail, RecontactChannel } from '@/types';

/** « En retard de 3 j », « Aujourd'hui », « Dans 5 j » ou null sans date. */
export function describeRecontact(dateIso: string | null): {
    label: string;
    late: boolean;
} | null {
    if (dateIso === null) {
        return null;
    }

    // La date seule : `recontact_at` porte désormais l'heure.
    const days = daysUntil(dateIso.slice(0, 10));

    if (days < 0) {
        return { label: `En retard de ${-days} j`, late: true };
    }

    return {
        label: days === 0 ? "Aujourd'hui" : `Dans ${days} j`,
        late: false,
    };
}

const timeFormat = parisFormat({ hour: '2-digit', minute: '2-digit' });

/** Heure proposée : celle du recontact (ou de la visio) déjà prévu, sinon 10:00. */
export function defaultRecontactTime(at: string | null): string {
    return at ? timeFormat.format(new Date(at)) : DEFAULT_TIME;
}

/**
 * Prochain recontact du lead : canal et date, avec un badge de retard, et un
 * modale pour planifier, reporter ou effacer, **toujours avec une heure**
 * (`recontact_at` est une date-heure). Par visio, la modale programme
 * en plus l'appel vidéo
 * (`leads.visio` : agenda du conseiller, lien Meet, invitation au client)
 * au lieu de poser un simple rappel — c'est ce même appel qui met le
 * recontact à « Visio » et sa date.
 */
export function LeadRecontact({
    lead,
    channels,
    open: controlledOpen,
    onOpenChange,
}: {
    lead: LeadDetail;
    channels: LabeledOption<RecontactChannel>[];
    /** Pilotée de l'extérieur (le bandeau « prochain geste » ouvre la même modale). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [ownOpen, setOwnOpen] = useState(false);
    const open = controlledOpen ?? ownOpen;
    const setOpen = (next: boolean) => {
        setOwnOpen(next);
        onOpenChange?.(next);
    };
    const [date, setDate] = useState(lead.recontact_at?.slice(0, 10) ?? '');
    const [channel, setChannel] = useState<RecontactChannel | ''>(
        lead.recontact_channel ?? '',
    );
    const [time, setTime] = useState(
        defaultRecontactTime(lead.recontact_at ?? lead.visio_at),
    );
    const [busy, setBusy] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const isVisio = channel === 'visio';
    const canVisio = Boolean(lead.email);
    // On ne planifie que dans le futur : jours passés grisés, et pour
    // aujourd'hui seulement les créneaux encore à venir.
    const now = new Date();
    const todayIso = format(now, 'yyyy-MM-dd');
    const nowTime = format(now, 'HH:mm');
    const slots = timeSlotsWith(time).filter(
        (slot) => date !== todayIso || slot > nowTime,
    );
    const inPast =
        date !== '' &&
        (date < todayIso || (date === todayIso && time <= nowTime));
    const parsedDate = date ? parseISO(date) : undefined;
    const selectedDate =
        parsedDate && isValid(parsedDate) ? parsedDate : undefined;
    const status = describeRecontact(lead.recontact_at);
    const planned = lead.recontact_at !== null;

    const scheduleVisio = () => {
        setBusy(true);
        const id = notify.loading(
            lead.visio_at
                ? 'Déplacement de la visio…'
                : 'Programmation de la visio…',
            `Invitation à ${lead.email}`,
        );
        router.post(
            leadVisio({ lead: lead.uuid }).url,
            { visio_at: `${date}T${time}` },
            {
                preserveScroll: true,
                onSuccess: () => {
                    notify.resolve(
                        id,
                        lead.visio_at ? 'Visio déplacée' : 'Visio programmée',
                        `Invitation envoyée à ${lead.email}.`,
                    );
                    setOpen(false);
                },
                onError: (errors) =>
                    notify.reject(
                        id,
                        'Visio impossible',
                        Object.values(errors)[0] ?? 'Réessayez.',
                    ),
                onFinish: () => setBusy(false),
            },
        );
    };

    const save = (clear = false) => {
        if (!clear && isVisio) {
            scheduleVisio();

            return;
        }

        setBusy(true);
        router.patch(
            leadRecontact({ lead: lead.uuid }).url,
            clear
                ? { recontact_at: null, recontact_channel: null }
                : {
                      recontact_at: `${date}T${time}`,
                      recontact_channel: channel || null,
                  },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <div className="flex items-end justify-between gap-3 text-sm">
            <div className="grid min-w-0 gap-0.5">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CalendarClock className="size-3.5" aria-hidden />
                    Prochain recontact
                </span>
                {planned ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                        <span className="truncate">
                            {lead.recontact_channel_label
                                ? `${lead.recontact_channel_label} · `
                                : ''}
                            {formatDate((lead.recontact_at ?? '').slice(0, 10))}
                            {lead.recontact_at &&
                                ` à ${timeFormat.format(new Date(lead.recontact_at))}`}
                        </span>
                        {status && (
                            <Badge
                                variant="secondary"
                                data-late={status.late ? 'true' : undefined}
                                className={cn(
                                    'font-medium tabular-nums',
                                    status.late &&
                                        'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
                                )}
                            >
                                {status.label}
                            </Badge>
                        )}
                    </span>
                ) : (
                    <span className="text-muted-foreground">
                        Aucun recontact prévu
                    </span>
                )}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                    >
                        {planned ? 'Reporter' : 'Planifier'}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {planned
                                ? 'Reporter le recontact'
                                : 'Planifier le prochain recontact'}
                        </DialogTitle>
                        <DialogDescription>
                            Le canal, le jour et l’heure. Par visio, l’appel
                            vidéo est programmé et le client invité.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label htmlFor="recontact-channel">Canal</Label>
                        <Select
                            value={channel}
                            onValueChange={(value) =>
                                setChannel(value as RecontactChannel)
                            }
                        >
                            <SelectTrigger
                                id="recontact-channel"
                                className="w-full"
                            >
                                <SelectValue placeholder="Choisir un canal" />
                            </SelectTrigger>
                            <SelectContent>
                                {channels.map((option) => {
                                    const Icon =
                                        recontactChannelIcons[option.value];

                                    return (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            <Icon
                                                className="text-muted-foreground size-4"
                                                aria-hidden
                                            />
                                            {option.label}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="recontact-date">Date</Label>
                        {/* Date picker shadcn : bouton de largeur fixe qui ouvre le calendrier. */}
                        <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    id="recontact-date"
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-between font-normal"
                                >
                                    {selectedDate
                                        ? format(selectedDate, 'd MMMM yyyy', {
                                              locale: fr,
                                          })
                                        : 'Choisir une date'}
                                    <ChevronDownIcon aria-hidden />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto overflow-hidden p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    locale={fr}
                                    disabled={{ before: now }}
                                    selected={selectedDate}
                                    captionLayout="dropdown"
                                    onSelect={(selected) => {
                                        setDate(
                                            selected
                                                ? format(selected, 'yyyy-MM-dd')
                                                : '',
                                        );
                                        setCalendarOpen(false);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="recontact-time">Heure</Label>
                        <Select value={time} onValueChange={setTime}>
                            <SelectTrigger
                                id="recontact-time"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {slots.map((slot) => (
                                    <SelectItem key={slot} value={slot}>
                                        {slot}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {isVisio && (
                        /* Ce que « Programmer la visio » déclenche, en toutes
                           lettres : la modale engage l'agenda d'un collègue et
                           un e-mail au client. */
                        <div
                            role="note"
                            className="bg-sidebar grid gap-1.5 rounded-lg border p-3 text-xs"
                        >
                            {canVisio ? (
                                <>
                                    <p className="flex items-start gap-2">
                                        <CalendarClock
                                            className="mt-0.5 size-3.5 shrink-0"
                                            aria-hidden
                                        />
                                        <span>
                                            L’appel vidéo sera ajouté à l’agenda
                                            de{' '}
                                            <span className="font-medium">
                                                {lead.assignee?.name ??
                                                    'l’équipe (aucun responsable attribué)'}
                                            </span>
                                            , avec le lien Google Meet.
                                        </span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <Mail
                                            className="mt-0.5 size-3.5 shrink-0"
                                            aria-hidden
                                        />
                                        <span>
                                            L’invitation sera envoyée à{' '}
                                            <span className="font-medium">
                                                {lead.email}
                                            </span>
                                            .
                                        </span>
                                    </p>
                                </>
                            ) : (
                                <p>
                                    Ajoutez un e-mail au lead pour programmer un
                                    appel vidéo.
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
                        {planned ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                disabled={busy}
                                onClick={() => save(true)}
                            >
                                Effacer
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                busy ||
                                date === '' ||
                                channel === '' ||
                                inPast ||
                                (isVisio && !canVisio)
                            }
                            onClick={() => save()}
                        >
                            {busy && <Spinner />}
                            {isVisio
                                ? lead.visio_at
                                    ? 'Déplacer la visio'
                                    : 'Programmer la visio'
                                : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
