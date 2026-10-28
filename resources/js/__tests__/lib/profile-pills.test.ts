import { describe, expect, it } from 'vitest';
import { agencySpecialtyIcons, spokenLanguageFlags } from '@/lib/profile-pills';

// Miroirs des enums PHP : une valeur ajoutée côté serveur doit avoir son
// drapeau ou son pictogramme ici, sinon la pastille sort nue.
const languages = ['en', 'es', 'de', 'it', 'pt', 'zh', 'ar', 'ru', 'ja'];
const specialties = [
    'furnished',
    'unfurnished',
    'luxury',
    'students',
    'expats',
    'corporate',
    'families',
    'short_term',
    'flatshare',
];

describe('profile pills', () => {
    it('gives every spoken language a two-letter country flag', () => {
        for (const value of languages) {
            expect(spokenLanguageFlags[value]).toMatch(/^[A-Z]{2}$/);
        }
    });

    it('gives every specialty an icon', () => {
        for (const value of specialties) {
            expect(agencySpecialtyIcons[value]).toBeTypeOf('object');
        }
    });
});
