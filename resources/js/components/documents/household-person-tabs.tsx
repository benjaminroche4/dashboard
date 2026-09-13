import { DocumentUploadList } from '@/components/documents/document-upload-list';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { categoryIcon } from '@/lib/document-category-icons';
import type { HouseholdPersonDetail } from '@/types';

/** « Personne 2 » tant que le nom n'est pas saisi. */
export function personName(person: HouseholdPersonDetail, index: number) {
    return person.name !== '' ? person.name : `Personne ${index + 1}`;
}

function pieces(person: HouseholdPersonDetail) {
    return person.categories.reduce(
        (total, category) => total + category.documents.length,
        0,
    );
}

/** Les pièces demandées à une personne, groupées par catégorie. */
function PersonDocuments({
    person,
    requestUuid,
    canReview = false,
}: {
    person: HouseholdPersonDetail;
    /** UUID de la liste, pour supprimer un fichier déposé ; sans lui, les fichiers ne sont pas listés. */
    requestUuid?: string;
    canReview?: boolean;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {person.categories.map((category) => {
                const Icon = categoryIcon(category.value);

                return (
                    <section
                        key={category.value}
                        aria-label={category.label}
                        className="bg-card grid content-start gap-1.5 rounded-xl border p-4"
                    >
                        <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                            <Icon
                                aria-hidden="true"
                                className="size-4 shrink-0"
                            />
                            {category.label}
                            <span className="text-foreground inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 text-[11px] font-medium tabular-nums">
                                {category.documents.length}
                            </span>
                        </h3>
                        <ul className="divide-border divide-y">
                            {category.documents.map((document) => (
                                <li key={document.label} className="py-2">
                                    <div className="text-sm">
                                        {document.label}
                                    </div>
                                    {document.hint && (
                                        <div className="text-muted-foreground text-xs">
                                            {document.hint}
                                        </div>
                                    )}
                                    {requestUuid &&
                                        document.uploads &&
                                        document.uploads.length > 0 && (
                                            <div className="mt-2">
                                                <DocumentUploadList
                                                    requestUuid={requestUuid}
                                                    uploads={document.uploads}
                                                    canReview={canReview}
                                                />
                                            </div>
                                        )}
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

/**
 * Les personnes du foyer en onglets — un foyer en compte jusqu'à quatre, et
 * des cartes côte à côte obligeaient à comparer des colonnes de hauteurs
 * différentes. Un onglet par personne : son rôle et son nombre de pièces se
 * lisent sur l'onglet, ses pièces occupent toute la largeur.
 */
export function HouseholdPersonTabs({
    persons,
    requestUuid,
    canReview = false,
}: {
    persons: HouseholdPersonDetail[];
    requestUuid?: string;
    /** Valider ou refuser une pièce : réservé à qui peut modifier la liste. */
    canReview?: boolean;
}) {
    if (persons.length === 0) {
        return null;
    }

    return (
        <Tabs defaultValue="person-0" className="gap-4">
            <TabsList variant="line" className="w-full justify-start border-b">
                {persons.map((person, index) => (
                    <TabsTrigger
                        key={index}
                        value={`person-${index}`}
                        className="flex-none px-3"
                    >
                        {personName(person, index)}
                        <Badge
                            variant="secondary"
                            className="font-medium tabular-nums"
                            aria-label={`${pieces(person)} pièce(s)`}
                        >
                            {pieces(person)}
                        </Badge>
                    </TabsTrigger>
                ))}
            </TabsList>
            {persons.map((person, index) => (
                <TabsContent
                    key={index}
                    value={`person-${index}`}
                    aria-label={personName(person, index)}
                    className="grid gap-3"
                >
                    <p className="text-muted-foreground text-sm">
                        <Badge variant="outline" className="mr-2">
                            {person.role}
                        </Badge>
                        {pieces(person) === 1
                            ? '1 pièce demandée'
                            : `${pieces(person)} pièces demandées`}
                    </p>
                    <PersonDocuments
                        person={person}
                        requestUuid={requestUuid}
                        canReview={canReview}
                    />
                </TabsContent>
            ))}
        </Tabs>
    );
}
