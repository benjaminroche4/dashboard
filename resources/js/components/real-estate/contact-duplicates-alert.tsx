import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ContactDuplicate } from '@/types';

/** Alerte « déjà dans l'annuaire » affichée dans les dialogues agent et agence. */
export function ContactDuplicatesAlert({
    duplicates,
    noun,
}: {
    duplicates: ContactDuplicate[];
    /** « agent », « agence » ou « partenaire », pour le libellé. */
    noun: 'agent' | 'agence' | 'partenaire' | 'propriétaire';
}) {
    if (duplicates.length === 0) {
        return null;
    }

    const feminine = noun === 'agence';

    return (
        <Alert variant="warning" data-testid="contact-duplicates">
            <TriangleAlert aria-hidden />
            <AlertTitle>
                {duplicates.length > 1
                    ? `Des ${noun}s existent déjà avec ce contact`
                    : `${feminine ? 'Une' : 'Un'} ${noun} existe déjà avec ce contact`}
            </AlertTitle>
            <AlertDescription>
                <ul role="list" className="grid gap-0.5">
                    {duplicates.map((duplicate) => (
                        <li key={duplicate.id}>
                            <span className="font-medium">
                                {duplicate.name}
                            </span>
                            <span className="text-xs opacity-80">
                                {[
                                    duplicate.agency,
                                    duplicate.email,
                                    duplicate.phone,
                                ]
                                    .filter(Boolean)
                                    .map((part) => ` · ${part}`)
                                    .join('')}
                            </span>
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
