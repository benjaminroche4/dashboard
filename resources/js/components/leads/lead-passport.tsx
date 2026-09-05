import { Building2, Mail, MapPin, Phone, Star } from 'lucide-react';
import { CountryFlag } from '@/components/country-flag';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatMoney } from '@/lib/format';
import { toCents } from '@/lib/invoice-totals';
import { describeDistricts } from '@/lib/paris-districts';
import { cn } from '@/lib/utils';
import type { LabeledOption, LeadForm } from '@/types';

export type PassportOptions = {
    offers: { value: string; label: string }[];
    languages: LabeledOption[];
    sources: LabeledOption[];
    propertyTypes: LabeledOption[];
    durations: LabeledOption[];
    guarantors: LabeledOption[];
    furnishedOptions: LabeledOption[];
    recontactChannels: LabeledOption[];
};

const label = (options: { value: string; label: string }[], value: string) =>
    options.find((option) => option.value === value)?.label ?? null;

/** Champs qui comptent dans la jauge de complétude, du plus au moins important. */
export function passportCompleteness(form: LeadForm): {
    done: number;
    total: number;
    percent: number;
} {
    const checks = [
        form.first_name.trim() !== '' && form.last_name.trim() !== '',
        form.email.trim() !== '' || form.phone.trim() !== '',
        form.offer !== '',
        form.budget.trim() !== '',
        form.arrival_at !== '',
        form.districts.length > 0,
        form.property_types.length > 0,
        form.duration !== '',
        form.guarantor !== '',
        form.furnished !== '',
        form.score !== null,
    ];
    const done = checks.filter(Boolean).length;

    return {
        done,
        total: checks.length,
        percent: Math.round((done / checks.length) * 100),
    };
}

function initials(first: string, last: string): string {
    return `${first.trim()[0] ?? ''}${last.trim()[0] ?? ''}`.toUpperCase();
}

/**
 * Passeport du lead : aperçu en direct de ce que la Converting Machine
 * produira, avec une jauge de complétude.
 */
export function LeadPassport({
    form,
    options,
}: {
    form: LeadForm;
    options: PassportOptions;
}) {
    const name = `${form.first_name} ${form.last_name}`.trim();
    const budget =
        form.budget.trim() === ''
            ? null
            : formatMoney(toCents(form.budget), form.currency);
    const completeness = passportCompleteness(form);
    const rows: { label: string; value: string | null }[] = [
        { label: 'Formule', value: label(options.offers, form.offer) },
        { label: 'Budget', value: budget ? `${budget} / mois` : null },
        {
            label: 'Emménagement',
            value: form.arrival_at ? formatDate(form.arrival_at) : null,
        },
        { label: 'Quartiers', value: describeDistricts(form.districts) },
        {
            label: 'Bien',
            value:
                form.property_types.length > 0
                    ? form.property_types
                          .map((type) => label(options.propertyTypes, type))
                          .filter(Boolean)
                          .join(', ')
                    : null,
        },
        { label: 'Durée', value: label(options.durations, form.duration) },
        { label: 'Garant', value: label(options.guarantors, form.guarantor) },
        {
            label: 'Meublé',
            value: label(options.furnishedOptions, form.furnished),
        },
        {
            label: 'Source',
            value: [label(options.sources, form.source), form.source_note]
                .filter(Boolean)
                .join(' · '),
        },
        {
            label: 'Recontact',
            value: form.recontact_channel
                ? [
                      label(options.recontactChannels, form.recontact_channel),
                      form.recontact_at
                          ? `le ${formatDate(form.recontact_at)}`
                          : null,
                  ]
                      .filter(Boolean)
                      .join(' · ')
                : null,
        },
    ];

    return (
        <aside
            aria-label="Passeport du lead"
            className="bg-sidebar grid gap-4 rounded-xl border p-4"
        >
            <div className="flex items-start gap-3">
                <span
                    aria-hidden
                    className="bg-background flex size-14 shrink-0 items-center justify-center rounded-lg border text-base font-semibold"
                >
                    {initials(form.first_name, form.last_name) || '·'}
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className={cn(
                            'truncate text-base font-medium',
                            name === '' && 'text-muted-foreground',
                        )}
                        data-test="passport-name"
                    >
                        {name || 'Nom du prospect'}
                    </p>
                    <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 truncate text-sm">
                        <CountryFlag
                            code={form.language === 'en' ? 'GB' : 'FR'}
                            className="size-3.5"
                        />
                        {label(options.languages, form.language)}
                        {form.company && (
                            <>
                                <span aria-hidden>·</span>
                                <Building2
                                    className="size-3.5 shrink-0"
                                    aria-hidden
                                />
                                <span className="truncate">{form.company}</span>
                            </>
                        )}
                    </p>
                    <span
                        className="mt-1 flex items-center gap-0.5"
                        aria-label={
                            form.score === null
                                ? 'Qualité non évaluée'
                                : `Qualité ${form.score} sur 5`
                        }
                    >
                        {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                                key={value}
                                aria-hidden
                                className={cn(
                                    'size-3.5',
                                    form.score !== null && value <= form.score
                                        ? 'fill-current text-amber-500'
                                        : 'text-muted-foreground/30',
                                )}
                            />
                        ))}
                    </span>
                </div>
            </div>

            <ul
                role="list"
                className="bg-background grid divide-y rounded-lg border text-sm"
            >
                <li className="flex items-center gap-2.5 px-3 py-2">
                    <Mail
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                    />
                    <span
                        className={cn(
                            'truncate',
                            !form.email && 'text-muted-foreground',
                        )}
                    >
                        {form.email || 'E-mail'}
                    </span>
                </li>
                <li className="flex items-center gap-2.5 px-3 py-2">
                    <Phone
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                    />
                    <span
                        className={cn(
                            'truncate',
                            !form.phone && 'text-muted-foreground',
                        )}
                    >
                        {form.phone || 'Téléphone'}
                    </span>
                </li>
                {form.origin_city && (
                    <li className="flex items-center gap-2.5 px-3 py-2">
                        <MapPin
                            className="text-muted-foreground size-4 shrink-0"
                            aria-hidden
                        />
                        <span className="truncate">
                            Depuis {form.origin_city}
                        </span>
                    </li>
                )}
            </ul>

            <dl className="bg-background grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-3 text-sm">
                {rows.map((row) => (
                    <div key={row.label} className="contents">
                        <dt className="text-muted-foreground text-xs leading-5">
                            {row.label}
                        </dt>
                        <dd
                            className={cn(
                                'truncate text-right text-xs leading-5',
                                row.value
                                    ? 'font-medium'
                                    : 'text-muted-foreground/60',
                            )}
                        >
                            {row.value || '—'}
                        </dd>
                    </div>
                ))}
            </dl>

            {form.message.trim() !== '' && (
                <p className="text-muted-foreground line-clamp-3 text-xs">
                    {form.message}
                </p>
            )}

            <div className="grid gap-1.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Complétude</span>
                    <span
                        className="font-medium tabular-nums"
                        data-test="passport-completeness"
                    >
                        {completeness.percent} %
                    </span>
                </div>
                <div
                    role="progressbar"
                    aria-label="Complétude du passeport"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={completeness.percent}
                    className="bg-muted h-1.5 overflow-hidden rounded-full"
                >
                    <div
                        className={cn(
                            'h-full rounded-full transition-[width] duration-300',
                            completeness.percent >= 80
                                ? 'bg-green-500'
                                : completeness.percent >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-primary',
                        )}
                        style={{ width: `${completeness.percent}%` }}
                    />
                </div>
                <p className="text-muted-foreground text-xs">
                    {completeness.done} champ{completeness.done > 1 ? 's' : ''}{' '}
                    clé
                    {completeness.done > 1 ? 's' : ''} sur {completeness.total}.
                    {completeness.percent < 100 &&
                        ' Un passeport complet accélère la recherche.'}
                </p>
                {form.offer !== '' && (
                    <Badge variant="secondary" className="w-fit">
                        {label(options.offers, form.offer)}
                    </Badge>
                )}
            </div>
        </aside>
    );
}
