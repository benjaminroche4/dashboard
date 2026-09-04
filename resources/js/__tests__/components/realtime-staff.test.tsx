import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useStaffChannel } = vi.hoisted(() => ({ useStaffChannel: vi.fn() }));

vi.mock('@/hooks/use-staff-channel', () => ({ useStaffChannel }));

import { RealtimeStaff } from '@/components/realtime-staff';

describe('RealtimeStaff', () => {
    it('subscribes to the staff channel and renders nothing', () => {
        const { container } = render(<RealtimeStaff />);

        expect(useStaffChannel).toHaveBeenCalledTimes(1);
        expect(container).toBeEmptyDOMElement();
    });
});
