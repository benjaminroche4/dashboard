import { CountryFlag } from '@/components/country-flag';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type DialCode = { code: string; iso: string; name: string };

export const dialCodes: DialCode[] = [
    { code: '+33', iso: 'FR', name: 'France' },
    { code: '+41', iso: 'CH', name: 'Suisse' },
    { code: '+32', iso: 'BE', name: 'Belgique' },
    { code: '+352', iso: 'LU', name: 'Luxembourg' },
    { code: '+44', iso: 'GB', name: 'Royaume-Uni' },
    { code: '+49', iso: 'DE', name: 'Allemagne' },
    { code: '+34', iso: 'ES', name: 'Espagne' },
    { code: '+39', iso: 'IT', name: 'Italie' },
    { code: '+351', iso: 'PT', name: 'Portugal' },
    { code: '+31', iso: 'NL', name: 'Pays-Bas' },
    { code: '+1', iso: 'US', name: 'États-Unis / Canada' },
    { code: '+212', iso: 'MA', name: 'Maroc' },
    { code: '+213', iso: 'DZ', name: 'Algérie' },
    { code: '+216', iso: 'TN', name: 'Tunisie' },
    { code: '+971', iso: 'AE', name: 'Émirats arabes unis' },
    { code: '+65', iso: 'SG', name: 'Singapour' },
    { code: '+61', iso: 'AU', name: 'Australie' },
];

/** Sépare « +33 6 12 34 56 78 » en indicatif et numéro national. */
export function splitPhone(value: string): { code: string; number: string } {
    const trimmed = value.trim();
    // Indicatifs les plus longs d'abord pour ne pas confondre +1 et +1xx.
    const match = [...dialCodes]
        .sort((a, b) => b.code.length - a.code.length)
        .find((dial) => trimmed.startsWith(dial.code));

    if (!match) {
        return { code: '+33', number: trimmed };
    }

    return {
        code: match.code,
        number: trimmed.slice(match.code.length).trim(),
    };
}

export function joinPhone(code: string, number: string): string {
    const national = number.trim();

    return national === '' ? '' : `${code} ${national}`;
}

/**
 * Téléphone avec indicatif : un sélecteur de pays (drapeau + indicatif)
 * et le numéro national. La valeur émise est le numéro complet.
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
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {dialCodes.map((dial) => (
                        <SelectItem key={dial.iso} value={dial.code}>
                            <CountryFlag code={dial.iso} />
                            <span className="tabular-nums">{dial.code}</span>
                            <span className="text-muted-foreground sr-only">
                                {dial.name}
                            </span>
                        </SelectItem>
                    ))}
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
