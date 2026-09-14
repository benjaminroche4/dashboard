import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { configureEcho } from '@laravel/echo-react';
import { flushPrefetchOnMutations } from '@/lib/prefetch-cache';
import { attachSocketIdToInertia } from '@/lib/socket-id';
import { notify } from '@/lib/toast';

configureEcho({
    broadcaster: 'reverb',
});

// Chaque requête Inertia porte le socket Echo : l'onglet auteur d'une action
// ne reçoit pas son propre événement temps réel, les autres onglets, si.
attachSocketIdToInertia();

// Les listes préchargées au survol ne doivent pas survivre à une création ou
// une modification : le cache Inertia est vidé avant chaque mutation.
flushPrefetchOnMutations();

// Une erreur serveur (500, 413 non rattrapé…) ou une coupure réseau ne doit
// jamais rester muette : à la place de la modale technique d'Inertia, un
// toast qui dit que l'action n'a pas abouti.
router.on('httpException', (event) => {
    const status = event.detail.response.status;

    if (status >= 500 || status === 413) {
        event.preventDefault();
        notify.error(
            'L’action n’a pas abouti',
            status === 413
                ? 'Le fichier est trop lourd pour le serveur.'
                : `Le serveur a répondu par une erreur (${status}). Réessayez ; si cela persiste, prévenez l’équipe technique.`,
        );
    }
});
router.on('networkError', (event) => {
    event.preventDefault();
    notify.error(
        'L’action n’a pas abouti',
        'Le serveur est injoignable ou la connexion a été coupée. Vérifiez votre réseau et réessayez.',
    );
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'auth/login':
                return null;
            // Page publique de dépôt des pièces : sans sidebar ni en-tête du backoffice.
            case name.startsWith('public/'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
