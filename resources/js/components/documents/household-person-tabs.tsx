import { DocumentUploadList } from '@/components/documents/document-upload-list';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

/** Les pièces demandées à une personne : un tableau, groupé par catégorie. */
function PersonDocuments({
    person,
    requestUuid,
    canReview = false,
}: {
    person: HouseholdPersonDetail;
    /** UUID de la liste, pour agir sur un fichier déposé ; sans lui, les fichiers ne sont pas listés. */
    requestUuid?: string;
    canReview?: boolean;
}) {
    return (
        // Même cadre que les autres tableaux du backoffice : panneau gris,
        // tableau blanc à l'intérieur — les cartes blanches sur fond blanc ne
        // se voyaient pas.
        <div className="bg-sidebar grid gap-3 rounded-xl border p-3">
            <div className="bg-background overflow-hidden rounded-lg border">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[22%]">Catégorie</TableHead>
                            <TableHead className="w-[34%]">Pièce</TableHead>
                            <TableHead>Fichiers reçus</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {person.categories.map((category) => {
                            const Icon = categoryIcon(category.value);

                            return category.documents.map((document, index) => (
                                <TableRow
                                    key={`${category.value}-${document.label}`}
                                    className="align-top"
                                >
                                    {/* La catégorie ne se répète pas : elle
                                            coiffe ses pièces. */}
                                    <TableCell>
                                        {index === 0 && (
                                            <span className="flex items-center gap-2 text-sm font-medium">
                                                <Icon
                                                    aria-hidden="true"
                                                    className="text-muted-foreground size-4 shrink-0"
                                                />
                                                <span className="truncate">
                                                    {category.label}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="tabular-nums"
                                                >
                                                    {category.documents.length}
                                                </Badge>
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="grid gap-0.5">
                                            <span className="text-sm">
                                                {document.label}
                                            </span>
                                            {document.hint && (
                                                <span className="text-muted-foreground text-xs">
                                                    {document.hint}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {requestUuid &&
                                        document.uploads &&
                                        document.uploads.length > 0 ? (
                                            <DocumentUploadList
                                                requestUuid={requestUuid}
                                                uploads={document.uploads}
                                                canReview={canReview}
                                            />
                                        ) : (
                                            <span className="text-muted-foreground text-sm">
                                                Rien de déposé
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ));
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

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
