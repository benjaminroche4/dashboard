import {
    getCountries,
    getCountryCallingCode,
    type CountryCode,
} from 'libphonenumber-js/min';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DialCode = { code: string; iso: CountryCode; name: string };

/** Pays proposés en tête de liste, les plus fréquents pour l'agence. */
const preferred: CountryCode[] = ['FR', 'CH', 'BE', 'LU', 'GB', 'DE', 'US'];

const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' });

function nameOf(iso: CountryCode): string {
    try {
        return countryNames.of(iso) ?? iso;
    } catch {
        return iso;
    }
}

/** Tous les pays connus de libphonenumber, avec indicatif et nom français. */
export const dialCodes: DialCode[] = getCountries()
    .map((iso) => ({
        iso,
        code: `+${getCountryCallingCode(iso)}`,
        name: nameOf(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

const preferredCodes = preferred
    .map((iso) => dialCodes.find((dial) => dial.iso === iso))
    .filter((dial): dial is DialCode => dial !== undefined);
const otherCodes = dialCodes.filter((dial) => !preferred.includes(dial.iso));

// Un indicatif peut être partagé (+1, +7, +44…) : une seule entrée par indicatif dans le sélecteur.
const uniqueByCode = (list: DialCode[]) =>
    list.filter(
        (dial, index) =>
            list.findIndex((other) => other.code === dial.code) === index,
    );

/** Sépare « +33 6 12 34 56 78 » en indicatif et numéro national. */
export function splitPhone(value: string): { code: string; number: string } {
    const trimmed = value.trim();
    // Indicatifs les plus longs d'abord pour ne pas confondre +1 et +1xx.
    const codes = [...new Set(dialCodes.map((dial) => dial.code))].sort(
        (a, b) => b.length - a.length,
    );
    const match = codes.find((code) => trimmed.startsWith(code));

    if (!match) {
        return { code: '+33', number: trimmed };
    }

    return { code: match, number: trimmed.slice(match.length).trim() };
}

export function joinPhone(code: string, number: string): string {
    const national = number.trim();

    return national === '' ? '' : `${code} ${national}`;
}

/** Pays affiché pour un indicatif : le pays préféré s'il y en a un, sinon le premier. */
function isoFor(code: string): CountryCode {
    return (
        preferredCodes.find((dial) => dial.code === code)?.iso ??
        dialCodes.find((dial) => dial.code === code)?.iso ??
        'FR'
    );
}

/**
 * Téléphone avec indicatif : un sélecteur de pays avec recherche (drapeau,
 * indicatif, nom, tous les pays) et le numéro national. La valeur émise
 * est le numéro complet.
 */
export function PhoneInput({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const parsed = splitPhone(value);
    // Indicatif choisi avant tout numéro : gardé ici tant que le numéro est vide.
    const [pendingCode, setPendingCode] = useState<string | null>(null);
    const code =
        parsed.number === '' && pendingCode ? pendingCode : parsed.code;
    const number = parsed.number;
    const iso = isoFor(code);
    const [open, setOpen] = useState(false);

    const pick = (next: string) => {
        setPendingCode(next);
        onChange(joinPhone(next, number));
        setOpen(false);
    };

    const item = (dial: DialCode, keyPrefix = '') => (
        <CommandItem
            key={`${keyPrefix}${dial.iso}`}
            value={`${dial.name} ${dial.code} ${dial.iso}`}
            onSelect={() => pick(dial.code)}
        >
            <CountryFlag code={dial.iso} />
            <span className="truncate">{dial.name}</span>
            <span className="text-muted-foreground ml-auto tabular-nums">
                {dial.code}
            </span>
            <Check
                className={cn(
                    'size-4',
                    dial.code === code ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
            />
        </CommandItem>
    );

    return (
        <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Indicatif"
                        className="bg-background w-32 shrink-0 justify-between px-3 font-normal"
                    >
                        <span className="flex items-center gap-2">
                            <CountryFlag code={iso} />
                            <span className="tabular-nums">{code}</span>
                        </span>
                        <ChevronsUpDown className="opacity-50" aria-hidden />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Rechercher un pays ou un indicatif…" />
                        <CommandList>
                            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
                            <CommandGroup heading="Fréquents">
                                {uniqueByCode(preferredCodes).map((dial) =>
                                    item(dial, 'p-'),
                                )}
                            </CommandGroup>
                            <CommandGroup heading="Tous les pays">
                                {uniqueByCode(otherCodes)
                                    .filter(
                                        (dial) =>
                                            !preferredCodes.some(
                                                (p) => p.code === dial.code,
                                            ),
                                    )
                                    .map((dial) => item(dial))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Input
                id={id}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="6 12 34 56 78"
                className="bg-background"
                value={number}
                onChange={(event) =>
                    onChange(joinPhone(code, event.target.value))
                }
            />
        </div>
    );
}
