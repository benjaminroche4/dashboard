import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContactDuplicates } from '@/hooks/use-contact-duplicates';

const buildUrl = (query: {
    email: string;
    phone: string;
    except: number | '';
}) => `/dup?email=${query.email}&phone=${query.phone}&except=${query.except}`;

describe('useContactDuplicates', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('queries once the e-mail is complete or the phone long enough, after a debounce', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve([
                    {
                        id: 1,
                        name: 'Zoé Martin',
                        email: 'zoe@x.fr',
                        phone: null,
                    },
                ]),
        });

        const { result, rerender } = renderHook(
            ({ email, phone }) =>
                useContactDuplicates(buildUrl, email, phone, 4),
            { initialProps: { email: 'zoe', phone: '06 1' } },
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(400);
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current).toEqual([]);

        rerender({ email: 'zoe@x.fr', phone: '06 1' });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(400);
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/dup?email=zoe@x.fr&phone=&except=4',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(result.current).toEqual([
            { id: 1, name: 'Zoé Martin', email: 'zoe@x.fr', phone: null },
        ]);
    });

    it('does nothing while disabled and clears previous hits', async () => {
        const { result } = renderHook(() =>
            useContactDuplicates(buildUrl, 'zoe@x.fr', '', '', false),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(400);
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current).toEqual([]);
    });
});
