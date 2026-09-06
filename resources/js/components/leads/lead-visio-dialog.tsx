import { router } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    CalendarClock,
    ChevronDownIcon,
    ExternalLink,
    Video,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { visio } from '@/routes/leads';
import type { LeadDetail } from '@/types';

export const VISIO_DURATION_MINUTES = 20;

/** Créneaux proposés : de 08:00 à 20:00 par quart d'heure. */
export const VISIO_TIME_SLOTS: string[] = Array.from(
    { length: 12 * 4 + 1 },
    (_, index) => {
        const minutes = 8 * 60 + index * 15;
        const pad = (n: number) => String(n).padStart(2, '0');

        return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    },
);

/** « AAAA-MM-JJTHH:MM » pour un champ datetime-local, en heure locale. */
export function toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Créneau proposé par défaut : le prochain jour ouvré à 10h00. */
export function defaultSlot(now = new Date()): string {
    const slot = new Date(now);
    slot.setDate(slot.getDate() + 1);
    slot.setHours(10, 0, 0, 0);

    while (slot.getDay() === 0 || slot.getDay() === 6) {
        slot.setDate(slot.getDate() + 1);
    }

    return toLocalInput(slot);
}

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
});

/**
 * Programmer, ou déplacer, l'appel vidéo avec le lead : une modale avec la
 * date et l'heure, puis l'invitation part (agenda du conseiller + e-mail au
 * lead avec le lien Meet). Affiche le rendez-vous en cours et le lien Meet.
 */
export function LeadVisioDialog({
    lead,
    className,
}: {
    lead: LeadDetail;
    className?: string;
}) {
    const scheduled = lead.visio_at !== null;
    const [open, setOpen] = useState(false);
    // Date (calendrier) et heure (champ heure) séparées, assemblées à l'envoi.
    const [initialDate = '', initialTime = ''] = (
        lead.visio_at ? toLocalInput(new Date(lead.visio_at)) : defaultSlot()
    ).split('T');
    const [datePart, setDatePart] = useState(initialDate);
    const [timePart, setTimePart] = useState(initialTime);
    const value = datePart && timePart ? `${datePart}T${timePart}` : '';
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const canSend = Boolean(lead.email);
    const parsedDate = datePart ? parseISO(datePart) : undefined;
    const selectedDate =
        parsedDate && isValid(parsedDate) ? parsedDate : undefined;

    const submit = () => {
        if (value === '' || new Date(value).getTime() <= Date.now()) {
            setError('Choisissez une date dans le futur.');

            return;
        }

        setError(null);
        const id = notify.loading(
            scheduled
                ? 'Déplacement de la visio…'
                : 'Programmation de la visio…',
            `Invitation à ${lead.email}`,
        );
        router.post(
            visio({ lead: lead.id }).url,
            { visio_at: value },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    notify.resolve(
                        id,
                        scheduled ? 'Visio déplacée' : 'Visio programmée',
                        `Invitation envoyée à ${lead.email}.`,
                    );
                    setOpen(false);
                },
                onError: (errors) => {
                    const message = Object.values(errors)[0] ?? 'Réessayez.';
                    setError(message);
                    notify.reject(id, 'Visio impossible', message);
                },
            },
        );
    };

    return (
        <div className={cn('grid gap-2', className)}>
            {scheduled && lead.visio_at && (
                <div
                    className="bg-background grid gap-1 rounded-lg border p-3 text-sm"
                    data-test="visio-summary"
                >
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <CalendarClock className="size-3.5" aria-hidden />
                        Appel vidéo prévu
                    </span>
                    <span className="font-medium capitalize">
                        {dateTime.format(new Date(lead.visio_at))}
                    </span>
                    {lead.visio_meet_link && (
                        <a
                            href={lead.visio_meet_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                        >
                            <ExternalLink className="size-3" aria-hidden />
                            Rejoindre sur Google Meet
                        </a>
                    )}
                </div>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={!canSend}
                        title={
                            canSend
                                ? undefined
                                : 'Ajoutez un e-mail au lead pour lui envoyer une invitation.'
                        }
                    >
                        <Video aria-hidden />
                        {scheduled
                            ? 'Déplacer la visio'
                            : 'Programmer une visio'}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {scheduled
                                ? 'Déplacer la visio'
                                : 'Programmer une visio'}
                        </DialogTitle>
                        <DialogDescription>
                            Appel Google Meet de {VISIO_DURATION_MINUTES} min
                            ajouté à l'agenda du conseiller. {lead.first_name}{' '}
                            reçoit l'invitation par e-mail, dans sa langue.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <div className="flex flex-wrap gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="visio_date">Date</Label>
                                {/* Date picker shadcn : bouton de largeur fixe qui ouvre le calendrier. */}
                                <Popover
                                    open={calendarOpen}
                                    onOpenChange={setCalendarOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="visio_date"
                                            type="button"
                                            variant="outline"
                                            aria-invalid={error !== null}
                                            className="w-48 justify-between font-normal"
                                        >
                                            {selectedDate
                                                ? format(
                                                      selectedDate,
                                                      'd MMMM yyyy',
                                                      { locale: fr },
                                                  )
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
                                            selected={selectedDate}
                                            captionLayout="dropdown"
                                            disabled={{ before: new Date() }}
                                            onSelect={(selected) => {
                                                setDatePart(
                                                    selected
                                                        ? format(
                                                              selected,
                                                              'yyyy-MM-dd',
                                                          )
                                                        : '',
                                                );
                                                setError(null);
                                                setCalendarOpen(false);
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="visio_time">
                                    Heure (Paris)
                                </Label>
                                <Select
                                    value={timePart}
                                    onValueChange={(time) => {
                                        setTimePart(time);
                                        setError(null);
                                    }}
                                >
                                    <SelectTrigger
                                        id="visio_time"
                                        aria-invalid={error !== null}
                                        className="w-32"
                                    >
                                        <SelectValue placeholder="Heure" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(VISIO_TIME_SLOTS.includes(timePart)
                                            ? VISIO_TIME_SLOTS
                                            : [timePart, ...VISIO_TIME_SLOTS]
                                        )
                                            .filter(Boolean)
                                            .map((slot) => (
                                                <SelectItem
                                                    key={slot}
                                                    value={slot}
                                                >
                                                    {slot}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <InputError message={error ?? undefined} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            disabled={processing}
                            onClick={submit}
                        >
                            {processing ? <Spinner /> : <Video />}
                            {scheduled
                                ? 'Déplacer et prévenir'
                                : "Envoyer l'invitation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
