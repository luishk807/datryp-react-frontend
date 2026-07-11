import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { ReadinessCheck } from 'utils';
import ReadinessChecklist from './index';

const checks: ReadinessCheck[] = [
    { key: 'lodging', label: 'Lodging added', ok: true },
    { key: 'budget', label: 'Budget not set', ok: false },
];

describe('ReadinessChecklist', () => {
    it('renders each headline check with its localized pass/fail label', () => {
        renderWithProviders(
            <ReadinessChecklist checks={checks} freeDays={[]} />
        );
        expect(screen.getByText('Lodging added')).toBeInTheDocument();
        expect(screen.getByText('Budget not set')).toBeInTheDocument();
        // A checklist is a real list — items are semantic <li> rows.
        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('lists free-day rows and collapses the overflow into a "+N more" row', () => {
        renderWithProviders(
            <ReadinessChecklist checks={checks} freeDays={[1, 2, 3, 4, 5]} />
        );
        expect(screen.getByText('Day 1 has free time')).toBeInTheDocument();
        expect(screen.getByText('Day 2 has free time')).toBeInTheDocument();
        expect(screen.getByText('Day 3 has free time')).toBeInTheDocument();
        // Only the first three are shown inline.
        expect(
            screen.queryByText('Day 4 has free time')
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('+2 more days with free time')
        ).toBeInTheDocument();
        // 2 checks + 3 free-day rows + 1 overflow row.
        expect(screen.getAllByRole('listitem')).toHaveLength(6);
    });

    it('renders only the checks when there are no free days', () => {
        renderWithProviders(
            <ReadinessChecklist checks={checks} freeDays={[]} />
        );
        expect(screen.queryByText(/free time/)).not.toBeInTheDocument();
    });
});
