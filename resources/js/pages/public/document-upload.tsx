import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import {
    Attachment,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from '@/components/ui/attachment';
import { Dropzone, DropzoneEmptyState } from '@/components/ui/dropzone';
import type { FileRejection } from 'react-dropzone';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    uploadStatusText,
    uploadStatusTones,
} from '@/components/documents/upload-status';
import { TrustNotice } from '@/components/public/trust-notice';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { categoryIcon } from '@/lib/document-category-icons';
import { formatFileSize } from '@/lib/format';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { DocumentLanguage, PublicDocumentPerson } from '@/types';

const ACCEPT = { 'application/pdf': ['.pdf'] };

/** Ce que le serveur accepte, calculé d'après les limites de PHP. */
export type UploadLimits = { file: number; files: number; total: number };

/**
 * Motif de refus d'un fichier, dit au client dans sa langue : react-dropzone
 * ne renvoie que des phrases anglaises avec des octets bruts.
 */
export function rejectionMessage(
    rejections: FileRejection[],
    labels: { too_large: string; wrong_type: string; too_many: string },
): string {
    const first = rejections[0];
    const code = first?.errors[0]?.code;
    const name = first?.file.name ?? '';

    if (code === 'too-many-files') {
        return labels.too_many;
    }

    return `${code === 'file-too-large' ? labels.too_large : labels.wrong_type} ${name}`;
}

type Props = {
    request: {
        name: string;
        language: DocumentLanguage;
        message: string | null;
        persons: PublicDocumentPerson[];
    };
    uploadUrl: string;
    company: { name: string; email: string; phone: string };
    limits: UploadLimits;
    labels: Record<
        | 'title'
        | 'intro'
        | 'drop'
        | 'formats'
        | 'too_large'
        | 'wrong_type'
        | 'too_many'
        | 'too_heavy'
        | 'uploaded'
        | 'view'
        | 'none'
        | 'sending'
        | 'done'
        | 'privacy_title'
        | 'privacy_secure'
        | 'privacy_private'
        | 'privacy_kept'
        | 'progress'
        | 'refused',
        string
    >;
};

/** Nombre de pièces ayant au moins un fichier, sur le total demandé. */
export function uploadProgress(persons: PublicDocumentPerson[]): {
    done: number;
    total: number;
} {
    let done = 0;
    let total = 0;

    for (const person of persons) {
        for (const category of person.categories) {
            for (const document of category.documents) {
                total += 1;

                if (document.uploads.length > 0) {
                    done += 1;
                }
            }
        }
    }

    return { done, total };
}

/**
 * Pièces d'une personne : celles qui ont au moins un fichier, sur le total
 * qu'on lui demande. C'est ce que porte son onglet, avec la même règle que
 * le compteur de la page.
 */
export function personProgress(person: PublicDocumentPerson): {
    done: number;
    total: number;
} {
    return uploadProgress([person]);
}

/**
 * Page publique de dépôt des pièces (/depot/{jeton}) : le client dépose ses
 * fichiers pièce par pièce, dans sa langue, sans compte.
 */
export default function PublicDocumentUpload({
    request,
    uploadUrl,
    company,
    limits,
    labels,
}: Props) {
    useFlashToast();
    const { errors } = usePage().props;
    const [pending, setPending] = useState<string | null>(null);
    // Personne affichée : la première du foyer par défaut.
    const [active, setActive] = useState(request.persons[0]?.index ?? 0);
    const progress = uploadProgress(request.persons);

    const send = (personIndex: number, documentKey: string, files: File[]) => {
        const slot = `${personIndex}:${documentKey}`;
        const weight = files.reduce((total, file) => total + file.size, 0);

        // Au-delà, PHP refuse l'envoi entier avant même d'arriver à Laravel.
        if (weight > limits.total) {
            notify.error(labels.too_heavy);

            return;
        }

        router.post(
            uploadUrl,
            { person: personIndex, document: documentKey, files },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setPending(slot),
                onFinish: () => setPending(null),
            },
        );
    };

    const firstError = Object.values(errors ?? {})[0];

    return (
        <>
            <Head title={`${labels.title} · ${company.name}`} />
            <main
                lang={request.language}
                className="bg-background text-foreground min-h-dvh"
            >
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
                    <header className="grid gap-3">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo.jpg"
                                alt=""
                                className="size-10 rounded-md border"
                            />
                            <p className="text-muted-foreground text-sm">
                                {company.name}
                            </p>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight text-balance">
                            {labels.title}
                        </h1>
                        <p className="text-muted-foreground text-pretty">
                            {request.name} · {labels.intro}
                        </p>
                        {request.message && (
                            <p className="bg-sidebar rounded-lg border p-4 text-sm whitespace-pre-line">
                                {request.message}
                            </p>
                        )}
                        <div
                            role="status"
                            aria-live="polite"
                            className="flex items-center gap-3 text-sm"
                        >
                            <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                                <span
                                    className="bg-foreground block h-full rounded-full transition-[width]"
                                    style={{
                                        width: `${progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)}%`,
                                    }}
                                />
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                                {labels.progress
                                    .replace(':done', String(progress.done))
                                    .replace(':total', String(progress.total))}
                            </span>
                        </div>
                        {firstError && (
                            <p role="alert" className="text-sm text-red-600">
                                {firstError}
                            </p>
                        )}
                    </header>

                    <Tabs
                        value={String(active)}
                        onValueChange={(value) => setActive(Number(value))}
                        className="gap-5"
                    >
                        {/* Une personne, pas d'onglets : il n'y a rien à
                            choisir. À plusieurs, la barre reste collée en
                            haut pour qu'on sache toujours qui l'on remplit. */}
                        {request.persons.length > 1 && (
                            <TabsList
                                variant="line"
                                className="bg-background sticky top-0 z-10 w-full justify-start overflow-x-auto py-2"
                            >
                                {request.persons.map((person) => {
                                    const count = personProgress(person);

                                    return (
                                        <TabsTrigger
                                            key={person.index}
                                            value={String(person.index)}
                                        >
                                            {person.name}
                                            <span className="text-muted-foreground tabular-nums">
                                                {count.done}/{count.total}
                                            </span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        )}
                        {request.persons.map((person) => (
                            <TabsContent
                                key={person.index}
                                value={String(person.index)}
                                aria-label={person.name}
                                className="grid gap-5"
                            >
                                {/* Le nom vit dans l'onglet, qui reste collé
                                    en haut : inutile de le répéter ici. Seul
                                    un foyer sans onglets a besoin de son
                                    titre, et le rôle ne dit rien au client. */}
                                {request.persons.length === 1 && (
                                    <h2 className="text-lg font-medium">
                                        {person.name}
                                    </h2>
                                )}
                                {person.categories.map((category) => {
                                    const Icon = categoryIcon(category.value);

                                    return (
                                        <section
                                            key={category.value}
                                            aria-label={category.label}
                                            className="grid gap-3"
                                        >
                                            <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                                                <Icon
                                                    aria-hidden
                                                    className="size-4 shrink-0"
                                                />
                                                {category.label}
                                            </h3>
                                            <ul
                                                role="list"
                                                className="grid gap-3"
                                            >
                                                {category.documents.map(
                                                    (document) => {
                                                        const slot = `${person.index}:${document.key}`;
                                                        const received =
                                                            document.uploads
                                                                .length > 0;
                                                        const busy =
                                                            pending === slot;

                                                        return (
                                                            <li
                                                                key={
                                                                    document.key
                                                                }
                                                                className={cn(
                                                                    'grid gap-3 rounded-xl border p-4',
                                                                    received &&
                                                                        'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20',
                                                                )}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium">
                                                                            {
                                                                                document.label
                                                                            }
                                                                        </p>
                                                                        {document.hint && (
                                                                            <p className="text-muted-foreground text-sm">
                                                                                {
                                                                                    document.hint
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {received && (
                                                                        <span className="flex shrink-0 items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
                                                                            <CheckCircle2
                                                                                className="size-4"
                                                                                aria-hidden
                                                                            />
                                                                            {
                                                                                labels.done
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {received && (
                                                                    <ul
                                                                        role="list"
                                                                        aria-label={`${labels.uploaded} · ${document.label}`}
                                                                        className="flex flex-wrap gap-2"
                                                                    >
                                                                        {document.uploads.map(
                                                                            (
                                                                                upload,
                                                                            ) => (
                                                                                <li
                                                                                    key={
                                                                                        upload.uuid
                                                                                    }
                                                                                    className="grid min-w-0 gap-1"
                                                                                >
                                                                                    {/* Relire ce qu'on vient
                                                                                        de déposer : le PDF
                                                                                        s'ouvre dans un onglet. */}
                                                                                    <a
                                                                                        href={
                                                                                            upload.url
                                                                                        }
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        title={`${labels.view} · ${upload.name}`}
                                                                                        className="focus-visible:ring-ring flex min-w-0 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                                                                                    >
                                                                                        <Attachment
                                                                                            size="sm"
                                                                                            className={cn(
                                                                                                'hover:border-foreground/30 transition-colors',
                                                                                                uploadStatusTones[
                                                                                                    upload
                                                                                                        .status
                                                                                                ],
                                                                                            )}
                                                                                        >
                                                                                            <AttachmentMedia>
                                                                                                <FileText
                                                                                                    aria-hidden
                                                                                                />
                                                                                            </AttachmentMedia>
                                                                                            <AttachmentContent>
                                                                                                <AttachmentTitle>
                                                                                                    {
                                                                                                        upload.name
                                                                                                    }
                                                                                                </AttachmentTitle>
                                                                                                <AttachmentDescription>
                                                                                                    {formatFileSize(
                                                                                                        upload.size,
                                                                                                    )}{' '}
                                                                                                    ·{' '}
                                                                                                    {
                                                                                                        labels.view
                                                                                                    }
                                                                                                </AttachmentDescription>
                                                                                            </AttachmentContent>
                                                                                        </Attachment>
                                                                                    </a>
                                                                                    {/* La décision de l'équipe, et
                                                                                        le motif d'un refus : le
                                                                                        client sait quoi redéposer. */}
                                                                                    <p
                                                                                        className={cn(
                                                                                            'px-1 text-xs',
                                                                                            uploadStatusText[
                                                                                                upload
                                                                                                    .status
                                                                                            ],
                                                                                        )}
                                                                                    >
                                                                                        {
                                                                                            upload.status_label
                                                                                        }
                                                                                        {upload.review_note &&
                                                                                            ` — ${upload.review_note}`}
                                                                                    </p>
                                                                                </li>
                                                                            ),
                                                                        )}
                                                                    </ul>
                                                                )}
                                                                <Dropzone
                                                                    accept={
                                                                        ACCEPT
                                                                    }
                                                                    maxFiles={
                                                                        limits.files
                                                                    }
                                                                    maxSize={
                                                                        limits.file
                                                                    }
                                                                    multiple
                                                                    disabled={
                                                                        busy
                                                                    }
                                                                    aria-label={`${labels.drop} · ${document.label}`}
                                                                    onDrop={(
                                                                        files,
                                                                    ) =>
                                                                        send(
                                                                            person.index,
                                                                            document.key,
                                                                            files,
                                                                        )
                                                                    }
                                                                    onRejected={(
                                                                        rejections,
                                                                    ) =>
                                                                        notify.error(
                                                                            rejectionMessage(
                                                                                rejections,
                                                                                labels,
                                                                            ),
                                                                        )
                                                                    }
                                                                    className="bg-background p-5"
                                                                >
                                                                    <DropzoneEmptyState>
                                                                        <div className="flex flex-col items-center justify-center gap-1 text-center">
                                                                            {busy ? (
                                                                                <Spinner />
                                                                            ) : (
                                                                                <UploadCloud
                                                                                    className="text-muted-foreground size-5"
                                                                                    aria-hidden
                                                                                />
                                                                            )}
                                                                            <p className="text-sm font-medium text-wrap">
                                                                                {busy
                                                                                    ? labels.sending
                                                                                    : labels.drop}
                                                                            </p>
                                                                            <p className="text-muted-foreground text-xs text-wrap">
                                                                                {
                                                                                    labels.formats
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </DropzoneEmptyState>
                                                                </Dropzone>
                                                            </li>
                                                        );
                                                    },
                                                )}
                                            </ul>
                                        </section>
                                    );
                                })}
                            </TabsContent>
                        ))}
                    </Tabs>

                    <footer className="border-t pt-6">
                        <TrustNotice labels={labels} />
                    </footer>
                </div>
            </main>
        </>
    );
}
