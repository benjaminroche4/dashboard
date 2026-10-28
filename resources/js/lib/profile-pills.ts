import {
    Armchair,
    Briefcase,
    Building,
    CalendarClock,
    Gem,
    GraduationCap,
    Plane,
    Users,
    type LucideIcon,
} from 'lucide-react';

/**
 * Drapeau de chaque langue parlée (miroir de `App\Enums\SpokenLanguage`) :
 * le pays le plus parlant pour la langue, affiché devant la pastille sur la
 * fiche d'un agent (28 octobre 2026).
 */
export const spokenLanguageFlags: Record<string, string> = {
    en: 'GB',
    es: 'ES',
    de: 'DE',
    it: 'IT',
    pt: 'PT',
    zh: 'CN',
    ar: 'SA',
    ru: 'RU',
    ja: 'JP',
};

/** Pictogramme de chaque spécialité (miroir de `App\Enums\AgencySpecialty`). */
export const agencySpecialtyIcons: Record<string, LucideIcon> = {
    furnished: Armchair,
    unfurnished: Building,
    luxury: Gem,
    students: GraduationCap,
    expats: Plane,
    corporate: Briefcase,
    families: Users,
    short_term: CalendarClock,
    flatshare: Users,
};
