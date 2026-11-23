import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarLeaf } from '@/modules/timeline/CalendarLeaf';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }),
}));

afterEach(cleanup);

describe('CalendarLeaf', () => {
  it('shows month, day number, weekday and year like a calendar page', () => {
    const { container } = render(<CalendarLeaf date="2026-11-24" />);
    const text = container.textContent ?? '';
    expect(text).toContain('nov');
    expect(text).toContain('24');
    expect(text.toLowerCase()).toContain('mardi');
    expect(text).toContain('2026');
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-24');
  });

  it('opens the date picker of the header when clicked', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('data-date-trigger', '');
    const onClick = vi.fn();
    trigger.addEventListener('click', onClick);
    document.body.appendChild(trigger);
    render(<CalendarLeaf date="2026-11-24" />);
    fireEvent.click(screen.getByRole('button', { name: /24 novembre 2026/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    trigger.remove();
  });

  it('renders nothing for an invalid date', () => {
    const { container } = render(<CalendarLeaf date="pas une date" />);
    expect(container.firstChild).toBeNull();
  });
});
