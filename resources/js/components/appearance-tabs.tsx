import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
    { value: 'system', icon: Monitor, label: 'Système' },
];

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div
            role="radiogroup"
            aria-label="Thème"
            className={cn('grid gap-2 sm:grid-cols-3', className)}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => {
                const selected = appearance === value;

                return (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            'bg-background flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                            selected
                                ? 'border-foreground/60 font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'flex size-8 shrink-0 items-center justify-center rounded-md',
                                selected
                                    ? 'bg-foreground text-background'
                                    : 'bg-muted',
                            )}
                        >
                            <Icon className="size-4" aria-hidden />
                        </span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
