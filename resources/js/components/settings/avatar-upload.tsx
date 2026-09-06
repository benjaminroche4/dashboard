import { router } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import AvatarController from '@/actions/App/Http/Controllers/Settings/AvatarController';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

type Props = {
    user: User;
    /** Erreur de validation renvoyée par le serveur. */
    error?: string;
};

/**
 * Photo de profil : aperçu, choix d'un fichier (envoyé immédiatement) et
 * retrait. Le fichier est validé côté serveur, une taille excessive est
 * refusée localement pour éviter un envoi inutile.
 */
export function AvatarUpload({ user, error }: Props) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const getInitials = useInitials();
    const [preview, setPreview] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!preview) {
            return;
        }

        return () => URL.revokeObjectURL(preview);
    }, [preview]);

    const upload = (file: File) => {
        setLocalError(null);

        if (file.size > AVATAR_MAX_BYTES) {
            setLocalError('La photo ne doit pas dépasser 2 Mo.');

            return;
        }

        setPreview(URL.createObjectURL(file));

        router.post(
            AvatarController.update.url(),
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setPreview(null);
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            },
        );
    };

    const remove = () => {
        router.delete(AvatarController.destroy.url(), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
        });
    };

    const src = preview ?? user.avatar ?? undefined;

    return (
        <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-20 rounded-xl">
                <AvatarImage src={src} alt={user.name} />
                <AvatarFallback className="rounded-xl bg-neutral-200 text-xl text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>

            <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="file"
                        name="avatar"
                        accept={AVATAR_ACCEPT}
                        className="sr-only"
                        aria-label="Choisir une photo de profil"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                upload(file);
                            }
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={processing}
                        onClick={() => inputRef.current?.click()}
                    >
                        {processing ? <Spinner /> : <Camera />}
                        {user.avatar ? 'Changer la photo' : 'Ajouter une photo'}
                    </Button>
                    {user.avatar && (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={processing}
                            onClick={remove}
                        >
                            <Trash2 />
                            Retirer
                        </Button>
                    )}
                </div>
                <p className="text-muted-foreground text-xs">
                    JPG, PNG ou WebP, 2 Mo maximum.
                </p>
                <InputError message={error ?? localError ?? undefined} />
            </div>
        </div>
    );
}
