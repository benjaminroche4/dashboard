import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { CountryFlag } from '@/components/country-flag';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { store, update } from '@/routes/tools/documents/catalog';
import type { CatalogDocumentForm, CatalogDocumentItem } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: { value: string; label: string }[];
    /** Pièce à modifier, avec sa catégorie ; absente pour un ajout. */
    document?: (CatalogDocumentItem & { category: string }) | null;
    /** Catégorie présélectionnée pour un ajout. */
    defaultCategory?: string;
};

function initial(
    document: (CatalogDocumentItem & { category: string }) | null | undefined,
    defaultCategory: string,
): CatalogDocumentForm {
    return {
        category: document?.category ?? defaultCategory,
        label: document?.label ?? '',
        label_en: document?.label_en ?? '',
        hint: document?.hint ?? '',
        hint_en: document?.hint_en ?? '',
    };
}

/**
 * Ajout ou modification d'une pièce du catalogue : catégorie, libellé et
 * aide en français, traductions anglaises facultatives.
 */
export function CatalogDocumentDialog({
    open,
    onOpenChange,
    categories,
    document = null,
    defaultCategory = categories[0]?.value ?? '',
}: Props) {
    const form = useForm<CatalogDocumentForm>(
        initial(document, defaultCategory),
    );
    const editing = document !== null;

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(document, defaultCategory));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, document, defaultCategory]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (document) {
            form.patch(update({ catalogDocument: document.uuid }).url, options);
        } else {
            form.post(store().url, options);
        }
    };

    const field = (
        key: keyof CatalogDocumentForm,
        label: string,
        flag: 'FR' | 'GB',
        help?: string,
        multiline = false,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`catalog-${key}`} className="gap-2">
                <CountryFlag code={flag} className="mr-2" />
                {label}
                {flag === 'GB' && <span className="sr-only"> en anglais</span>}
            </Label>
            {multiline ? (
                <Textarea
                    id={`catalog-${key}`}
                    rows={2}
                    value={form.data[key]}
                    onChange={(event) => form.setData(key, event.target.value)}
                />
            ) : (
                <Input
                    id={`catalog-${key}`}
                    value={form.data[key]}
                    onChange={(event) => form.setData(key, event.target.value)}
                    autoComplete="off"
                />
            )}
            {help && <p className="text-muted-foreground text-xs">{help}</p>}
            <InputError message={form.errors[key]} />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editing
                            ? `Modifier « ${document.label} »`
                            : 'Ajouter une pièce'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'La clé technique ne change pas : les listes déjà générées restent valables.'
                            : 'La pièce sera proposée dans le formulaire, en fin de sa catégorie.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="catalog-category">Catégorie</Label>
                        <Select
                            value={form.data.category}
                            onValueChange={(value) =>
                                form.setData('category', value)
                            }
                        >
                            <SelectTrigger
                                id="catalog-category"
                                className="w-full"
                            >
                                <SelectValue placeholder="Catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem
                                        key={category.value}
                                        value={category.value}
                                    >
                                        {category.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.category} />
                    </div>
                    {field('label', 'Libellé', 'FR')}
                    {field(
                        'hint',
                        'Aide',
                        'FR',
                        'Précision affichée sous le libellé, dans le formulaire et le PDF.',
                        true,
                    )}
                    {field('label_en', 'Libellé', 'GB')}
                    {field('hint_en', 'Aide', 'GB', undefined, true)}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {editing ? 'Enregistrer' : 'Ajouter la pièce'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
