import { Head, Link, router } from '@inertiajs/react';
import { KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { Panel } from '@/components/panel';
import { TeamMemberDialog } from '@/components/settings/team-member-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { destroy, show as memberShow } from '@/routes/team';
import type { StaffRoleOption, TeamMember } from '@/types';

type Props = {
    members: TeamMember[];
    roles: StaffRoleOption[];
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const roleTone: Record<TeamMember['role'], string> = {
    admin: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    manager: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    member: '',
};

/** Page « Équipe » : les membres qui ont accès au dashboard, ajout et retrait. */
export default function Team({ members, roles }: Props) {
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<TeamMember | null>(null);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        if (!removing) return;
        setBusy(true);
        router.delete(destroy({ member: removing.uuid }).url, {
            preserveScroll: true,
            onSuccess: () => setRemoving(null),
            onFinish: () => setBusy(false),
        });
    };

    return (
        <>
            <Head title="Équipe" />

            <Panel
                title="Équipe"
                description={`${members.length} membre${members.length > 1 ? 's ont' : ' a'} accès au dashboard`}
                action={
                    <Button size="sm" onClick={() => setAdding(true)}>
                        <Plus aria-hidden />
                        Ajouter un membre
                    </Button>
                }
                className="overflow-hidden"
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Membre</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Fonctions</TableHead>
                            <TableHead>Droits</TableHead>
                            <TableHead>Sécurité</TableHead>
                            <TableHead>Depuis</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-8">
                                            <AvatarImage
                                                src={member.avatar ?? undefined}
                                                alt=""
                                            />
                                            <AvatarFallback
                                                className={cn(
                                                    'text-xs font-semibold',
                                                    memberTone(member.id),
                                                )}
                                            >
                                                {initials(member.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid min-w-44">
                                            <span className="truncate font-medium">
                                                {member.name}
                                                {member.is_me && (
                                                    <span className="text-muted-foreground font-normal">
                                                        {' '}
                                                        (vous)
                                                    </span>
                                                )}
                                            </span>
                                            <a
                                                href={`mailto:${member.email}`}
                                                className="text-muted-foreground truncate text-xs underline-offset-4 hover:underline"
                                            >
                                                {member.email}
                                            </a>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            'font-medium',
                                            roleTone[member.role],
                                        )}
                                    >
                                        {member.role_label}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {member.function_labels.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {member.function_labels.map(
                                                (label) => (
                                                    <Badge
                                                        key={label}
                                                        variant="outline"
                                                        className="font-normal"
                                                    >
                                                        {label}
                                                    </Badge>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm">
                                    <Link
                                        href={memberShow({
                                            member: member.uuid,
                                        })}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {member.role === 'admin'
                                            ? 'Tous les droits'
                                            : member.custom_permissions
                                              ? `Personnalisés${member.closed_sections > 0 ? ` · ${member.closed_sections} section${member.closed_sections > 1 ? 's' : ''} fermée${member.closed_sections > 1 ? 's' : ''}` : ''}`
                                              : 'Ceux du rôle'}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    {member.two_factor_enabled ? (
                                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
                                            <ShieldCheck
                                                className="size-3.5"
                                                aria-hidden
                                            />
                                            2FA activée
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">
                                            Sans 2FA
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {member.created_at
                                        ? dateFormat.format(
                                              new Date(member.created_at),
                                          )
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground size-8"
                                        asChild
                                    >
                                        <Link
                                            href={memberShow({
                                                member: member.uuid,
                                            })}
                                            aria-label={`Droits et fonctions de ${member.name}`}
                                        >
                                            <KeyRound aria-hidden />
                                        </Link>
                                    </Button>
                                    {member.can_delete && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground size-8 hover:text-red-600"
                                            aria-label={`Retirer l’accès de ${member.name}`}
                                            onClick={() => setRemoving(member)}
                                        >
                                            <Trash2 aria-hidden />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Panel>

            <TeamMemberDialog
                open={adding}
                onOpenChange={setAdding}
                roles={roles}
            />

            <Dialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
            >
                <DialogContent>
                    <DialogTitle>
                        Retirer l’accès de {removing?.name} ?
                    </DialogTitle>
                    <DialogDescription>
                        Ce membre ne pourra plus se connecter au dashboard. Ses
                        leads, factures et notes sont conservés. Cette action
                        est irréversible.
                    </DialogDescription>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={busy}>
                                Annuler
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={remove}
                        >
                            Retirer l’accès
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
