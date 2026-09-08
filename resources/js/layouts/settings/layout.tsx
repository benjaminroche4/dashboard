import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Palette, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { index as teamIndex } from '@/routes/team';
import type { Auth } from '@/types';
import { staffRoleLabels } from '@/types/auth';

type Item = {
    title: string;
    description: string;
    href: ReturnType<typeof editProfile>;
    icon: LucideIcon;
    /** Réservé aux administrateurs (`auth.can.manageStaff`). */
    adminOnly?: boolean;
};

const items: Item[] = [
    {
        title: 'Profil',
        description: 'Nom et adresse e-mail',
        href: editProfile(),
        icon: UserRound,
    },
    {
        title: 'Sécurité',
        description: 'Mot de passe, 2FA, clés d’accès',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Apparence',
        description: 'Thème clair ou sombre',
        href: editAppearance(),
        icon: Palette,
    },
    {
        title: 'Équipe',
        description: 'Membres ayant accès au dashboard',
        href: teamIndex(),
        icon: UsersRound,
        adminOnly: true,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth } = usePage<{ auth: Auth }>().props;
    const visible = items.filter(
        (item) => !item.adminOnly || auth.can?.manageStaff,
    );

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-4 pt-8 pb-6">
                <div className="flex min-w-0 items-center gap-4">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                            memberTone(auth.user.id),
                        )}
                    >
                        {initials(auth.user.name)}
                    </span>
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-medium">
                            Paramètres
                        </h1>
                        <p className="text-muted-foreground truncate text-sm">
                            {auth.user.name} · {staffRoleLabels[auth.user.role]}{' '}
                            · {auth.user.email}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <nav
                    aria-label="Paramètres"
                    className="lg:sticky lg:top-6 lg:self-start"
                >
                    <ul
                        role="list"
                        className="flex gap-1 overflow-x-auto lg:flex-col"
                    >
                        {visible.map((item) => {
                            const current = isCurrentOrParentUrl(item.href);

                            return (
                                <li key={toUrl(item.href)} className="shrink-0">
                                    <Link
                                        href={item.href}
                                        aria-current={
                                            current ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors',
                                            current
                                                ? 'bg-sidebar border-border font-medium'
                                                : 'text-muted-foreground hover:bg-sidebar hover:text-foreground',
                                        )}
                                    >
                                        <item.icon
                                            className="size-4 shrink-0"
                                            aria-hidden
                                        />
                                        <span className="grid leading-tight">
                                            <span>{item.title}</span>
                                            <span className="text-muted-foreground hidden text-xs font-normal lg:block">
                                                {item.description}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="grid max-w-3xl content-start gap-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
