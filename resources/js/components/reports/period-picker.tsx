import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import type { ReportPeriodOption } from '@/types';

type Props = {
    /** Raccourci actif (`day`, `week`, `days30`, `months6`, `months12`, `custom`). */
    period: string;
    options: ReportPeriodOption[];
    /** Bornes de la période affichée, au format ISO (AAAA-MM-JJ). */
    from: string;
    to: string;
    onChange: (query: { period: string; from?: string; to?: string }) => void;
};

const iso = (date: Date) => format(date, 'yyyy-MM-dd');
const label = (date: Date) => format(date, 'd MMM yyyy', { locale: fr });

/**
 * Période d'un rapport : un raccourci (jour, semaine, 30 jours, 6 et 12 mois) ou
 * une plage choisie dans un seul calendrier à deux mois. Le rapport est rechargé
 * dès que les deux bornes sont posées ; l'ordre des clics n'a pas d'importance,
 * la plus ancienne devient le début.
 */
export function PeriodPicker({ period, options, from, to, onChange }: Props) {
    const [open, setOpen] = useState(false);
    // Choix courant du sélecteur : « Période personnalisée » ouvre le calendrier
    // sans recharger, le serveur ne connaît la période qu'une fois les deux
    // bornes posées. Sans cet état local, le calendrier ne s'ouvrirait jamais.
    const [choice, setChoice] = useState(period);
    const [range, setRange] = useState<DateRange | undefined>({
        from: parseISO(from),
        to: parseISO(to),
    });
    const custom = choice === 'custom';

    // Le rapport rechargé fait foi (retour arrière du navigateur compris).
    useEffect(() => {
        setChoice(period);
        setRange({ from: parseISO(from), to: parseISO(to) });
    }, [period, from, to]);

    /**
     * Deux clics : le premier pose le début et efface l'ancienne plage, le second
     * la ferme. Un second clic antérieur au premier est accepté, les deux dates
     * sont alors remises dans l'ordre.
     */
    const pick = (day: Date) => {
        if (!range?.from || range.to) {
            setRange({ from: day, to: undefined });

            return;
        }

        const [start, end] =
            day < range.from ? [day, range.from] : [range.from, day];

        setRange({ from: start, to: end });
        setOpen(false);
        onChange({ period: 'custom', from: iso(start), to: iso(end) });
    };

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
                value={choice}
                onValueChange={(value) => {
                    setChoice(value);

                    if (value === 'custom') {
                        // Ouvert après la fermeture du sélecteur : sinon le clic
                        // qui referme la liste est vu comme un clic hors du
                        // calendrier, qui se refermerait aussitôt. La plage
                        // affichée sert de point de départ à l'ajustement.
                        setTimeout(() => setOpen(true), 0);
                    } else {
                        onChange({ period: value });
                    }
                }}
            >
                <SelectTrigger
                    aria-label="Période"
                    className="bg-background w-52"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {custom && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            aria-label="Dates de la période"
                            className="bg-background justify-start font-normal"
                        >
                            <CalendarIcon aria-hidden className="size-4" />
                            {range?.from
                                ? `${label(range.from)} – ${range.to ? label(range.to) : '…'}`
                                : 'Choisir les dates'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                    >
                        <Calendar
                            mode="range"
                            numberOfMonths={2}
                            defaultMonth={range?.from}
                            selected={range}
                            onSelect={(_, day) => pick(day)}
                            locale={fr}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
