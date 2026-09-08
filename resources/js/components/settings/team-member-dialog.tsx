import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { capitalizeName } from '@/lib/format';
import { store } from '@/routes/team';
import type { StaffRole, StaffRoleOption, TeamMemberForm } from '@/types';

const initial: TeamMemberForm = {
    name: '',
    email: '',
    role: 'member',
    password: '',
    password_confirmation: '',
};

/** Dialogue « Ajouter un membre » : nom, e-mail, rôle, mot de passe confirmé. */
export function TeamMemberDialog({
    open,
    onOpenChange,
    roles,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roles: StaffRoleOption[];
}) {
    const form = useForm<TeamMemberForm>(initial);

    useEffect(() => {
        if (open) {
            form.setData(initial);
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit = () => {
        form.post(store().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Ajouter un membre</DialogTitle>
                    <DialogDescription>
                        Le membre pourra se connecter au dashboard avec cette
                        adresse e-mail et ce mot de passe.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="member-name">Nom</Label>
                            <Input
                                id="member-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                onBlur={(event) =>
                                    form.setData(
                                        'name',
                                        capitalizeName(event.target.value),
                                    )
                                }
                                autoComplete="off"
                                placeholder="Prénom Nom"
                                required
                                aria-invalid={Boolean(form.errors.name)}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="member-role">Rôle</Label>
                            <Select
                                value={form.data.role}
                                onValueChange={(value) =>
                                    form.setData('role', value as StaffRole)
                                }
                            >
                                <SelectTrigger
                                    id="member-role"
                                    aria-label="Rôle"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem
                                            key={role.value}
                                            value={role.value}
                                        >
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.role} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="member-email">Adresse e-mail</Label>
                        <Input
                            id="member-email"
                            type="email"
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                            autoComplete="off"
                            placeholder="prenom@exemple.com"
                            required
                            aria-invalid={Boolean(form.errors.email)}
                        />
                        <InputError message={form.errors.email} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="member-password">
                                Mot de passe
                            </Label>
                            <Input
                                id="member-password"
                                type="password"
                                value={form.data.password}
                                onChange={(event) =>
                                    form.setData('password', event.target.value)
                                }
                                autoComplete="new-password"
                                required
                                aria-invalid={Boolean(form.errors.password)}
                            />
                            <InputError message={form.errors.password} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="member-password-confirmation">
                                Confirmation
                            </Label>
                            <Input
                                id="member-password-confirmation"
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(event) =>
                                    form.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                autoComplete="new-password"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Ajouter le membre
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
