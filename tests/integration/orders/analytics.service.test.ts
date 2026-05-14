import { getStepSpeed } from '../../../src/modules/orders/analytics.service';

describe('getStepSpeed', () => {
    it('calculates correct speed for completed step', () => {
        const logs = [
        {
            step_name: 'printing',
            event_type: 'START',
            created_at: new Date('2026-01-01T10:00:00Z')
        },
        {
            step_name: 'printing',
            event_type: 'END',
            created_at: new Date('2026-01-01T11:00:00Z')
        }
        ];

        const result = getStepSpeed(logs, 'printing', 1000);

        expect(result).toEqual({
        step: 'printing',
        quantity: 1000,
        durationHours: 1,
        speed: 1000
        });
    });

    it('returns null when START is missing', () => {
        const logs = [
            {
            step_name: 'printing',
            event_type: 'END',
            created_at: new Date()
            }
        ];

        const result = getStepSpeed(logs, 'printing', 1000);
        expect(result).toBeNull();
    });

    it('returns null when END is missing', () => {
    const logs = [
        {
        step_name: 'printing',
        event_type: 'START',
        created_at: new Date()
        }
    ];
    const result = getStepSpeed(logs, 'printing', 1000);

    expect(result).toBeNull();
    });

    it('returns null when duration is zero', () => {
    const date = new Date();
    const logs = [
        { step_name: 'printing', event_type: 'START', created_at: date },
        { step_name: 'printing', event_type: 'END', created_at: date }
    ];
    const result = getStepSpeed(logs, 'printing', 1000);

    expect(result).toBeNull();
    });
});

