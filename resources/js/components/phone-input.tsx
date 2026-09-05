import {
    getCountries,
    getCountryCallingCode,
    type CountryCode,
} from 'libphonenumber-js/min';
import { CountryFlag } from '@/components/country-flag';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
 * Téléphone avec indicatif : un sélecteur de pays (drapeau + indicatif,
 * tous les pays) et le numéro national. La valeur émise est le numéro complet.
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
    const { code, number } = splitPhone(value);
    const iso = isoFor(code);

    return (
        <div className="flex gap-2">
            <Select
                value={code}
                onValueChange={(next) => onChange(joinPhone(next, number))}
            >
                <SelectTrigger
                    aria-label="Indicatif"
                    className="bg-background w-32 shrink-0"
                >
                    <SelectValue>
                        <CountryFlag code={iso} />
                        <span className="tabular-nums">{code}</span>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                    <SelectGroup>
                        <SelectLabel>Fréquents</SelectLabel>
                        {uniqueByCode(preferredCodes).map((dial) => (
                            <SelectItem key={`p-${dial.iso}`} value={dial.code}>
                                <CountryFlag code={dial.iso} />
                                <span className="tabular-nums">
                                    {dial.code}
                                </span>
                                <span className="text-muted-foreground">
                                    {dial.name}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                        <SelectLabel>Tous les pays</SelectLabel>
                        {uniqueByCode(otherCodes)
                            .filter(
                                (dial) =>
                                    !preferredCodes.some(
                                        (p) => p.code === dial.code,
                                    ),
                            )
                            .map((dial) => (
                                <SelectItem key={dial.iso} value={dial.code}>
                                    <CountryFlag code={dial.iso} />
                                    <span className="tabular-nums">
                                        {dial.code}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {dial.name}
                                    </span>
                                </SelectItem>
                            ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
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
