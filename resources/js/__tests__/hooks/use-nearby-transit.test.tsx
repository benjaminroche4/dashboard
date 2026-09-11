import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const props = { features: { assistant: true, googleMapsKey: null } };

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props }) }));

import {
    useNearbyTransit,
    type TransitAddress,
} from '@/hooks/use-nearby-transit';
import type { TransitStop } from '@/types';

const stops: TransitStop[] = [
    { kind: 'metro', name: 'Oberkampf', lines: ['2', '9'], minutes: 4 },
];

/** Sonde : monte le hook et affiche ce qu'il rapporte. */
function Probe({
    address,
    onFound,
}: {
    address: TransitAddress;
    onFound: (found: TransitStop[]) => void;
}) {
    const { searching } = useNearbyTransit(address, onFound);

    return <span data-testid="state">{searching ? 'oui' : 'non'}</span>;
}

const address: TransitAddress = {
    street: '12 rue Oberkampf',
    postal_code: '75011',
    city: 'Paris',
};

describe('useNearbyTransit', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        props.features.assistant = true;
    });

    it('searches on its own once the address holds up, and only once per address', async () => {
        const onFound = vi.fn();
        const fetchMock = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ stops }),
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { rerender } = render(
            <Probe address={address} onFound={onFound} />,
        );

        // Rien ne part tant que la frappe n'est pas retombée.
        expect(fetchMock).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_300);

        await waitFor(() => expect(onFound).toHaveBeenCalledWith(stops));
        expect(fetchMock).toHaveBeenCalledWith(
            '/properties/transit',
            expect.objectContaining({ method: 'POST' }),
        );
        await waitFor(() =>
            expect(screen.getByTestId('state')).toHaveTextContent('non'),
        );

        // La même adresse, écrite autrement, ne relance pas l'assistant.
        rerender(
            <Probe
                address={{ ...address, street: '12  Rue Oberkampf ' }}
                onFound={onFound}
            />,
        );
        await vi.advanceTimersByTimeAsync(1_300);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('waits for a postal code, and stays quiet without the assistant or on failure', async () => {
        const onFound = vi.fn();
        const fetchMock = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
        );
        vi.stubGlobal('fetch', fetchMock);

        // Rue seule : l'assistant chercherait dans le vide.
        render(
            <Probe
                address={{
                    street: '12 rue Oberkampf',
                    postal_code: '',
                    city: '',
                }}
                onFound={onFound}
            />,
        );
        await vi.advanceTimersByTimeAsync(1_300);
        expect(fetchMock).not.toHaveBeenCalled();

        props.features.assistant = false;
        render(<Probe address={address} onFound={onFound} />);
        await vi.advanceTimersByTimeAsync(1_300);
        expect(fetchMock).not.toHaveBeenCalled();

        // Assistant en panne : rien n'est proposé, aucune erreur affichée.
        props.features.assistant = true;
        render(<Probe address={address} onFound={onFound} />);
        await vi.advanceTimersByTimeAsync(1_300);
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(onFound).not.toHaveBeenCalled();
    });
});
