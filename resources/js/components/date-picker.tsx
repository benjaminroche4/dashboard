import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
    placeholder?: string;
    className?: string;
    'aria-label'?: string;
};

/**
 * Sélecteur de date shadcn (Popover + Calendar), valeur ISO, affichage en français.
 */
export function DatePicker({
    id,
    value,
    onChange,
    placeholder = 'Choisir une date',
    className,
    'aria-label': ariaLabel,
}: Props) {
    const [open, setOpen] = useState(false);
    const parsed = value ? parseISO(value) : undefined;
    const date = parsed && isValid(parsed) ? parsed : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    aria-label={ariaLabel}
                    data-empty={!date}
                    className={cn(
                        'bg-background data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal',
                        className,
                    )}
                >
                    <CalendarIcon />
                    {date
                        ? format(date, 'd MMMM yyyy', { locale: fr })
                        : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    locale={fr}
                    selected={date}
                    defaultMonth={date}
                    onSelect={(selected) => {
                        onChange(
                            selected ? format(selected, 'yyyy-MM-dd') : '',
                        );
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
