import {
    PICTURE_ACCEPT,
    PICTURE_MAX_BYTES,
    PictureMenuItem,
    PictureTile,
    type PictureLabels,
} from '@/components/picture-tile';
import {
    destroy as destroyLogo,
    update as updateLogo,
} from '@/routes/companies/logo';
import type { CompanyEntry } from '@/types';

export const LOGO_ACCEPT = PICTURE_ACCEPT;
export const LOGO_MAX_BYTES = PICTURE_MAX_BYTES;

type LogoCompany = Pick<CompanyEntry, 'uuid' | 'name' | 'logo'>;

const labels: PictureLabels = {
    add: 'Ajouter un logo',
    change: 'Changer le logo',
    remove: 'Retirer le logo',
    choose: 'Choisir un logo',
    tooLarge: 'Le logo ne doit pas dépasser 2 Mo.',
};

/**
 * La pastille de l'en-tête de la fiche entreprise : le logo, ou les initiales
 * sans logo, cliquable pour en poser un (`PictureTile`).
 */
export function CompanyLogoTile({ company }: { company: LogoCompany }) {
    return (
        <PictureTile
            name={company.name}
            src={company.logo}
            uploadUrl={updateLogo({ company: company.uuid }).url}
            field="logo"
            labels={labels}
        />
    );
}

/** Entrée « Retirer le logo » du menu « ⋯ » de la fiche ; absente sans logo. */
export function CompanyLogoMenuItem({ company }: { company: LogoCompany }) {
    return (
        <PictureMenuItem
            src={company.logo}
            removeUrl={destroyLogo({ company: company.uuid }).url}
            label={labels.remove}
        />
    );
}
