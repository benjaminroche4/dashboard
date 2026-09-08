import { Link, useForm, usePage } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import {
    ListingImportDialog,
    type ListingExtraction,
} from '@/components/properties/listing-import-dialog';
import { PropertyFields } from '@/components/properties/property-fields';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    initialPropertyForm,
    propertyFormToPayload,
} from '@/lib/property-form';
import {
    index as propertiesIndex,
    show as propertyShow,
    store,
    update,
} from '@/routes/properties';
import type { Property, PropertyForm, PropertyFormOptions } from '@/types';

type Props = {
    options: PropertyFormOptions;
    /** Bien à modifier ; null pour un ajout. */
    property: Property | null;
};

/**
 * Formulaire de la page dédiée d'un bien (ajout ou modification) : les
 * champs partagés `PropertyFields`, « Annuler » ramène à la fiche du bien
 * ou à l'annuaire.
 */
export function PropertyFormPanel({ options, property }: Props) {
    const form = useForm<PropertyForm>(initialPropertyForm(property));
    const editing = property !== null;
    const { features } = usePage().props;
    const [importing, setImporting] = useState(false);
    // Champs remplis par l'assistant lors du dernier import, signalés à relire.
    const [imported, setImported] = useState<ListingExtraction | null>(null);

    const applyExtraction = (extraction: ListingExtraction) => {
        const values = Object.fromEntries(
            Object.entries(extraction.property).filter(
                ([, value]) =>
                    value !== '' && value !== null && value !== undefined,
            ),
        ) as Partial<PropertyForm>;
        const agentHint = [extraction.agent_name, extraction.agency_name]
            .filter(Boolean)
            .join(' · ');
        const notes = [
            values.notes,
            extraction.highlights.length > 0
                ? extraction.highlights.map((item) => `• ${item}`).join('\n')
                : null,
            agentHint ? `Contact de l’annonce : ${agentHint}` : null,
        ]
            .filter(Boolean)
            .join('\n\n');

        form.setData({
            ...form.data,
            ...values,
            notes: notes || form.data.notes,
        });
        form.clearErrors();
        setImported(extraction);
    };

    const submit = () => {
        form.transform((data) => propertyFormToPayload(data as PropertyForm));

        if (property) {
            form.patch(update({ property: property.uuid }).url, {
                preserveScroll: true,
            });
        } else {
            form.post(store().url, { preserveScroll: true });
        }
    };

    return (
        <form
            aria-label={editing ? `Modifier ${property.label}` : 'Nouveau bien'}
            className="grid gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            {!editing && features.assistant && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3">
                    <p className="text-muted-foreground text-sm">
                        Vous avez une annonce ? L’assistant préremplit le
                        formulaire depuis son lien ou son texte.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setImporting(true)}
                    >
                        <Sparkles aria-hidden />
                        Importer une annonce
                    </Button>
                </div>
            )}
            {imported && (
                <div
                    role="status"
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/40"
                >
                    <AiBadge label="Prérempli par l’IA" />
                    <span>
                        {imported.filled.length} champ(s) lus dans l’annonce.
                        Relisez-les avant d’enregistrer.
                    </span>
                </div>
            )}
            <PropertyFields
                idPrefix="property"
                values={form.data}
                errors={form.errors}
                options={options}
                onChange={(values) => form.setData(values)}
            />
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="ghost" asChild>
                    <Link
                        href={
                            property
                                ? propertyShow({ property: property.uuid })
                                : propertiesIndex()
                        }
                    >
                        Annuler
                    </Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner />}
                    {editing ? 'Enregistrer' : 'Ajouter le bien'}
                </Button>
            </div>
            <ListingImportDialog
                open={importing}
                onOpenChange={setImporting}
                onExtracted={applyExtraction}
            />
        </form>
    );
}
