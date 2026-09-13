import { format, isValid, parse, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
    id?: string;
    /** Date ISO (AAAA-MM-JJ) ou chaîne vide. */
    value: string;
    onChange: (iso: string) => void;
    /** Date ISO minimale sélectionnable (AAAA-MM-JJ) : les jours d'avant sont refusés. */
    min?: string;
    placeholder?: string;
    className?: string;
    'aria-label'?: string;
};

const DISPLAY_FORMAT = 'd MMMM yyyy';
const ACCEPTED_FORMATS = [
    DISPLAY_FORMAT,
    'dd/MM/yyyy',
    'd/M/yyyy',
    'yyyy-MM-dd',
];

function toDisplay(iso: string): string {
    const parsed = iso ? parseISO(iso) : undefined;

    return parsed && isValid(parsed)
        ? format(parsed, DISPLAY_FORMAT, { locale: fr })
        : '';
}

/** « 4 septembre 2026 », « 04/09/2026 » ou ISO → Date, sinon undefined. */
export function parseTypedDate(text: string): Date | undefined {
    const trimmed = text.trim();

    if (trimmed === '') {
        return undefined;
    }

    for (const pattern of ACCEPTED_FORMATS) {
        const parsed = parse(trimmed, pattern, new Date(), { locale: fr });

        // Année sur quatre chiffres seulement : « 12/10/2 » n'est pas encore une date.
        if (isValid(parsed) && parsed.getFullYear() >= 1900) {
            return parsed;
        }
    }

    return undefined;
}

/**
 * Sélecteur de date shadcn « avec champ » : on tape la date ou on l'ouvre
 * dans le calendrier. Valeur ISO, affichage en français.
 */
export function DatePicker({
    id,
    value,
    onChange,
    min,
    placeholder = '4 septembre 2026',
    className,
    'aria-label': ariaLabel,
}: Props) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(() => toDisplay(value));
    const parsed = value ? parseISO(value) : undefined;
    const date = parsed && isValid(parsed) ? parsed : undefined;
    const [month, setMonth] = useState<Date | undefined>(date);
    const [focused, setFocused] = useState(false);
    const parsedMin = min ? parseISO(min) : undefined;
    const minDate = parsedMin && isValid(parsedMin) ? parsedMin : undefined;

    /** Une date avant la borne n'est jamais retenue : le champ ne peut pas produire d'interdit. */
    const allowed = (next: Date | undefined): boolean =>
        next === undefined ||
        minDate === undefined ||
        format(next, 'yyyy-MM-dd') >= format(minDate, 'yyyy-MM-dd');

    // Une valeur imposée de l'extérieur (ex. réinitialisation) rafraîchit le
    // texte, sauf pendant la frappe : on ne remplace pas ce que l'utilisateur tape.
    useEffect(() => {
        if (!focused) {
            setText(toDisplay(value));
        }
    }, [value, focused]);

    const commit = (next: Date | undefined) => {
        if (!allowed(next)) {
            return;
        }

        onChange(next ? format(next, 'yyyy-MM-dd') : '');
        setMonth(next);
    };

    return (
        <div className={cn('relative flex gap-2', className)}>
            <Input
                id={id}
                aria-label={ariaLabel}
                value={text}
                placeholder={placeholder}
                className="bg-background pr-10"
                onChange={(event) => {
                    setText(event.target.value);
                    const typed = parseTypedDate(event.target.value);

                    if (typed) {
                        commit(typed);
                    } else if (event.target.value.trim() === '') {
                        commit(undefined);
                    }
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    setText(toDisplay(value));
                }}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Ouvrir le calendrier"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                        <CalendarIcon className="size-3.5" />
                        <span className="sr-only">Ouvrir le calendrier</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                >
                    <Calendar
                        mode="single"
                        locale={fr}
                        selected={date}
                        disabled={minDate ? { before: minDate } : undefined}
                        month={month}
                        onMonthChange={setMonth}
                        captionLayout="dropdown"
                        onSelect={(selected) => {
                            if (!allowed(selected)) {
                                return;
                            }

                            commit(selected);
                            setText(
                                selected
                                    ? format(selected, DISPLAY_FORMAT, {
                                          locale: fr,
                                      })
                                    : '',
                            );
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
