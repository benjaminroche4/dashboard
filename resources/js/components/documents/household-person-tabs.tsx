import { DocumentUploadField } from '@/components/documents/document-upload-field';
import { DocumentUploadList } from '@/components/documents/document-upload-list';
import { personDocumentRows } from '@/components/documents/person-document-columns';
import { documentReview } from '@/components/documents/upload-status';
import { Fragment } from 'react';
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
import { cn } from '@/lib/utils';
import type { DocumentUploadStatus, HouseholdPersonDetail } from '@/types';

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

/** État d'une pièce demandée, d'après ses fichiers : ce qu'il reste à faire. */
type PieceState = 'none' | DocumentUploadStatus;

const pieceStates: Record<PieceState, { label: string; className: string }> = {
    none: {
        label: 'À déposer',
        className: 'text-muted-foreground border-dashed',
    },
    pending: {
        label: 'À vérifier',
        className:
            'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    },
    accepted: {
        label: 'Validée',
        className:
            'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300',
    },
    refused: {
        label: 'Refusée',
        className:
            'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
    },
};

/**
 * Où en est une personne : combien de pièces validées, à vérifier, refusées,
 * encore à déposer. C'est la ligne qu'on lit avant le tableau.
 */
export function pieceCounts(
    person: HouseholdPersonDetail,
): Record<PieceState, number> {
    const counts: Record<PieceState, number> = {
        none: 0,
        pending: 0,
        accepted: 0,
        refused: 0,
    };

    for (const row of personDocumentRows(person)) {
        counts[documentReview(row.uploads)] += 1;
    }

    return counts;
}

function PersonSummary({ person }: { person: HouseholdPersonDetail }) {
    const counts = pieceCounts(person);
    const total = pieces(person);
    const parts = [
        counts.accepted > 0 && `${counts.accepted} validée(s)`,
        counts.pending > 0 && `${counts.pending} à vérifier`,
        counts.refused > 0 && `${counts.refused} refusée(s)`,
        counts.none > 0 && `${counts.none} à déposer`,
    ].filter(Boolean);
    const percent =
        total === 0 ? 0 : Math.round((counts.accepted / total) * 100);

    return (
        <div className="grid gap-2">
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
                <Badge variant="outline">{person.role}</Badge>
                <span className="tabular-nums">
                    {total === 1
                        ? '1 pièce demandée'
                        : `${total} pièces demandées`}
                    {parts.length > 0 && ` · ${parts.join(' · ')}`}
                </span>
            </p>
            {/* La part validée, en un coup d'œil : la même barre que
                l'avancement d'un dossier. */}
            <div
                role="progressbar"
                aria-label={`${counts.accepted} pièce(s) validée(s) sur ${total}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="bg-muted h-1.5 w-full max-w-xs overflow-hidden rounded-full"
            >
                <div
                    className="h-full rounded-full bg-green-600 transition-[width] dark:bg-green-500"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Les pièces demandées à une personne : un tableau simple, une ligne par
 * pièce dans l'ordre du catalogue, avec son état et ses fichiers. Pas de
 * filtre ni de sélection — une personne n'a jamais plus d'une trentaine de
 * pièces, elles se lisent d'un regard.
 */
function PersonDocuments({
    person,
    personIndex,
    requestUuid,
    canReview = false,
}: {
    person: HouseholdPersonDetail;
    /** Rang de la personne dans le foyer : c'est lui que porte un dépôt. */
    personIndex: number;
    /** UUID de la liste, pour agir sur un fichier déposé ; sans lui, les fichiers ne sont pas listés. */
    requestUuid?: string;
    canReview?: boolean;
}) {
    const rows = personDocumentRows(person);

    return (
        <div className="bg-sidebar rounded-xl border p-3">
            <div className="bg-background overflow-x-auto rounded-lg border">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pièce</TableHead>
                            <TableHead className="w-24">État</TableHead>
                            <TableHead className="w-[48%]">
                                Fichiers reçus
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => {
                            const Icon = categoryIcon(row.category);
                            const state =
                                pieceStates[documentReview(row.uploads)];
                            // La catégorie coiffe son groupe sur une ligne à
                            // elle, plutôt qu'une colonne qui la répète et
                            // mange la place des fichiers.
                            const firstOfGroup =
                                index === 0 ||
                                rows[index - 1]?.category !== row.category;

                            return (
                                <Fragment key={`${row.category}-${row.label}`}>
                                    {firstOfGroup && (
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableCell
                                                colSpan={3}
                                                className="text-muted-foreground py-1.5 text-xs font-medium tracking-wide uppercase"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Icon
                                                        aria-hidden="true"
                                                        className="size-3.5 shrink-0"
                                                    />
                                                    {row.categoryLabel}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow className="align-top">
                                        <TableCell className="whitespace-normal">
                                            <div className="grid gap-0.5">
                                                {/* Le nom de la catégorie reste
                                                    lisible sur la ligne pour un
                                                    lecteur d'écran. */}
                                                <span className="sr-only">
                                                    {row.categoryLabel}
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {row.label}
                                                </span>
                                                {row.hint && (
                                                    <span className="text-muted-foreground text-xs">
                                                        {row.hint}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'font-medium',
                                                    state.className,
                                                )}
                                            >
                                                {state.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-normal">
                                            <div className="grid gap-2">
                                                {requestUuid &&
                                                row.uploads.length > 0 ? (
                                                    <DocumentUploadList
                                                        requestUuid={
                                                            requestUuid
                                                        }
                                                        uploads={row.uploads}
                                                        canReview={canReview}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">
                                                        Rien de déposé
                                                    </span>
                                                )}
                                                {/* L'équipe verse ici une pièce
                                                    reçue par ailleurs. */}
                                                {requestUuid &&
                                                    canReview &&
                                                    row.key && (
                                                        <div>
                                                            <DocumentUploadField
                                                                requestUuid={
                                                                    requestUuid
                                                                }
                                                                personIndex={
                                                                    personIndex
                                                                }
                                                                documentKey={
                                                                    row.key
                                                                }
                                                                label={
                                                                    row.label
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            );
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
                    <PersonSummary person={person} />
                    <PersonDocuments
                        person={person}
                        personIndex={index}
                        requestUuid={requestUuid}
                        canReview={canReview}
                    />
                </TabsContent>
            ))}
        </Tabs>
    );
}
