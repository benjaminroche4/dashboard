import {
    Mail,
    MessageCircle,
    Phone,
    Video,
    type LucideIcon,
} from 'lucide-react';
import type { RecontactChannel } from '@/types';

/** Un pictogramme par canal de recontact, pour les listes et les lignes de suivi. */
export const recontactChannelIcons: Record<RecontactChannel, LucideIcon> = {
    phone: Phone,
    email: Mail,
    whatsapp: MessageCircle,
    visio: Video,
};
