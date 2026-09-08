import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Pencil,
    RotateCcw,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { Panel } from '@/components/panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import InputError from '@/components/input-error';
import {
    customizedSections,
    defaultsFor,
    groupSections,
    setEveryLevel,
    summarize,
} from '@/lib/team-access';
import { cn } from '@/lib/utils';
import { access as accessRoute, index as teamIndex } from '@/routes/team';
import type {
    AccessLevel,
    AccessLevelOption,
    AccessMap,
    SiteSection,
    SiteSectionOption,
    StaffFunction,
    StaffFunctionOption,
    StaffRole,
    StaffRoleOption,
    TeamAccessForm,
    TeamMemberAccess,
} from '@/types';

type Props = {
    member: TeamMemberAccess;
    roles: StaffRoleOption[];
    sections: SiteSectionOption[];
    levels: AccessLevelOption[];
    functionOptions: StaffFunctionOption[];
    roleDefaults: Record<StaffRole, AccessMap>;
};

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const levelIcons: Record<AccessLevel, IconType> = {
    none: EyeOff,
    read: Eye,
    write: Pencil,
    manage: Sparkles,
};

const levelTones: Record<AccessLevel, string> = {
    none: 'data-[state=on]:bg-neutral-200 data-[state=on]:text-neutral-800 dark:data-[state=on]:bg-neutral-800 dark:data-[state=on]:text-neutral-100',
    read: 'data-[state=on]:bg-sky-100 data-[state=on]:text-sky-900 dark:data-[state=on]:bg-sky-950 dark:data-[state=on]:text-sky-200',
    write: 'data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-900 dark:data-[state=on]:bg-emerald-950 dark:data-[state=on]:text-emerald-200',
    manage: 'data-[state=on]:bg-violet-100 data-[state=on]:text-violet-900 dark:data-[state=on]:bg-violet-950 dark:data-[state=on]:text-violet-200',
};

/**
 * Page « Droits et fonctions » d'un membre : rôle, un niveau par section du
 * site (Aucun accès, Consulter, Modifier, Gérer) et fonctions affichées à
 * l'équipe. Un administrateur gère tout : sa matrice est en lecture seule.
 */
export default function TeamMemberPage({
    member,
    roles,
    sections,
    levels,
    functionOptions,
    roleDefaults,
}: Props) {
    const form = useForm<TeamAccessForm>({
        role: member.role,
        permissions: { ...member.access },
        functions: member.functions,
    });
    const errors = form.errors as Record<string, string | undefined>;
    const isAdmin = form.data.role === 'admin';
    const defaults = defaultsFor(roleDefaults, form.data.role);
    const customized = customizedSections(form.data.permissions, defaults);
    const counts = summarize(form.data.permissions);

    const setLevel = (section: SiteSection, level: AccessLevel) =>
        form.setData('permissions', {
            ...form.data.permissions,
            [section]: level,
        });
    const changeRole = (role: StaffRole) =>
        form.setData({
            ...form.data,
            role,
            // Un changement de rôle repart des droits de ce rôle.
            permissions: defaultsFor(roleDefaults, role),
        });
    const toggleFunction = (fn: StaffFunction, checked: boolean) =>
        form.setData(
            'functions',
            checked
                ? [...form.data.functions, fn]
                : form.data.functions.filter((current) => current !== fn),
        );

    const submit = () => {
        form.transform((data) => ({
            role: data.role,
            permissions: data.role === 'admin' ? null : data.permissions,
            functions: data.functions,
        }));
        form.patch(accessRoute({ member: member.uuid }).url, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Droits de ${member.name}`} />

            <form
                className="grid gap-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                <Panel
                    title={`Droits et fonctions de ${member.name}`}
                    description="Le rôle donne des droits par défaut. Chaque section peut ensuite être ouverte ou fermée à ce membre, et ses fonctions s’affichent là où l’équipe choisit un membre."
                    action={
                        <Button variant="outline" size="sm" asChild>
                            <Link href={teamIndex()}>
                                <ArrowLeft aria-hidden />
                                Équipe
                            </Link>
                        </Button>
                    }
                >
                    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12">
                                <AvatarImage
                                    src={member.avatar ?? undefined}
                                    alt=""
                                />
                                <AvatarFallback
                                    className={cn(
                                        'text-sm font-semibold',
                                        memberTone(member.id),
                                    )}
                                >
                                    {initials(member.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0">
                                <span className="font-medium">
                                    {member.name}
                                    {member.is_me && (
                                        <span className="text-muted-foreground font-normal">
                                            {' '}
                                            (vous)
                                        </span>
                                    )}
                                </span>
                                <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                                    <a
                                        href={`mailto:${member.email}`}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {member.email}
                                    </a>
                                    {member.two_factor_enabled ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                            <ShieldCheck
                                                className="size-3"
                                                aria-hidden
                                            />
                                            2FA activée
                                        </span>
                                    ) : (
                                        <span>Sans 2FA</span>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="member-role">Rôle</Label>
                            <Select
                                value={form.data.role}
                                onValueChange={(value) =>
                                    changeRole(value as StaffRole)
                                }
                                disabled={!member.can_change_role}
                            >
                                <SelectTrigger
                                    id="member-role"
                                    className="w-52"
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
                            {!member.can_change_role && (
                                <p className="text-muted-foreground text-xs">
                                    Vous ne pouvez pas changer votre propre
                                    rôle.
                                </p>
                            )}
                            <InputError message={errors.role} />
                        </div>
                    </div>
                </Panel>

                <Panel
                    title="Droits par section"
                    description={
                        isAdmin
                            ? 'Un administrateur a tous les droits sur toutes les sections.'
                            : `Ceux du rôle ${roles.find((role) => role.value === form.data.role)?.label ?? ''} sauf ${customized.length === 0 ? 'personnalisation' : `${customized.length} section${customized.length > 1 ? 's' : ''} personnalisée${customized.length > 1 ? 's' : ''}`}.`
                    }
                    action={
                        !isAdmin && (
                            <div className="flex flex-wrap items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        form.setData(
                                            'permissions',
                                            setEveryLevel(
                                                form.data.permissions,
                                                'read',
                                            ),
                                        )
                                    }
                                >
                                    <Eye aria-hidden />
                                    Tout consulter
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        form.setData(
                                            'permissions',
                                            setEveryLevel(
                                                form.data.permissions,
                                                'write',
                                            ),
                                        )
                                    }
                                >
                                    <Pencil aria-hidden />
                                    Tout modifier
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={customized.length === 0}
                                    onClick={() =>
                                        form.setData('permissions', defaults)
                                    }
                                >
                                    <RotateCcw aria-hidden />
                                    Droits du rôle
                                </Button>
                            </div>
                        )
                    }
                >
                    <div className="grid grid-cols-1 gap-1 px-6 pt-4 pb-2 sm:grid-cols-4">
                        {levels.map((level) => {
                            const Icon = levelIcons[level.value];

                            return (
                                <div
                                    key={level.value}
                                    className="flex items-start gap-2 text-xs"
                                >
                                    <Icon
                                        className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                                        aria-hidden
                                    />
                                    <span>
                                        <span className="font-medium">
                                            {level.label}
                                        </span>{' '}
                                        <span className="text-muted-foreground">
                                            {level.description}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid gap-5 px-6 py-4">
                        {groupSections(sections).map(({ group, options }) => (
                            <section
                                key={group}
                                aria-label={group}
                                className="grid gap-2"
                            >
                                <h3 className="text-muted-foreground text-xs font-semibold uppercase">
                                    {group}
                                </h3>
                                <ul className="divide-y rounded-lg border">
                                    {options.map((section) => {
                                        const level =
                                            form.data.permissions[
                                                section.value
                                            ];
                                        const isCustom =
                                            level !== defaults[section.value];

                                        return (
                                            <li
                                                key={section.value}
                                                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                                            >
                                                <div className="grid min-w-0 gap-0.5">
                                                    <span className="flex items-center gap-2 text-sm font-medium">
                                                        {section.label}
                                                        {isCustom &&
                                                            !isAdmin && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-normal"
                                                                >
                                                                    Personnalisé
                                                                </Badge>
                                                            )}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                        Gérer :{' '}
                                                        {section.manage_hint}.
                                                    </span>
                                                </div>
                                                <ToggleGroup
                                                    type="single"
                                                    value={
                                                        isAdmin
                                                            ? 'manage'
                                                            : level
                                                    }
                                                    onValueChange={(value) =>
                                                        value &&
                                                        setLevel(
                                                            section.value,
                                                            value as AccessLevel,
                                                        )
                                                    }
                                                    disabled={isAdmin}
                                                    aria-label={`Niveau pour ${section.label}`}
                                                    className="gap-1"
                                                >
                                                    {levels.map((option) => {
                                                        const Icon =
                                                            levelIcons[
                                                                option.value
                                                            ];

                                                        return (
                                                            <ToggleGroupItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                                aria-label={
                                                                    option.label
                                                                }
                                                                title={
                                                                    option.description
                                                                }
                                                                className={cn(
                                                                    'h-8 rounded-md px-2.5 text-xs first:rounded-md last:rounded-md',
                                                                    levelTones[
                                                                        option
                                                                            .value
                                                                    ],
                                                                )}
                                                            >
                                                                <Icon
                                                                    className="size-3.5"
                                                                    aria-hidden
                                                                />
                                                                <span className="hidden sm:inline">
                                                                    {
                                                                        option.label
                                                                    }
                                                                </span>
                                                            </ToggleGroupItem>
                                                        );
                                                    })}
                                                </ToggleGroup>
                                                <InputError
                                                    message={
                                                        errors[
                                                            `permissions.${section.value}`
                                                        ]
                                                    }
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))}
                        <p
                            className="text-muted-foreground text-xs"
                            aria-live="polite"
                        >
                            {isAdmin
                                ? 'Toutes les sections sont gérées.'
                                : `${counts.none} fermée${counts.none > 1 ? 's' : ''} · ${counts.read} en consultation · ${counts.write} en modification · ${counts.manage} gérée${counts.manage > 1 ? 's' : ''}.`}
                        </p>
                        <InputError message={errors.permissions} />
                    </div>
                </Panel>

                <Panel
                    title="Fonctions"
                    description="Affichées à côté du nom quand l’équipe assigne une visite ou un dossier."
                >
                    <div className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
                        {functionOptions.map((option) => (
                            <Label
                                key={option.value}
                                className="hover:bg-accent/50 flex items-center gap-2 rounded-md border px-3 py-2 font-normal"
                            >
                                <Checkbox
                                    checked={form.data.functions.includes(
                                        option.value,
                                    )}
                                    onCheckedChange={(checked) =>
                                        toggleFunction(
                                            option.value,
                                            checked === true,
                                        )
                                    }
                                />
                                {option.label}
                            </Label>
                        ))}
                    </div>
                    <div className="px-6 pb-4">
                        <InputError message={errors.functions} />
                    </div>
                </Panel>

                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" asChild>
                        <Link href={teamIndex()}>Annuler</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && <Spinner />}
                        Enregistrer les droits
                    </Button>
                </div>
            </form>
        </>
    );
}
