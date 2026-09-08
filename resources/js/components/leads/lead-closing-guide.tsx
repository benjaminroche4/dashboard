import {
    CalendarDays,
    Check,
    Handshake,
    Home,
    KeyRound,
    Lightbulb,
    MapPin,
    MessageCircleQuestion,
    RotateCcw,
    ShieldCheck,
    UserRound,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    closingGuide,
    guideLanguages,
    questionCount,
    questionText,
    sectionProgress,
    type ClosingQuestion,
    type ClosingSection,
    type GuideLanguage,
} from '@/lib/closing-guide';
import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'lead-closing-guide:';

function readAsked(key: string): Set<string> {
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
        const parsed: unknown = raw ? JSON.parse(raw) : [];

        return new Set(
            Array.isArray(parsed)
                ? parsed.filter((id): id is string => typeof id === 'string')
                : [],
        );
    } catch {
        return new Set();
    }
}

function writeAsked(key: string, asked: Set<string>): void {
    try {
        sessionStorage.setItem(
            STORAGE_PREFIX + key,
            JSON.stringify([...asked]),
        );
    } catch {
        // Stockage indisponible : le guide reste utilisable, sans mémoire.
    }
}

type GuideState = {
    asked: ReadonlySet<string>;
    toggle: (id: string, checked: boolean) => void;
    language: GuideLanguage;
    guide: ClosingSection[];
};

/**
 * Guide de closing : volet latéral non bloquant listant, par thème, les
 * questions à poser au prospect, en français ou en anglais selon la langue
 * du client. Chaque question se coche une fois posée ; la progression est
 * mémorisée pour la session, par lead.
 */
export function LeadClosingGuide({
    storageKey = 'new',
    language: leadLanguage = 'fr',
    guide = closingGuide,
    className,
}: {
    /** Clé de mémorisation (identifiant du lead, ou « new »). */
    storageKey?: string;
    /** Langue de contact du lead : présélectionne la langue des questions. */
    language?: GuideLanguage;
    /** Questions à poser : celles des locataires par défaut, ou celles des propriétaires. */
    guide?: ClosingSection[];
    className?: string;
}) {
    const total = questionCount(guide);
    const [asked, setAsked] = useState<Set<string>>(() =>
        readAsked(storageKey),
    );
    const [language, setLanguage] = useState<GuideLanguage>(leadLanguage);
    const [syncedLanguage, setSyncedLanguage] = useState(leadLanguage);

    // La langue du lead change dans le formulaire : le guide suit, sans
    // écraser un choix fait ensuite dans le volet.
    if (syncedLanguage !== leadLanguage) {
        setSyncedLanguage(leadLanguage);
        setLanguage(leadLanguage);
    }

    const update = (next: Set<string>) => {
        setAsked(next);
        writeAsked(storageKey, next);
    };
    const toggle = (id: string, checked: boolean) => {
        const next = new Set(asked);

        if (checked) {
            next.add(id);
        } else {
            next.delete(id);
        }

        update(next);
    };

    const done = asked.size;
    const percent = Math.round((done / total) * 100);
    const state: GuideState = { asked, toggle, language, guide };

    return (
        <Sheet modal={false}>
            <SheetTrigger asChild>
                <Button type="button" variant="outline" className={className}>
                    <MessageCircleQuestion />
                    Guide de closing
                    {done > 0 && (
                        <Badge
                            variant="secondary"
                            className="font-medium tabular-nums"
                        >
                            {done}/{total}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent
                aria-label="Guide de closing"
                className="gap-0 sm:max-w-md"
                onInteractOutside={(event) => event.preventDefault()}
            >
                <SheetHeader className="border-b pr-12">
                    <SheetTitle>Guide de closing</SheetTitle>
                    <SheetDescription>
                        Les questions à poser pour cerner le projet. Cochez-les
                        au fil de l’appel, le formulaire reste modifiable.
                    </SheetDescription>
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <span className="text-muted-foreground text-xs">
                            Langue des questions
                        </span>
                        <ToggleGroup
                            type="single"
                            value={language}
                            onValueChange={(value) =>
                                value && setLanguage(value as GuideLanguage)
                            }
                            aria-label="Langue des questions"
                            className="gap-1"
                        >
                            {guideLanguages.map((option) => (
                                <ToggleGroupItem
                                    key={option.value}
                                    value={option.value}
                                    aria-label={option.label}
                                    className="h-8 rounded-md px-2.5 text-xs first:rounded-md last:rounded-md"
                                >
                                    <CountryFlag
                                        code={
                                            option.value === 'en' ? 'GB' : 'FR'
                                        }
                                    />
                                    {option.value.toUpperCase()}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                    <div className="grid gap-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                {done === total
                                    ? 'Toutes les questions sont posées'
                                    : `${done} sur ${total} questions posées`}
                            </span>
                            <span className="font-medium tabular-nums">
                                {percent} %
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Questions posées"
                            aria-valuemin={0}
                            aria-valuemax={total}
                            aria-valuenow={done}
                            className="bg-muted h-1.5 overflow-hidden rounded-full"
                        >
                            <div
                                className="bg-primary h-full rounded-full transition-[width]"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <CardVariants {...state} />
                </div>

                <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                    <p className="text-muted-foreground text-xs">
                        Mémorisé pour ce lead pendant la session.
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={done === 0}
                        onClick={() => update(new Set())}
                    >
                        <RotateCcw />
                        Réinitialiser
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/* ------------------------------------------------------------------ */
/* Cartes par thème : bandeau coloré avec l'icône du thème, questions  */
/* cochables en dessous.                                               */
/* ------------------------------------------------------------------ */

type SectionMeta = { icon: LucideIcon; tone: string; soft: string };

/** Icône et teinte par thème (ordre du guide). */
const sectionMeta: Record<string, SectionMeta> = {
    profile: {
        icon: UserRound,
        tone: 'text-sky-800 dark:text-sky-200',
        soft: 'bg-sky-50 dark:bg-sky-950',
    },
    criteria: {
        icon: Home,
        tone: 'text-violet-800 dark:text-violet-200',
        soft: 'bg-violet-50 dark:bg-violet-950',
    },
    location: {
        icon: MapPin,
        tone: 'text-rose-800 dark:text-rose-200',
        soft: 'bg-rose-50 dark:bg-rose-950',
    },
    budget: {
        icon: Wallet,
        tone: 'text-emerald-800 dark:text-emerald-200',
        soft: 'bg-emerald-50 dark:bg-emerald-950',
    },
    timeline: {
        icon: CalendarDays,
        tone: 'text-amber-800 dark:text-amber-200',
        soft: 'bg-amber-50 dark:bg-amber-950',
    },
    package: {
        icon: Handshake,
        tone: 'text-primary',
        soft: 'bg-primary/10',
    },
    property: {
        icon: Home,
        tone: 'text-sky-800 dark:text-sky-200',
        soft: 'bg-sky-50 dark:bg-sky-950',
    },
    situation: {
        icon: KeyRound,
        tone: 'text-violet-800 dark:text-violet-200',
        soft: 'bg-violet-50 dark:bg-violet-950',
    },
    expectations: {
        icon: Wallet,
        tone: 'text-emerald-800 dark:text-emerald-200',
        soft: 'bg-emerald-50 dark:bg-emerald-950',
    },
    conditions: {
        icon: ShieldCheck,
        tone: 'text-rose-800 dark:text-rose-200',
        soft: 'bg-rose-50 dark:bg-rose-950',
    },
    mandate: {
        icon: Handshake,
        tone: 'text-primary',
        soft: 'bg-primary/10',
    },
};

const fallbackMeta: SectionMeta = {
    icon: MessageCircleQuestion,
    tone: 'text-muted-foreground',
    soft: 'bg-muted',
};

const metaOf = (section: ClosingSection): SectionMeta =>
    sectionMeta[section.id] ?? fallbackMeta;

type RowProps = {
    question: ClosingQuestion;
    checked: boolean;
    language: GuideLanguage;
    onToggle: (id: string, checked: boolean) => void;
};

type RowComponent = (props: RowProps) => ReactNode;

/** Une carte par thème : bandeau coloré, puis les questions rendues par `Row`. */
function Cards({
    asked,
    toggle,
    language,
    guide,
    Row,
    rows = 'grid gap-1 p-2',
}: GuideState & { Row: RowComponent; rows?: string }) {
    return (
        <div className="grid gap-3 px-4 py-4">
            {guide.map((section) => {
                const meta = metaOf(section);
                const progress = sectionProgress(section, asked);
                const complete = progress.asked === progress.total;
                const Icon = complete ? Check : meta.icon;

                return (
                    <section
                        key={section.id}
                        aria-label={section.title}
                        className="overflow-hidden rounded-xl border"
                    >
                        <header
                            className={cn(
                                'flex items-center gap-2.5 px-4 py-3',
                                complete
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                    : cn(meta.soft, meta.tone),
                            )}
                        >
                            <Icon className="size-4.5 shrink-0" aria-hidden />
                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {section.title}
                            </h3>
                            <span className="text-xs font-semibold tabular-nums">
                                {progress.asked}/{progress.total}
                            </span>
                        </header>
                        <ul className={rows}>
                            {section.questions.map((question) => (
                                <Row
                                    key={question.id}
                                    question={question}
                                    checked={asked.has(question.id)}
                                    language={language}
                                    onToggle={toggle}
                                />
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

/** Bouton pleine largeur qui porte l'état coché (rôle checkbox). */
function Toggle({
    question,
    checked,
    onToggle,
    className,
    children,
}: Pick<RowProps, 'question' | 'checked' | 'onToggle'> & {
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={question.topic}
            onClick={() => onToggle(question.id, !checked)}
            className={cn(
                'hover:bg-accent/60 flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                className,
            )}
        >
            {children}
        </button>
    );
}

function Tip({
    question,
    className,
    prefix,
}: {
    question: ClosingQuestion;
    className?: string;
    prefix?: string;
}) {
    if (!question.tip) {
        return null;
    }

    return (
        <p
            className={cn(
                'text-foreground/80 flex items-start gap-1.5 text-[13px]/5 text-pretty',
                className,
            )}
        >
            <Lightbulb
                className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                aria-hidden
            />
            <span>
                {prefix && <span className="font-semibold">{prefix} </span>}
                {question.tip}
            </span>
        </p>
    );
}

const struck = (checked: boolean) =>
    checked ? 'text-muted-foreground line-through' : 'text-foreground';

/** Une question : case carrée, sujet en gras puis question, astuce dans un encart gris. */
const Row: RowComponent = ({ question, checked, language, onToggle }) => (
    <li className="grid gap-1.5">
        <Toggle question={question} checked={checked} onToggle={onToggle}>
            <span
                className={cn(
                    'mt-1 grid size-4 shrink-0 place-items-center rounded-[4px] border',
                    checked &&
                        'bg-primary border-primary text-primary-foreground',
                )}
            >
                {checked && <Check className="size-3" aria-hidden />}
            </span>
            <span
                lang={language}
                className={cn('text-sm/6 text-pretty', struck(checked))}
            >
                <span lang="fr" className="font-semibold">
                    {question.topic} :
                </span>{' '}
                {questionText(question, language)}
            </span>
        </Toggle>
        {!checked && question.tip && (
            <Tip
                question={question}
                className="bg-sidebar mx-2 rounded-md border px-2.5 py-2"
            />
        )}
    </li>
);

function CardVariants(state: GuideState) {
    return <Cards {...state} Row={Row} />;
}
