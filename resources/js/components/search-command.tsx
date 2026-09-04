import { router } from '@inertiajs/react';
import {
    LayoutGrid,
    Palette,
    Search,
    ShieldCheck,
    UserCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import { dashboard } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

type Destination = {
    title: string;
    keywords: string;
    url: string;
    icon: typeof LayoutGrid;
    shortcut?: string;
};

// Pages accessibles depuis la recherche. Les futures pages s'ajoutent ici.
const destinations: Destination[] = [
    {
        title: 'Tableau de bord',
        keywords: 'accueil dashboard',
        url: dashboard().url,
        icon: LayoutGrid,
        shortcut: '⌘D',
    },
    {
        title: 'Mon compte',
        keywords: 'profil paramètres',
        url: editProfile().url,
        icon: UserCircle,
        shortcut: '⌘,',
    },
    {
        title: 'Sécurité',
        keywords: 'mot de passe 2fa passkey',
        url: editSecurity().url,
        icon: ShieldCheck,
    },
    {
        title: 'Apparence',
        keywords: 'thème sombre clair',
        url: editAppearance().url,
        icon: Palette,
    },
];

/**
 * Champ de recherche de l'en-tête : un clic (ou ⌘K / Ctrl+K) ouvre une
 * palette de commandes pour naviguer dans le backoffice.
 */
export function SearchCommand() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key.toLowerCase() === 'k' &&
                (event.metaKey || event.ctrlKey)
            ) {
                event.preventDefault();
                setOpen((current) => !current);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const go = useCallback((url: string) => {
        setOpen(false);
        router.visit(url);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Rechercher"
                data-test="search-trigger"
                className="border-input bg-background text-muted-foreground hover:bg-accent/50 focus-visible:ring-ring/50 flex h-9 w-full max-w-md items-center gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-[3px]"
            >
                <Search className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">Rechercher…</span>
                <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:inline-flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                title="Recherche"
                description="Naviguer dans le backoffice"
            >
                <CommandInput placeholder="Rechercher une page…" />
                <CommandList>
                    <CommandEmpty>Aucun résultat.</CommandEmpty>
                    <CommandGroup heading="Pages">
                        {destinations.map((destination) => (
                            <CommandItem
                                key={destination.url}
                                value={`${destination.title} ${destination.keywords}`}
                                onSelect={() => go(destination.url)}
                            >
                                <destination.icon />
                                <span>{destination.title}</span>
                                {destination.shortcut && (
                                    <CommandShortcut>
                                        {destination.shortcut}
                                    </CommandShortcut>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
