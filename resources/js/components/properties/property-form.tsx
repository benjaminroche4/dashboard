import { Link, useForm, usePage } from '@inertiajs/react';
import { Images, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import {
    ListingImportDialog,
    type ListingExtraction,
} from '@/components/properties/listing-import-dialog';
import { PropertyFields } from '@/components/properties/property-fields';
import { PropertySummaryCard } from '@/components/properties/property-summary-card';
import { useNearbyTransit } from '@/hooks/use-nearby-transit';
import {
    PropertyPhotos,
    type SavedPhoto,
} from '@/components/properties/property-photos';
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
    /** Propriétaire présélectionné (`?owner=UUID`, depuis sa fiche). */
    defaultOwnerId?: number | null;
};

/**
 * Formulaire de la page dédiée d'un bien (ajout ou modification) : les
 * champs partagés `PropertyFields`, « Annuler » ramène à la fiche du bien
 * ou à l'annuaire.
 */
export function PropertyFormPanel({
    options,
    property,
    defaultOwnerId = null,
}: Props) {
    const form = useForm<PropertyForm>({
        ...initialPropertyForm(property),
        ...(property === null && defaultOwnerId !== null
            ? { owner_id: String(defaultOwnerId) }
            : {}),
    });
    const editing = property !== null;
    const heading = editing ? `Modifier ${property.label}` : 'Nouveau bien';
    const { features } = usePage().props;
    const [importing, setImporting] = useState(false);
    // Photos : celles déjà enregistrées (retirables) et celles à envoyer.
    const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>(
        (property?.photo_paths ?? []).map((path, index) => ({
            path,
            url: property?.photos[index] ?? '',
        })),
    );
    const [photos, setPhotos] = useState<File[]>([]);
    // Champs remplis par l'assistant lors du dernier import, signalés à relire.
    const [imported, setImported] = useState<ListingExtraction | null>(null);
    // Dès que l'adresse tient debout, l'assistant cherche les transports.
    const { searching: searchingTransit } = useNearbyTransit(
        {
            street: form.data.street,
            postal_code: form.data.postal_code,
            city: form.data.city,
        },
        (transit) => form.setData('transit', transit),
    );

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
        form.transform((data) => ({
            ...propertyFormToPayload(data as PropertyForm),
            photos,
            kept_photos: savedPhotos.map((photo) => photo.path),
        }));

        // Multipart : les photos partent avec le reste du formulaire.
        const options = { preserveScroll: true, forceFormData: true };

        if (property) {
            // Laravel n'accepte pas de multipart en PATCH : on passe par POST.
            form.transform((data) => ({
                ...propertyFormToPayload(data as PropertyForm),
                photos,
                kept_photos: savedPhotos.map((photo) => photo.path),
                _method: 'patch',
            }));
            form.post(update({ property: property.uuid }).url, options);
        } else {
            form.post(store().url, options);
        }
    };

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                    <h1 className="text-lg font-medium">{heading}</h1>
                    <p className="text-muted-foreground text-sm">
                        {editing
                            ? 'Adresse, caractéristiques, loyer et contacts du bien.'
                            : 'Seule l’adresse est obligatoire. Le bien pourra ensuite être proposé en visite.'}
                    </p>
                </div>
                {/* L'import d'annonce ouvre une modale : il ne pousse plus le formulaire. */}
                {!editing && features.assistant && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setImporting(true)}
                    >
                        <Sparkles aria-hidden />
                        Import AI
                    </Button>
                )}
            </header>
            <form
                aria-label={
                    editing ? `Modifier ${property.label}` : 'Nouveau bien'
                }
                // La saisie à gauche, le récapitulatif à droite ; sur mobile, la
                // carte passe sous le formulaire, un résumé vide n'ouvrant pas
                // utilement la page.
                className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                <div className="grid gap-4">
                    {imported && (
                        <div
                            role="status"
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/40"
                        >
                            <AiBadge label="Prérempli par l’IA" />
                            <span>
                                {imported.filled.length} champ(s) lus dans
                                l’annonce. Relisez-les avant d’enregistrer.
                            </span>
                        </div>
                    )}
                    {/* Pas de cadre gris ni de cartes : les catégories se
                        suivent, séparées par un filet. */}
                    <div className="divide-foreground/10 grid divide-y">
                        <PropertyFields
                            idPrefix="property"
                            values={form.data}
                            errors={form.errors}
                            options={options}
                            onChange={(values) => form.setData(values)}
                        />
                        <fieldset className="grid gap-4 py-5">
                            <legend className="float-left mb-4 grid w-full gap-0.5 text-sm font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Images
                                        aria-hidden
                                        className="text-muted-foreground size-3.5 shrink-0"
                                    />
                                    Photos
                                </span>
                                <span className="text-muted-foreground pl-5.5 text-sm">
                                    Ce que le client verra du bien : la première
                                    photo sert de couverture.
                                </span>
                            </legend>
                            <PropertyPhotos
                                saved={savedPhotos}
                                files={photos}
                                onSavedChange={setSavedPhotos}
                                onFilesChange={setPhotos}
                                disabled={form.processing}
                            />
                        </fieldset>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                        <Button type="button" variant="ghost" asChild>
                            <Link
                                href={
                                    property
                                        ? propertyShow({
                                              property: property.uuid,
                                          })
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
                </div>

                <PropertySummaryCard
                    values={form.data}
                    options={options}
                    searchingTransit={searchingTransit}
                    className="lg:sticky lg:top-6"
                />

                <ListingImportDialog
                    open={importing}
                    onOpenChange={setImporting}
                    onExtracted={applyExtraction}
                />
            </form>
        </div>
    );
}
