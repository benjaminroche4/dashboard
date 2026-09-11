import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, del } = vi.hoisted(() => ({ post: vi.fn(), del: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post, delete: del } }));

import { DocumentRequestBulkActions } from '@/components/documents/document-request-bulk-actions';
import { makeDocumentRequest } from '@/test/fixtures/document-request';

const requests = [
    makeDocumentRequest({ id: 1 }),
    makeDocumentRequest({ id: 2, name: 'John Doe' }),
];

describe('DocumentRequestBulkActions', () => {
    beforeEach(() => {
        post.mockReset();
        del.mockReset();
    });

    it('renders nothing for members who cannot delete', () => {
        const { container } = render(
            <DocumentRequestBulkActions
                requests={requests}
                onDone={vi.fn()}
                canDelete={false}
            />,
        );

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('button', { name: /Envoyer/ })).toBeNull();
    });

    it('asks for confirmation then deletes every selected request', async () => {
        const user = userEvent.setup();
        const onDone = vi.fn();
        del.mockImplementation((...args: unknown[]) =>
            (args[1] as { onSuccess?: () => void } | undefined)?.onSuccess?.(),
        );
        render(
            <DocumentRequestBulkActions
                requests={requests}
                onDone={onDone}
                canDelete
            />,
        );

        await user.click(
            screen.getByRole('button', { name: /Supprimer \(2\)/ }),
        );
        expect(
            screen.getByRole('heading', { name: 'Supprimer 2 liste(s) ?' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Supprimer' }));

        expect(del).toHaveBeenCalledWith(
            '/tools/documents/bulk',
            expect.objectContaining({ data: { ids: [1, 2] } }),
        );
        expect(onDone).toHaveBeenCalledOnce();
    });
});
