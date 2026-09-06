import { Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CatalogDocumentDialog } from '@/components/documents/catalog-document-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { categoryIcon } from '@/lib/document-category-icons';
import { index as toolsIndex } from '@/routes/tools';
import { index as documentsIndex } from '@/routes/tools/documents';
import {
    destroy,
    index as catalogIndex,
} from '@/routes/tools/documents/catalog';
import type { CatalogAdminGroup, CatalogDocumentItem } from '@/types';

type Props = {
    groups: CatalogAdminGroup[];
    categories: { value: string; label: string }[];
};

type Editing = (CatalogDocumentItem & { category: string }) | null;

export default function DocumentsCatalog({ groups, categories }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Editing>(null);
    const [defaultCategory, setDefaultCategory] = useState(
        categories[0]?.value ?? '',
    );
    const [removing, setRemoving] = useState<CatalogDocumentItem | null>(null);
    const [busy, setBusy] = useState(false);
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);

    const add = (category: string) => {
        setEditing(null);
        setDefaultCategory(category);
        setDialogOpen(true);
    };

    const edit = (document: CatalogDocumentItem, category: string) => {
        setEditing({ ...document, category });
        setDefaultCategory(category);
        setDialogOpen(true);
    };

    const remove = () => {
        if (!removing) {
            return;
        }

        setBusy(true);
        router.delete(destroy({ catalogDocument: removing.id }).url, {
            preserveScroll: true,
            onSuccess: () => setRemoving(null),
            onFinish: () => setBusy(false),
        });
    };

    return (
        <>
            <Head title="Catalogue des pièces" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Catalogue des pièces
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {total} pièce(s) proposées dans les listes de
                            documents, par catégorie.
                        </p>
                    </div>
                    <Button onClick={() => add(categories[0]?.value ?? '')}>
                        <Plus />
                        Ajouter une pièce
                    </Button>
                </div>

                <div className="grid gap-4">
                    {groups.map((group) => {
                        const Icon = categoryIcon(group.value);

                        return (
                            <section
                                key={group.value}
                                aria-label={group.label}
                                className="bg-sidebar rounded-xl border"
                            >
                                <header className="flex items-center justify-between gap-2 px-4 py-3">
                                    <h2 className="flex items-center gap-2 text-sm font-medium">
                                        <Icon
                                            aria-hidden="true"
                                            className="text-muted-foreground size-4 shrink-0"
                                        />
                                        {group.label}
                                        <Badge variant="outline">
                                            {group.items.length}
                                        </Badge>
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => add(group.value)}
                                        aria-label={`Ajouter une pièce dans ${group.label}`}
                                    >
                                        <Plus />
                                        Ajouter
                                    </Button>
                                </header>
                                <div className="px-4 pb-4">
                                    {group.items.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            Aucune pièce dans cette catégorie.
                                        </p>
                                    ) : (
                                        <ul
                                            role="list"
                                            className="bg-background divide-y rounded-lg border"
                                        >
                                            {group.items.map((item) => (
                                                <li
                                                    key={item.id}
                                                    className="flex items-start justify-between gap-3 px-3 py-2"
                                                >
                                                    <div className="grid min-w-0 gap-0.5">
                                                        <div className="text-sm">
                                                            {item.label}
                                                        </div>
                                                        {item.hint && (
                                                            <div className="text-muted-foreground text-xs">
                                                                {item.hint}
                                                            </div>
                                                        )}
                                                        <div className="text-muted-foreground text-xs">
                                                            <span className="uppercase">
                                                                en
                                                            </span>{' '}
                                                            {item.label_en ??
                                                                'non traduit'}
                                                            {item.hint_en
                                                                ? ` · ${item.hint_en}`
                                                                : ''}
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            onClick={() =>
                                                                edit(
                                                                    item,
                                                                    group.value,
                                                                )
                                                            }
                                                            aria-label={`Modifier ${item.label}`}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-red-600 hover:text-red-700 dark:text-red-400"
                                                            onClick={() =>
                                                                setRemoving(
                                                                    item,
                                                                )
                                                            }
                                                            aria-label={`Supprimer ${item.label}`}
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            <CatalogDocumentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                categories={categories}
                document={editing}
                defaultCategory={defaultCategory}
            />

            <Dialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
            >
                <DialogContent>
                    <DialogTitle>Supprimer « {removing?.label} » ?</DialogTitle>
                    <DialogDescription>
                        La pièce ne sera plus proposée. Les listes déjà générées
                        qui la citent afficheront sa clé technique.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={remove}
                        >
                            Supprimer la pièce
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DocumentsCatalog.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Documents', href: documentsIndex() },
        { title: 'Catalogue des pièces', href: catalogIndex() },
    ],
};
