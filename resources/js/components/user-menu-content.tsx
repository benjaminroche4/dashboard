import { Link, router, usePage } from '@inertiajs/react';
import { CircleUser, History, LogOut, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { canAccessSection } from '@/lib/nav-access';
import { logout } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { index as activityIndex } from '@/routes/tools/activity';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { auth } = usePage().props;
    // Le journal d'activité vit ici, pas dans la sidebar (28 octobre 2026) ;
    // il reste fermé aux membres sans accès à la section.
    const showActivity = canAccessSection(auth?.access ?? null, 'activity');

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={editProfile()}
                        prefetch
                        onClick={cleanup}
                    >
                        <CircleUser className="mr-2" />
                        Compte
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={editAppearance()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Paramètres
                    </Link>
                </DropdownMenuItem>
                {showActivity && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full cursor-pointer"
                            href={activityIndex()}
                            prefetch
                            onClick={cleanup}
                        >
                            <History className="mr-2" />
                            Journal d'activité
                        </Link>
                    </DropdownMenuItem>
                )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Se déconnecter
                </Link>
            </DropdownMenuItem>
        </>
    );
}
