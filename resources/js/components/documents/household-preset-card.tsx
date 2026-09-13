import { Check, Wand2 } from 'lucide-react';
import { FormSection } from '@/components/form-section';
import { Button } from '@/components/ui/button';
import {
    groupPresets,
    isPresetApplied,
    togglePreset,
} from '@/lib/document-request-form';
import type { DocumentPresetOption, HouseholdPersonForm } from '@/types';

/**
 * Profils de la personne affichée : trente cases à cocher par dossier coûtent
 * du temps, un profil les pose d'un clic et un second clic les retire. Les
 * pièces cochées à la main hors profil ne bougent pas.
 */
export function HouseholdPresetCard({
    presets,
    person,
    name,
    onChange,
}: {
    presets: DocumentPresetOption[];
    /** Personne en cours d'édition, celle qu'affiche le formulaire. */
    person: HouseholdPersonForm;
    /** Son nom, ou « Personne n » tant qu'il n'est pas saisi. */
    name: string;
    onChange: (person: HouseholdPersonForm) => void;
}) {
    if (presets.length === 0) {
        return null;
    }

    return (
        <FormSection
            title="Profil du dossier"
            icon={Wand2}
            hint={`Les pièces habituelles d’un profil, pour ${name}.`}
        >
            <div className="grid gap-3">
                {groupPresets(presets).map((family) => (
                    <div key={family.group} className="grid gap-1.5">
                        <span className="text-muted-foreground text-xs">
                            {family.group}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {family.presets.map((preset) => {
                                const applied = isPresetApplied(person, preset);

                                return (
                                    <Button
                                        key={preset.value}
                                        type="button"
                                        variant={
                                            applied ? 'secondary' : 'outline'
                                        }
                                        size="sm"
                                        aria-pressed={applied}
                                        className="h-8 gap-1.5 text-xs font-normal"
                                        onClick={() =>
                                            onChange(
                                                togglePreset(person, preset),
                                            )
                                        }
                                    >
                                        {applied && (
                                            <Check aria-hidden="true" />
                                        )}
                                        {preset.label}
                                        <span className="text-muted-foreground tabular-nums">
                                            {preset.documents.length}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            {/* Le compte de la personne affichée, et de quoi repartir de zéro :
                le bandeau d'en-tête est trop étroit dans cette colonne. */}
            <div className="flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-muted-foreground text-xs tabular-nums">
                    {person.documents.length} pièce(s) cochée(s)
                </span>
                {person.documents.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 px-2 text-xs"
                        onClick={() => onChange({ ...person, documents: [] })}
                    >
                        Tout décocher
                    </Button>
                )}
            </div>
        </FormSection>
    );
}
