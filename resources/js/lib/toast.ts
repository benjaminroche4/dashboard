import { toast } from '@/components/ui/toast';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';

const add = (type: ToastType, title: string, description?: string) =>
    toast.add({ type, title, description });

/**
 * Notifications de l'application (composant Toast shadcn / Base UI).
 * `loading()` renvoie un identifiant : `resolve()` ou `reject()` font évoluer
 * le même toast au lieu d'en empiler un second.
 */
export const notify = {
    success: (title: string, description?: string) =>
        add('success', title, description),
    info: (title: string, description?: string) =>
        add('info', title, description),
    warning: (title: string, description?: string) =>
        add('warning', title, description),
    error: (title: string, description?: string) =>
        add('error', title, description),
    loading: (title: string, description?: string) =>
        toast.add({ type: 'loading', title, description, timeout: 0 }),
    resolve: (id: string, title: string, description?: string) =>
        toast.update(id, {
            type: 'success',
            title,
            description,
            timeout: 5000,
        }),
    reject: (id: string, title: string, description?: string) =>
        toast.update(id, { type: 'error', title, description, timeout: 8000 }),
    close: (id: string) => toast.close(id),
};
