import { Head, Link, useForm } from '@inertiajs/react';
import { Check, CircleDashed, FileDown, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { HouseholdPersonCard } from '@/components/documents/household-person-card';
import { FormActionBar } from '@/components/form-action-bar';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    emptyDocumentRequestForm,
    emptyPerson,
    MAX_PERSONS,
    personIndexFromErrorKey,
    personName,
    personStatus,
    validateDocumentRequestForm,
    type DocumentRequestFormErrors,
} from '@/lib/document-request-form';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { show as leadShow } from '@/routes/leads';
import { index as toolsIndex } from '@/routes/tools';
import {
    index as documentsIndex,
    show as documentsShow,
    store,
    update,
} from '@/routes/tools/documents';
import type {
    CatalogGroup,
    DocumentLanguage,
    DocumentRequestEdit,
    DocumentRequestForm,
    DocumentRequestPrefill,
    HouseholdPersonForm,
    HouseholdRole,
} from '@/types';

type Props = {
    catalog: CatalogGroup[];
    roles: { value: HouseholdRole; label: string }[];
    languages: { value: DocumentLanguage; label: string }[];
    /** Liste existante : la page passe en mode modification. */
    request?: DocumentRequestEdit;
    /** Création depuis une fiche lead : première personne et langue préremplies. */
    prefill?: DocumentRequestPrefill | null;
};

export default function DocumentsCreate({
    catalog,
    roles,
    languages,
    request,
    prefill = null,
}: Props) {
    const form = useForm<DocumentRequestForm>(
        request
            ? {
                  language: request.language,
                  message: request.message,
                  upload_url: request.upload_url,
                  persons: request.persons,
              }
            : prefill
              ? {
                    ...emptyDocumentRequestForm(),
                    language: prefill.language,
                    persons: [
                        {
                            ...emptyPerson(),
                            first_name: prefill.first_name,
                            last_name: prefill.last_name,
                        },
                    ],
                }
              : emptyDocumentRequestForm(),
    );
    const leadId = request ? request.lead_id : (prefill?.lead_id ?? null);
    const [localErrors, setLocalErrors] = useState<DocumentRequestFormErrors>(
        {},
    );
    /** Personne affichée : une seule à la fois, les autres sont repliées. */
    const [active, setActive] = useState(0);
    const errors: Record<string, string | undefined> = {
        ...localErrors,
        ...(form.errors as Record<string, string>),
    };

    const persons = form.data.persons;
    const current = persons[active] ?? persons[0];
    const activeIndex = persons[active] ? active : 0;

    const setPerson = (index: number, person: HouseholdPersonForm) => {
        form.setData(
            'persons',
            persons.map((candidate, i) => (i === index ? person : candidate)),
        );
    };

    const addPerson = () => {
        if (persons.length >= MAX_PERSONS) {
            return;
        }

        form.setData('persons', [...persons, emptyPerson()]);
        setActive(persons.length);
    };

    const removePerson = (index: number) => {
        form.setData(
            'persons',
            persons.filter((_, i) => i !== index),
        );
        setActive((value) => (value >= index ? Math.max(0, value - 1) : value));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const found = validateDocumentRequestForm(form.data);
        setLocalErrors(found);

        if (Object.keys(found).length > 0) {
            notify.error(
                'Formulaire incomplet',
                'Corrigez les champs signalés avant de créer la demande.',
            );

            // Une personne en erreur est peut-être repliée : on l'affiche en priorité.
            const keys = Object.keys(found);
            const first = keys[0] ?? '';
            const personIndex =
                keys
                    .map(personIndexFromErrorKey)
                    .find((index) => index !== null) ?? null;

            if (personIndex !== null) {
                setActive(personIndex);
            }

            document
                .getElementById(
                    personIndex !== null ? `person-${personIndex}` : first,
                )
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return;
        }

        form.transform((data) => ({
            ...data,
            lead_id: leadId,
            message: data.message.trim() === '' ? null : data.message.trim(),
        }));

        if (request) {
            form.put(update({ documentRequest: request.uuid }).url);
        } else {
            form.post(store().url);
        }
    };

    const cancelHref = request
        ? documentsShow({ documentRequest: request.uuid })
        : toolsIndex();

    const errorsFor = (index: number) => ({
        first_name: errors[`persons.${index}.first_name`],
        last_name: errors[`persons.${index}.last_name`],
        documents: errors[`persons.${index}.documents`],
    });

    const hasErrors = (index: number) =>
        Object.values(errorsFor(index)).some((value) => value !== undefined);

    return (
        <>
            <Head
                title={
                    request
                        ? `Modifier la liste de ${request.name}`
                        : 'Liste de documents'
                }
            />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
                <div className="flex items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            {request
                                ? `Modifier la liste de ${request.name}`
                                : 'Liste de documents'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {prefill ? (
                                <>
                                    Pour le lead{' '}
                                    <Link
                                        href={leadShow({
                                            lead: prefill.lead_uuid,
                                        })}
                                        className="text-foreground font-medium underline-offset-4 hover:underline"
                                    >
                                        {prefill.lead_name}
                                    </Link>
                                    , la liste lui sera rattachée.
                                </>
                            ) : (
                                'Préparez le PDF des pièces à fournir par chaque personne du foyer, avec le lien sécurisé où les déposer.'
                            )}
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={documentsIndex()}>Voir les listes</Link>
                    </Button>
                </div>

                <form
                    id="document-request-form"
                    onSubmit={submit}
                    className="grid gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_280px]"
                >
                    <div className="grid gap-6">
                        {/* Personnes : une seule carte visible, navigation dans le récapitulatif à droite */}
                        <div className="grid gap-3">
                            <InputError message={errors.persons} />

                            {current && (
                                <div>
                                    <HouseholdPersonCard
                                        key={activeIndex}
                                        index={activeIndex}
                                        total={persons.length}
                                        person={current}
                                        catalog={catalog}
                                        roles={roles}
                                        errors={errorsFor(activeIndex)}
                                        onChange={(next) =>
                                            setPerson(activeIndex, next)
                                        }
                                        onRemove={
                                            persons.length > 1
                                                ? () =>
                                                      removePerson(activeIndex)
                                                : undefined
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {/* Réglages du PDF */}
                        <section
                            aria-label="Message et lien de dépôt"
                            className="bg-sidebar rounded-xl border"
                        >
                            <header className="px-4 pt-4 pb-3">
                                <h2 className="text-sm font-medium">
                                    Message et lien de dépôt
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Contenu commun à toutes les personnes,
                                    imprimé dans le PDF.
                                </p>
                            </header>
                            <div className="grid gap-4 px-4 pb-4">
                                <div className="grid gap-2">
                                    <Label>Langue du PDF</Label>
                                    <RadioGroup
                                        aria-label="Langue du PDF"
                                        value={form.data.language}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'language',
                                                value as DocumentLanguage,
                                            )
                                        }
                                        className="flex flex-wrap gap-3"
                                    >
                                        {languages.map((language) => (
                                            <Label
                                                key={language.value}
                                                htmlFor={`language-${language.value}`}
                                                className="bg-background has-data-[state=checked]:border-primary has-data-[state=checked]:ring-primary/20 hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal transition-colors has-data-[state=checked]:ring-2"
                                            >
                                                <RadioGroupItem
                                                    id={`language-${language.value}`}
                                                    value={language.value}
                                                />
                                                <CountryFlag
                                                    code={
                                                        language.value === 'en'
                                                            ? 'GB'
                                                            : 'FR'
                                                    }
                                                />
                                                {language.label}
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="message">
                                        Message libre pour le client
                                    </Label>
                                    <p className="text-muted-foreground text-xs">
                                        Affiché dans le PDF. À rédiger dans la
                                        langue du client.
                                    </p>
                                    <Textarea
                                        id="message"
                                        rows={4}
                                        value={form.data.message}
                                        onChange={(event) =>
                                            form.setData(
                                                'message',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ajoutez un mot d'introduction, des consignes particulières, un rappel d'échéance…"
                                        className="bg-background"
                                    />
                                    <InputError message={errors.message} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="upload_url">
                                        Lien sécurisé de dépôt{' '}
                                        <span className="text-red-600">*</span>
                                    </Label>
                                    <p className="text-muted-foreground text-xs">
                                        Lien où le client déposera ses pièces.
                                        Sera inclus dans le PDF.
                                    </p>
                                    <Input
                                        id="upload_url"
                                        type="url"
                                        inputMode="url"
                                        value={form.data.upload_url}
                                        onChange={(event) =>
                                            form.setData(
                                                'upload_url',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://drive.google.com/..."
                                        className="bg-background"
                                    />
                                    <InputError message={errors.upload_url} />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Récapitulatif du foyer */}
                    <aside
                        aria-label="Personnes du foyer"
                        className="bg-sidebar h-fit rounded-xl border lg:sticky lg:top-6"
                    >
                        <header className="flex items-baseline justify-between px-4 pt-4 pb-3">
                            <h2 className="text-sm font-medium">
                                Personnes du foyer
                            </h2>
                            <span className="text-muted-foreground text-xs tabular-nums">
                                {persons.length}/{MAX_PERSONS} max
                            </span>
                        </header>
                        <ul role="list" className="grid gap-1 px-4">
                            {persons.map((person, index) => {
                                const status = personStatus(person);
                                const role = roles.find(
                                    (candidate) =>
                                        candidate.value === person.role,
                                )?.label;
                                const selected = index === activeIndex;

                                return (
                                    <li key={index}>
                                        <button
                                            type="button"
                                            onClick={() => setActive(index)}
                                            aria-current={
                                                selected ? 'true' : undefined
                                            }
                                            className={cn(
                                                'hover:bg-background hover:border-border flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm transition-colors',
                                                selected &&
                                                    'bg-background border-primary ring-primary/20 hover:border-primary font-medium ring-2',
                                                !selected &&
                                                    hasErrors(index) &&
                                                    'border-red-500/60',
                                            )}
                                        >
                                            {status.complete ? (
                                                <Check
                                                    aria-hidden="true"
                                                    className="size-4 text-green-600"
                                                />
                                            ) : (
                                                <CircleDashed
                                                    aria-hidden="true"
                                                    className="text-muted-foreground size-4"
                                                />
                                            )}
                                            <span className="grid min-w-0 flex-1">
                                                <span className="truncate">
                                                    {personName(person, index)}
                                                    {role && (
                                                        <span className="text-muted-foreground">
                                                            {' '}
                                                            · {role}
                                                        </span>
                                                    )}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'text-xs',
                                                        status.complete
                                                            ? 'text-muted-foreground'
                                                            : 'text-amber-700 dark:text-amber-400',
                                                    )}
                                                >
                                                    {status.complete
                                                        ? status.label
                                                        : `à compléter · ${status.label}`}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="px-4 pt-3 pb-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={addPerson}
                                disabled={persons.length >= MAX_PERSONS}
                            >
                                <Plus />
                                Ajouter une personne
                            </Button>
                        </div>
                    </aside>
                </form>
            </div>

            <FormActionBar>
                <Button variant="ghost" asChild>
                    <Link href={cancelHref}>Annuler</Link>
                </Button>
                <Button
                    type="submit"
                    form="document-request-form"
                    disabled={form.processing}
                >
                    {form.processing ? <Spinner /> : <FileDown />}
                    {request
                        ? 'Enregistrer les modifications'
                        : 'Créer la demande'}
                </Button>
            </FormActionBar>
        </>
    );
}

DocumentsCreate.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Documents', href: documentsIndex() },
        { title: 'Nouvelle liste', href: '#' },
    ],
};
