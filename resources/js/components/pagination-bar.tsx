import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paginationRange } from '@/lib/pagination';
import { cn } from '@/lib/utils';

type Props = {
    page: number;
    lastPage: number;
    onPage: (page: number) => void;
    className?: string;
};

/**
 * Pagination numérotée : les listes longues (le journal en compte des
 * milliers) ne se parcourent pas de proche en proche.
 */
export function PaginationBar({ page, lastPage, onPage, className }: Props) {
    if (lastPage <= 1) {
        return null;
    }

    return (
        <nav
            aria-label="Pagination"
            className={cn(
                'flex flex-wrap items-center justify-between gap-3',
                className,
            )}
        >
            <p className="text-muted-foreground text-xs tabular-nums">
                Page {page} sur {lastPage}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Page précédente"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                >
                    <ChevronLeft aria-hidden="true" />
                </Button>
                {paginationRange(page, lastPage).map((item, index) =>
                    item === 'gap' ? (
                        <span
                            key={`gap-${index}`}
                            aria-hidden="true"
                            className="text-muted-foreground px-1 text-sm"
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={item}
                            variant={item === page ? 'default' : 'ghost'}
                            size="icon"
                            aria-label={`Page ${item}`}
                            aria-current={item === page ? 'page' : undefined}
                            className="tabular-nums"
                            onClick={() => onPage(item)}
                        >
                            {item}
                        </Button>
                    ),
                )}
                <Button
                    variant="outline"
                    size="icon"
                    aria-label="Page suivante"
                    disabled={page >= lastPage}
                    onClick={() => onPage(page + 1)}
                >
                    <ChevronRight aria-hidden="true" />
                </Button>
            </div>
        </nav>
    );
}
