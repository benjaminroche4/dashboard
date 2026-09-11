import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { type LucideIcon } from 'lucide-react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
    Furnished,
    GuarantorType,
    LabeledOption,
    LeadDuration,
} from '@/types';

type Single = {
    multiple?: false;
    value: string;
    onChange: (value: string) => void;
};
type Multiple = {
    multiple: true;
    value: string[];
    onChange: (value: string[]) => void;
};
type ChoiceProps = {
    id: string;
    label: string;
    options: LabeledOption[];
    /** Icône par valeur, posée devant le libellé (équipements d'un bien…). */
    icons?: Record<string, LucideIcon>;
} & (Single | Multiple);

const itemClass =
    'focus-visible:ring-ring/50 bg-background h-8 rounded-md border px-3 text-xs outline-none focus-visible:ring-[3px] hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:font-medium';

/**
 * Pastilles compactes : une réponse (ou aucune) pour le choix simple,
 * plusieurs pour le garant. Le nom accessible est le libellé complet.
 */
export function ChoicePills(props: ChoiceProps) {
    const items = props.options.map((option) => {
        const Icon = props.icons?.[option.value];

        return (
            <ToggleGroupPrimitive.Item
                key={option.value}
                value={option.value}
                aria-label={option.label}
                className={cn(
                    itemClass,
                    Icon && 'inline-flex items-center gap-1.5',
                )}
            >
                {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
                {option.label}
            </ToggleGroupPrimitive.Item>
        );
    });
    const shared = {
        id: props.id,
        'aria-label': props.label,
        className: 'flex flex-wrap gap-1.5',
    };

    return props.multiple ? (
        <ToggleGroupPrimitive.Root
            {...shared}
            type="multiple"
            value={props.value}
            onValueChange={props.onChange}
        >
            {items}
        </ToggleGroupPrimitive.Root>
    ) : (
        <ToggleGroupPrimitive.Root
            {...shared}
            type="single"
            value={props.value}
            onValueChange={(next) => props.onChange(next ?? '')}
        >
            {items}
        </ToggleGroupPrimitive.Root>
    );
}

export type ConditionValues = {
    duration: LeadDuration | '';
    guarantors: GuarantorType[];
    furnished: Furnished | '';
};

type Props = {
    durations: LabeledOption<LeadDuration>[];
    guarantors: LabeledOption<GuarantorType>[];
    furnishedOptions: LabeledOption<Furnished>[];
    values: ConditionValues;
    onChange: <K extends keyof ConditionValues>(
        key: K,
        value: ConditionValues[K],
    ) => void;
    errors: Partial<Record<keyof ConditionValues, string>>;
    className?: string;
};

function Field({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid content-start gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

/** Les trois champs « Conditions » du lead : durée, garant, meublé. */
export function ConditionChoices({
    durations,
    guarantors,
    furnishedOptions,
    values,
    onChange,
    errors,
    className,
}: Props) {
    return (
        <div className={cn('grid gap-5 sm:grid-cols-3', className)}>
            <Field
                label="Durée d'installation"
                htmlFor="duration"
                error={errors.duration}
            >
                <ChoicePills
                    id="duration"
                    label="Durée d'installation"
                    options={durations}
                    value={values.duration}
                    onChange={(value) =>
                        onChange('duration', value as LeadDuration | '')
                    }
                />
            </Field>
            <Field
                label="Type de garant"
                htmlFor="guarantors"
                error={errors.guarantors}
            >
                <ChoicePills
                    id="guarantors"
                    label="Type de garant"
                    options={guarantors}
                    multiple
                    value={values.guarantors}
                    onChange={(value) =>
                        onChange('guarantors', value as GuarantorType[])
                    }
                />
            </Field>
            <Field label="Meublé" htmlFor="furnished" error={errors.furnished}>
                <ChoicePills
                    id="furnished"
                    label="Meublé"
                    options={furnishedOptions}
                    value={values.furnished}
                    onChange={(value) =>
                        onChange('furnished', value as Furnished | '')
                    }
                />
            </Field>
        </div>
    );
}
