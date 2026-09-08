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
import { Badge } from '@/components/ui/badge';
import { Dropzone, DropzoneEmptyState } from '@/components/ui/dropzone';
import { Spinner } from '@/components/ui/spinner';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { categoryIcon } from '@/lib/document-category-icons';
import { formatFileSize } from '@/lib/format';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { DocumentLanguage, PublicDocumentPerson } from '@/types';

type Props = {
    request: {
        name: string;
        language: DocumentLanguage;
        message: string | null;
        persons: PublicDocumentPerson[];
    };
    uploadUrl: string;
    company: { name: string; email: string; phone: string };
    labels: Record<
        | 'title'
        | 'intro'
        | 'drop'
        | 'formats'
        | 'uploaded'
        | 'none'
        | 'sending'
        | 'done'
        | 'contact'
        | 'privacy'
        | 'progress',
        string
    >;
};

const ACCEPT = { 'application/pdf': ['.pdf'] };
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

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
 * Page publique de dépôt des pièces (/depot/{jeton}) : le client dépose ses
 * fichiers pièce par pièce, dans sa langue, sans compte.
 */
export default function PublicDocumentUpload({
    request,
    uploadUrl,
    company,
    labels,
}: Props) {
    useFlashToast();
    const { errors } = usePage().props;
    const [pending, setPending] = useState<string | null>(null);
    const progress = uploadProgress(request.persons);

    const send = (personIndex: number, documentKey: string, files: File[]) => {
        const slot = `${personIndex}:${documentKey}`;

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

                    {request.persons.map((person) => (
                        <section
                            key={person.index}
                            aria-label={person.name}
                            className="grid gap-5"
                        >
                            <div className="flex items-center gap-2 border-b pb-2">
                                <h2 className="text-lg font-medium">
                                    {person.name}
                                </h2>
                                <Badge variant="outline">{person.role}</Badge>
                            </div>
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
                                        <ul role="list" className="grid gap-3">
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
                                                            key={document.key}
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
                                                                                className="flex min-w-0"
                                                                            >
                                                                                <Attachment
                                                                                    size="sm"
                                                                                    className="bg-background"
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
                                                                                            )}
                                                                                        </AttachmentDescription>
                                                                                    </AttachmentContent>
                                                                                </Attachment>
                                                                            </li>
                                                                        ),
                                                                    )}
                                                                </ul>
                                                            )}
                                                            <Dropzone
                                                                accept={ACCEPT}
                                                                maxFiles={
                                                                    MAX_FILES
                                                                }
                                                                maxSize={
                                                                    MAX_SIZE
                                                                }
                                                                multiple
                                                                disabled={busy}
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
                                                                onError={(
                                                                    error,
                                                                ) =>
                                                                    notify.error(
                                                                        labels.formats,
                                                                        error.message,
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
                        </section>
                    ))}

                    <footer className="text-muted-foreground grid gap-1 border-t pt-6 text-sm">
                        <p>{labels.privacy}</p>
                        <p>
                            {labels.contact}{' '}
                            <a
                                href={`mailto:${company.email}`}
                                className="text-foreground underline-offset-4 hover:underline"
                            >
                                {company.email}
                            </a>{' '}
                            · {company.phone}
                        </p>
                    </footer>
                </div>
            </main>
        </>
    );
}
