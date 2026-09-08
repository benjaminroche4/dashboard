import type {
    Activity,
    ActivityMember,
    ActivityPage,
    ActivityResourceOption,
} from '@/types';

/** Entrée du journal (miroir de ActivitySeeder / ActivityController::summary). */
export function makeActivity(overrides: Partial<Activity> = {}): Activity {
    return {
        id: 1,
        message: 'a créé le lead Léa Durand',
        actor: { id: 1, name: 'Admin', avatar: null },
        resource: 'leads',
        resource_label: 'Leads',
        lead: {
            id: 1,
            uuid: '0199a9a0-0000-7000-8000-0000000000e1',
            name: 'Léa Durand',
        },
        created_at: '2026-09-08T09:30:00+02:00',
        ...overrides,
    };
}

export function makeActivityPage(
    overrides: Partial<ActivityPage> = {},
): ActivityPage {
    return {
        data: [makeActivity()],
        current_page: 1,
        last_page: 1,
        total: 1,
        prev_page_url: null,
        next_page_url: null,
        ...overrides,
    };
}

export const activityMembers: ActivityMember[] = [
    { id: 1, name: 'Admin', avatar: null },
    { id: 2, name: 'Admin 2', avatar: null },
];

export const activityResources: ActivityResourceOption[] = [
    { value: 'invoices', label: 'Factures' },
    { value: 'leads', label: 'Leads' },
];
