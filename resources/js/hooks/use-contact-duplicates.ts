import { useEffect, useState } from 'react';
import type { ContactDuplicate } from '@/types';

/**
 * Interroge une route JSON de doublons dès qu'un e-mail complet ou un
 * téléphone d'au moins six chiffres est saisi (300 ms après la frappe).
 * `except` exclut la fiche en cours de modification.
 */
export function useContactDuplicates(
    buildUrl: (query: {
        email: string;
        phone: string;
        except: number | '';
        name: string;
    }) => string,
    email: string,
    phone: string,
    except: number | '' = '',
    enabled = true,
    /** Nom exact à comparer aussi (dès trois caractères), pour les partenaires. */
    name = '',
): ContactDuplicate[] {
    const [hits, setHits] = useState<ContactDuplicate[]>([]);

    useEffect(() => {
        const cleanEmail = email.trim();
        const digits = phone.replace(/\D/g, '');
        const validEmail = cleanEmail.includes('@');
        const validPhone = digits.length >= 6;
        const cleanName = name.trim();
        const validName = cleanName.length >= 3;

        if (!enabled || (!validEmail && !validPhone && !validName)) {
            setHits([]);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(
                buildUrl({
                    email: validEmail ? cleanEmail : '',
                    phone: validPhone ? phone : '',
                    except,
                    name: validName ? cleanName : '',
                }),
                {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((response) => (response.ok ? response.json() : []))
                .then((found: ContactDuplicate[]) => setHits(found))
                .catch(() => undefined);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // buildUrl est stable par construction (fonction de module).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, phone, except, enabled, name]);

    return hits;
}
