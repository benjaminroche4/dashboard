import {
    BadgeCheck,
    Building,
    Building2,
    CalendarCheck,
    FileText,
    Files,
    FolderOpen,
    Handshake,
    History,
    KeyRound,
    ReceiptEuro,
    UserPlus,
    Users,
    type LucideIcon,
} from 'lucide-react';

/** Icône par ressource du journal, pour repérer une action d'un coup d'œil. */
const icons: Record<string, LucideIcon> = {
    leads: UserPlus,
    clients: FolderOpen,
    invoices: ReceiptEuro,
    quotes: FileText,
    visits: CalendarCheck,
    properties: Building2,
    agents: BadgeCheck,
    agencies: Building,
    partners: Handshake,
    owners: KeyRound,
    documents: Files,
    catalog: Files,
    staff: Users,
};

/** Teintes par ressource : texte, fond, bordure et pastille. */
type ResourceTone = {
    text: string;
    soft: string;
    border: string;
    dot: string;
};

const tones: Record<string, ResourceTone> = {
    leads: {
        text: 'text-purple-700 dark:text-purple-300',
        soft: 'bg-purple-50 dark:bg-purple-950/40',
        border: 'border-purple-200 dark:border-purple-900',
        dot: 'bg-purple-500',
    },
    clients: {
        text: 'text-sky-700 dark:text-sky-300',
        soft: 'bg-sky-50 dark:bg-sky-950/40',
        border: 'border-sky-200 dark:border-sky-900',
        dot: 'bg-sky-500',
    },
    invoices: {
        text: 'text-emerald-700 dark:text-emerald-300',
        soft: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-900',
        dot: 'bg-emerald-500',
    },
    quotes: {
        text: 'text-amber-700 dark:text-amber-300',
        soft: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-900',
        dot: 'bg-amber-500',
    },
    visits: {
        text: 'text-rose-700 dark:text-rose-300',
        soft: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-900',
        dot: 'bg-rose-500',
    },
    properties: {
        text: 'text-teal-700 dark:text-teal-300',
        soft: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-200 dark:border-teal-900',
        dot: 'bg-teal-500',
    },
    agents: {
        text: 'text-indigo-700 dark:text-indigo-300',
        soft: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-900',
        dot: 'bg-indigo-500',
    },
    agencies: {
        text: 'text-indigo-700 dark:text-indigo-300',
        soft: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-900',
        dot: 'bg-indigo-500',
    },
    partners: {
        text: 'text-orange-700 dark:text-orange-300',
        soft: 'bg-orange-50 dark:bg-orange-950/40',
        border: 'border-orange-200 dark:border-orange-900',
        dot: 'bg-orange-500',
    },
    owners: {
        text: 'text-lime-700 dark:text-lime-300',
        soft: 'bg-lime-50 dark:bg-lime-950/40',
        border: 'border-lime-200 dark:border-lime-900',
        dot: 'bg-lime-500',
    },
    documents: {
        text: 'text-cyan-700 dark:text-cyan-300',
        soft: 'bg-cyan-50 dark:bg-cyan-950/40',
        border: 'border-cyan-200 dark:border-cyan-900',
        dot: 'bg-cyan-500',
    },
    catalog: {
        text: 'text-cyan-700 dark:text-cyan-300',
        soft: 'bg-cyan-50 dark:bg-cyan-950/40',
        border: 'border-cyan-200 dark:border-cyan-900',
        dot: 'bg-cyan-500',
    },
    staff: {
        text: 'text-fuchsia-700 dark:text-fuchsia-300',
        soft: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
        border: 'border-fuchsia-200 dark:border-fuchsia-900',
        dot: 'bg-fuchsia-500',
    },
};

const fallbackTone: ResourceTone = {
    text: 'text-muted-foreground',
    soft: 'bg-muted',
    border: 'border-border',
    dot: 'bg-muted-foreground',
};

export function activityIcon(resource: string): LucideIcon {
    return icons[resource] ?? History;
}

export function activityTone(resource: string): ResourceTone {
    return tones[resource] ?? fallbackTone;
}
