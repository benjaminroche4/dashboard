import { router } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/toast';
import {
    destroy as destroyLogo,
    update as updateLogo,
} from '@/routes/companies/logo';
import type { CompanyEntry } from '@/types';

export const LOGO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type LogoCompany = Pick<CompanyEntry, 'uuid' | 'name' | 'logo'>;

/** Deux lettres au plus, pour la pastille d'une entreprise sans logo. */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

/**
 * La pastille de l'en-tête de la fiche, cliquable : le logo (ou les initiales
 * sans logo) avec, au survol et au focus, un voile et un appareil photo qui
 * disent qu'on peut en poser un. Le fichier choisi part aussitôt en
 * multipart ; une taille excessive est refusée localement, en toast, pour
 * éviter un envoi inutile.
 */
export function CompanyLogoTile({ company }: { company: LogoCompany }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [processing, setProcessing] = useState(false);
    const label = company.logo ? 'Changer le logo' : 'Ajouter un logo';

    const upload = (file: File) => {
        if (file.size > LOGO_MAX_BYTES) {
            notify.error('Le logo ne doit pas dépasser 2 Mo.');

            return;
        }

        router.post(
            updateLogo({ company: company.uuid }).url,
            { logo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            },
        );
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                name="logo"
                accept={LOGO_ACCEPT}
                className="sr-only"
                aria-label="Choisir un logo"
                tabIndex={-1}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        upload(file);
                    }
                }}
            />
            <button
                type="button"
                aria-label={label}
                title={`${label} · JPG, PNG ou WebP, 2 Mo maximum`}
                disabled={processing}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'group focus-visible:ring-ring relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold outline-none focus-visible:ring-2',
                    company.logo
                        ? 'bg-background border'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                {company.logo ? (
                    <img
                        src={company.logo}
                        alt=""
                        className="size-full object-contain p-0.5"
                    />
                ) : (
                    <span aria-hidden>{initials(company.name)}</span>
                )}
                {/* Le voile ne répond qu'au survol et au focus : il dit le geste, il n'anime rien. */}
                <span
                    aria-hidden
                    className={cn(
                        'absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none',
                        processing && 'opacity-100',
                    )}
                >
                    {processing ? (
                        <Spinner className="size-4" />
                    ) : (
                        <Camera className="size-4" />
                    )}
                </span>
            </button>
        </>
    );
}

/** Entrée « Retirer le logo » du menu « ⋯ » de la fiche ; absente sans logo. */
export function CompanyLogoMenuItem({ company }: { company: LogoCompany }) {
    if (!company.logo) {
        return null;
    }

    return (
        <DropdownMenuItem
            onSelect={() =>
                router.delete(destroyLogo({ company: company.uuid }).url, {
                    preserveScroll: true,
                })
            }
        >
            <Trash2 />
            Retirer le logo
        </DropdownMenuItem>
    );
}
