import { memberTone } from '@/components/leads/lead-assign-menu';
import {
    PictureMenuItem,
    PictureTile,
    type PictureLabels,
} from '@/components/picture-tile';
import {
    destroy as destroyPhoto,
    update as updatePhoto,
} from '@/routes/owners/photo';
import type { Owner } from '@/types';

type PhotoOwner = Pick<Owner, 'id' | 'uuid' | 'name' | 'kind' | 'photo'>;

const personLabels: PictureLabels = {
    add: 'Ajouter une photo',
    change: 'Changer la photo',
    remove: 'Retirer la photo',
    choose: 'Choisir une photo',
    tooLarge: 'La photo ne doit pas dépasser 2 Mo.',
};

const companyLabels: PictureLabels = {
    add: 'Ajouter un logo',
    change: 'Changer le logo',
    remove: 'Retirer le logo',
    choose: 'Choisir un logo',
    tooLarge: 'Le logo ne doit pas dépasser 2 Mo.',
};

/** Les libellés suivent le type : une personne a une photo, une société un logo. */
export function ownerPictureLabels(owner: Pick<Owner, 'kind'>): PictureLabels {
    return owner.kind === 'company' ? companyLabels : personLabels;
}

/**
 * La pastille de l'en-tête de la fiche propriétaire, sur le modèle des
 * agents et des agences (28 octobre 2026) : le portrait d'un particulier
 * (qui remplit la pastille, teinte `memberTone` sans photo) ou le logo d'une
 * société (qui garde sa marge), cliquable pour en poser un.
 */
export function OwnerPhotoTile({ owner }: { owner: PhotoOwner }) {
    const company = owner.kind === 'company';

    return (
        <PictureTile
            name={owner.name}
            src={owner.photo}
            uploadUrl={updatePhoto({ owner: owner.uuid }).url}
            field="photo"
            labels={ownerPictureLabels(owner)}
            fit={company ? 'contain' : 'cover'}
            className={
                company ? 'bg-primary/10 text-primary' : memberTone(owner.id)
            }
        />
    );
}

/** Entrée « Retirer la photo / le logo » du menu « ⋯ » ; absente sans image. */
export function OwnerPhotoMenuItem({ owner }: { owner: PhotoOwner }) {
    return (
        <PictureMenuItem
            src={owner.photo}
            removeUrl={destroyPhoto({ owner: owner.uuid }).url}
            label={ownerPictureLabels(owner).remove}
        />
    );
}
