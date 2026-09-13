import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import watchers from '@/routes/clients/watchers';
import type { ClientWatcher } from '@/types';

/**
 * Ajout ou modification d'une personne de suivi : un nom, une adresse, et le
 * lien qu'elle a avec le client. Rien d'autre — elle reçoit simplement une
 * copie des e-mails du dossier.
 */
export function WatcherDialog({
    clientUuid,
    watcher,
    open,
    onOpenChange,
}: {
    clientUuid: string;
    /** Personne à modifier ; `null` pour un ajout. */
    watcher: ClientWatcher | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const editing = watcher !== null;
    const form = useForm({
        name: watcher?.name ?? '',
        email: watcher?.email ?? '',
        phone: watcher?.phone ?? '',
        role: watcher?.role ?? '',
    });

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (editing) {
            form.patch(
                watchers.update({ lead: clientUuid, watcher: watcher.uuid })
                    .url,
                options,
            );

            return;
        }

        form.post(watchers.store({ lead: clientUuid }).url, options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {editing
                            ? 'Modifier la personne de suivi'
                            : 'Ajouter une personne de suivi'}
                    </DialogTitle>
                    <DialogDescription>
                        Elle reçoit une copie des e-mails envoyés au client.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="watcher-name">Nom</Label>
                        <Input
                            id="watcher-name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            placeholder="Claire Martin, Service RH…"
                            autoComplete="off"
                            autoFocus
                        />
                        <InputError message={form.errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="watcher-email">E-mail</Label>
                        <Input
                            id="watcher-email"
                            type="email"
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            placeholder="claire.martin@exemple.com"
                            autoComplete="off"
                        />
                        <InputError message={form.errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="watcher-phone">Téléphone</Label>
                        <PhoneInput
                            id="watcher-phone"
                            name="watcher_phone_national"
                            value={form.data.phone}
                            onChange={(value) => form.setData('phone', value)}
                        />
                        <InputError message={form.errors.phone} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="watcher-role">
                            Lien avec le client
                        </Label>
                        <Input
                            id="watcher-role"
                            value={form.data.role}
                            onChange={(event) =>
                                form.setData('role', event.target.value)
                            }
                            placeholder="Mère, employeur, ami du foyer…"
                            autoComplete="off"
                        />
                        <InputError message={form.errors.role} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {editing ? 'Enregistrer' : 'Ajouter'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
