import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test/renderWithProviders';
import type { Activity } from 'types';

let mockActivitiesProps: any;
vi.mock('components/DestinationDetail/Activities', () => ({
    default: (props: any) => {
        mockActivitiesProps = props;
        return <div data-testid="activities" />;
    },
}));

import Single from './index';

beforeEach(() => {
    mockActivitiesProps = undefined;
});

const acts = [{ id: 1, name: 'Louvre', kind: 'place' }] as unknown as Activity[];

describe('Single', () => {
    it('forwards trips → activities and pins destIdx to 0', () => {
        render(
            <Single
                trips={acts}
                date="2026-08-01"
                country="France"
                onChangePlace={vi.fn()}
                onChangeBudget={vi.fn()}
            />
        );
        expect(mockActivitiesProps.activities).toBe(acts);
        expect(mockActivitiesProps.destIdx).toBe(0);
        expect(mockActivitiesProps.date).toBe('2026-08-01');
        expect(mockActivitiesProps.country).toBe('France');
    });

    it('passes an empty array to Activities when there are no trips (still renders the droppable)', () => {
        render(<Single onChangePlace={vi.fn()} onChangeBudget={vi.fn()} />);
        expect(mockActivitiesProps.activities).toEqual([]);
    });

    it('threads the post-planning + auto-save flags through unchanged', () => {
        render(
            <Single
                trips={acts}
                onChangePlace={vi.fn()}
                onChangeBudget={vi.fn()}
                tripStatusName="Confirmed"
                allowStatusToggle
                allowPaidEdits
                isAutoSaving
                lockActivityStatus
            />
        );
        expect(mockActivitiesProps.tripStatusName).toBe('Confirmed');
        expect(mockActivitiesProps.allowStatusToggle).toBe(true);
        expect(mockActivitiesProps.allowPaidEdits).toBe(true);
        expect(mockActivitiesProps.isAutoSaving).toBe(true);
        expect(mockActivitiesProps.lockActivityStatus).toBe(true);
    });
});
