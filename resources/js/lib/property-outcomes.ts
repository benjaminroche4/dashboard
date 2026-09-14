import type { PropertyStatusOption } from '@/types';

/**
 * Miroir de `App\Enums\PropertyApplicationStatus::options()` : les étapes d'un
 * bien visité pour un dossier. Le serveur les sert déjà là où une page les a
 * (fiche d'une visite, onglet « Biens ») ; ce miroir sert aux endroits qui
 * ouvrent le compte rendu sans les avoir sous la main — une liste de visites,
 * par exemple. `tests/Unit/Enums/PropertyOutcomeMirrorTest.php` échoue si les
 * deux listes divergent.
 */
export const propertyOutcomes: PropertyStatusOption[] = [
    {
        value: 'pending',
        label: 'À décider',
        hint: 'Le client n’a pas encore décidé.',
    },
    {
        value: 'declined',
        label: 'Ne se positionne pas',
        hint: 'Le bien ne l’intéresse pas après visite.',
    },
    {
        value: 'applied',
        label: 'Dossier déposé',
        hint: 'La candidature est partie, en attente de réponse.',
    },
    {
        value: 'accepted',
        label: 'Dossier accepté',
        hint: 'Le bien est obtenu.',
    },
    {
        value: 'rejected',
        label: 'Dossier refusé',
        hint: 'La candidature n’a pas été retenue.',
    },
];
