import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ButtonIcon from './index';

// Minimal stand-in for an MUI icon component. Renders an identifiable <svg>
// and forwards any iconProps so we can prove they reach the icon.
const MockIcon = (props: { label?: string }) => (
    <svg data-testid="mock-icon" aria-label={props.label} />
);

describe('ButtonIcon', () => {
    it('renders its title as the button text', () => {
        render(<ButtonIcon title="Book flight" />);
        expect(
            screen.getByRole('button', { name: 'Book flight' })
        ).toBeInTheDocument();
    });

    it('renders nothing in view mode', () => {
        const { container } = render(
            <ButtonIcon title="Book flight" isViewMode />
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('fires onClick when pressed', async () => {
        const onClick = vi.fn();
        render(<ButtonIcon title="Go" onClick={onClick} />);
        await userEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled and does not fire onClick when disabled', async () => {
        const onClick = vi.fn();
        render(<ButtonIcon title="Go" onClick={onClick} disabled />);
        const btn = screen.getByRole('button', { name: 'Go' });
        expect(btn).toBeDisabled();
        await userEvent.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('renders the icon and forwards iconProps to it', () => {
        render(
            <ButtonIcon
                title="Save"
                Icon={MockIcon}
                iconProps={{ label: 'save-icon' }}
            />
        );
        const icon = screen.getByTestId('mock-icon');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('aria-label', 'save-icon');
    });

    it('renders no icon element when Icon is omitted', () => {
        render(<ButtonIcon title="No icon" />);
        expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
    });

    it('places the icon after the title by default (iconPosition end)', () => {
        render(<ButtonIcon title="Next" Icon={MockIcon} />);
        const btn = screen.getByRole('button');
        // [ text "Next", <svg> ] — first node is the title text.
        expect(btn.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
        expect(btn.lastChild?.nodeName.toLowerCase()).toBe('svg');
    });

    it('places the icon before the title when iconPosition is start', () => {
        render(<ButtonIcon title="Back" Icon={MockIcon} iconPosition="start" />);
        const btn = screen.getByRole('button');
        // [ <svg>, text "Back" ] — first node is the icon.
        expect(btn.childNodes[0].nodeName.toLowerCase()).toBe('svg');
    });

    it('applies the STANDARD variant class by default', () => {
        render(<ButtonIcon title="Std" />);
        expect(screen.getByRole('button')).toHaveClass('button-icon');
    });

    it('applies the TEXT variant class', () => {
        render(<ButtonIcon title="Simple" type="text" />);
        expect(screen.getByRole('button')).toHaveClass('button-simple');
    });

    it('applies the TEXT_PLAIN variant class', () => {
        render(<ButtonIcon title="Plain" type="text-plain" />);
        expect(screen.getByRole('button')).toHaveClass('button-no-style');
    });

    it('merges a caller-supplied className with the variant class', () => {
        render(<ButtonIcon title="Custom" className="my-btn" />);
        const btn = screen.getByRole('button');
        expect(btn).toHaveClass('my-btn');
        expect(btn).toHaveClass('button-icon');
    });

    it('exposes an accessible name via ariaLabel', () => {
        render(<ButtonIcon Icon={MockIcon} ariaLabel="Delete item" />);
        expect(
            screen.getByRole('button', { name: 'Delete item' })
        ).toBeInTheDocument();
    });
});
