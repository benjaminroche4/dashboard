import { Link } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';
import { DetailSection } from '@/components/real-estate/detail-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AttentionItem, AttentionTone } from '@/lib/dossier-attention';

const dots: Record<AttentionTone, string> = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
};

/**
 * « En attente » : ce qui retient le dossier, en tête de l'aperçu. Une ligne
 * par point, du plus pressant au plus léger, chacune avec son geste. Vide,
 * la carte le dit — un dossier à jour se voit aussi.
 */
export function DossierAttentionCard({
    items,
    onOpenTab,
}: {
    items: AttentionItem[];
    onOpenTab: (tab: string) => void;
}) {
    return (
        <DetailSection
            title="En attente"
            count={items.length > 0 ? items.length : undefined}
            className="lg:col-span-2"
        >
            {items.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <CircleCheck className="size-4 shrink-0" aria-hidden />
                    Rien en attente : le dossier est à jour.
                </p>
            ) : (
                <ul role="list" className="divide-border grid divide-y">
                    {items.map((item) => (
                        <li
                            key={item.key}
                            data-tone={item.tone}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm first:pt-0 last:pb-0"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    dots[item.tone],
                                )}
                            />
                            <div className="grid min-w-0 flex-1 gap-0.5">
                                <span className="font-medium">
                                    {item.title}
                                </span>
                                {item.detail && (
                                    <span className="text-muted-foreground text-xs">
                                        {item.detail}
                                    </span>
                                )}
                            </div>
                            {'href' in item.action ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={item.action.href}>
                                        {item.action.label}
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        'tab' in item.action &&
                                        onOpenTab(item.action.tab)
                                    }
                                >
                                    {item.action.label}
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </DetailSection>
    );
}
