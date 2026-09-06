import { router } from '@inertiajs/react';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { formatDate } from '@/lib/format';
import { daysUntil } from '@/lib/lead-urgency';
import { cn } from '@/lib/utils';
import { recontact as leadRecontact } from '@/routes/leads';
import type { LabeledOption, LeadDetail, RecontactChannel } from '@/types';

/** « En retard de 3 j », « Aujourd'hui », « Dans 5 j » ou null sans date. */
export function describeRecontact(dateIso: string | null): {
    label: string;
    late: boolean;
} | null {
    if (dateIso === null) {
        return null;
    }

    const days = daysUntil(dateIso);

    if (days < 0) {
        return { label: `En retard de ${-days} j`, late: true };
    }

    return {
        label: days === 0 ? "Aujourd'hui" : `Dans ${days} j`,
        late: false,
    };
}

/**
 * Prochain recontact du lead : canal et date, avec un badge de retard, et un
 * popover pour planifier, reporter ou effacer.
 */
export function LeadRecontact({
    lead,
    channels,
}: {
    lead: LeadDetail;
    channels: LabeledOption<RecontactChannel>[];
}) {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState(lead.recontact_at ?? '');
    const [channel, setChannel] = useState<RecontactChannel | ''>(
        lead.recontact_channel ?? '',
    );
    const [busy, setBusy] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const parsedDate = date ? parseISO(date) : undefined;
    const selectedDate =
        parsedDate && isValid(parsedDate) ? parsedDate : undefined;
    const status = describeRecontact(lead.recontact_at);
    const planned = lead.recontact_at !== null;

    const save = (clear = false) => {
        setBusy(true);
        router.patch(
            leadRecontact({ lead: lead.id }).url,
            clear
                ? { recontact_at: null, recontact_channel: null }
                : { recontact_at: date, recontact_channel: channel || null },
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
                            {formatDate(lead.recontact_at ?? '')}
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
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                    >
                        {planned ? 'Reporter' : 'Planifier'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="grid w-72 gap-3">
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
                                {channels.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
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
                                    className="w-48 justify-between font-normal"
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
                    <div className="flex justify-between gap-2">
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
                            disabled={busy || date === '' || channel === ''}
                            onClick={() => save()}
                        >
                            {busy && <Spinner />}
                            Enregistrer
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
