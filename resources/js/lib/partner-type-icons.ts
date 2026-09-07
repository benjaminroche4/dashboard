import {
    Handshake,
    KeyRound,
    Landmark,
    ShieldCheck,
    Tag,
    Truck,
    type LucideIcon,
} from 'lucide-react';
import type { PartnerType } from '@/types';

/** Icône par type de partenaire, pour les repérer d'un coup d'œil. */
export const partnerTypeIcons: Record<PartnerType, LucideIcon> = {
    management: KeyRound,
    insurance: ShieldCheck,
    bank: Landmark,
    mover: Truck,
    partnership: Handshake,
    other: Tag,
};
