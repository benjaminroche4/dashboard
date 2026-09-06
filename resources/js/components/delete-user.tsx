import { Form } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Panel } from '@/components/panel';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <Panel
            tone="destructive"
            title="Supprimer le compte"
            description="Supprimez votre compte et toutes ses données"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden />
                    Cette action est irréversible.
                </p>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="destructive"
                            data-test="delete-user-button"
                        >
                            Supprimer le compte
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>
                            Voulez-vous vraiment supprimer votre compte ?
                        </DialogTitle>
                        <DialogDescription>
                            Une fois votre compte supprimé, toutes ses données
                            seront définitivement effacées. Saisissez votre mot
                            de passe pour confirmer la suppression définitive de
                            votre compte.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="sr-only"
                                        >
                                            Mot de passe
                                        </Label>

                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Mot de passe"
                                            autoComplete="current-password"
                                        />

                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Annuler
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            variant="destructive"
                                            disabled={processing}
                                            asChild
                                        >
                                            <button
                                                type="submit"
                                                data-test="confirm-delete-user-button"
                                            >
                                                Supprimer le compte
                                            </button>
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </Panel>
    );
}
