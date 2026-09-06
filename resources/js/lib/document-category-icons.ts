import {
    Briefcase,
    FileQuestion,
    GraduationCap,
    House,
    IdCard,
    Landmark,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';

/** Icône de chaque catégorie du catalogue (valeurs de `DocumentCategory`). */
export const categoryIcons: Record<string, LucideIcon> = {
    studies: GraduationCap,
    finance: Landmark,
    guarantee: ShieldCheck,
    housing: House,
    identity: IdCard,
    other: FileQuestion,
    work: Briefcase,
};

/** Icône d'une catégorie, « Autres » par défaut pour une valeur inconnue. */
export function categoryIcon(value: string): LucideIcon {
    return categoryIcons[value] ?? FileQuestion;
}
