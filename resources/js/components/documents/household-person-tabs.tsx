import { DataTable } from '@/components/data-table';
import {
    personDocumentColumnLabels,
    personDocumentColumns,
    personDocumentRows,
} from '@/components/documents/person-document-columns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

/** Les pièces demandées à une personne : la Data Table du backoffice. */
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
        <DataTable
            columns={personDocumentColumns(requestUuid, canReview)}
            data={personDocumentRows(person)}
            filterColumn="label"
            filterPlaceholder="Filtrer par pièce…"
            columnLabels={personDocumentColumnLabels}
            frame="panel"
        />
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
