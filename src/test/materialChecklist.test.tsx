import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MaterialChecklist, MaterialCounter } from '@/modules/timeline/MaterialChecklist';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, vars?: Record<string, string | number>) => (vars ? `${key} ${JSON.stringify(vars)}` : key) }),
}));

afterEach(cleanup);

describe('MaterialChecklist', () => {
  it('shows one checkbox per entry, checked when the material is ready', () => {
    render(<MaterialChecklist value={'[x] Badges\n[ ] Marqueurs'} onChange={() => {}} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
  });

  it('ticking an entry rewrites the stored text', () => {
    const onChange = vi.fn();
    render(<MaterialChecklist value={'[x] Badges\n[ ] Marqueurs'} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(onChange).toHaveBeenCalledWith('[x] Badges\n[x] Marqueurs');
  });

  it('does not open the card when a box is clicked', () => {
    const outer = vi.fn();
    render(<div onClick={outer}><MaterialChecklist value="[ ] A" onChange={() => {}} /></div>);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(outer).not.toHaveBeenCalled();
  });

  it('adds an entry with Enter and removes one from the editor', () => {
    const onChange = vi.fn();
    render(<MaterialChecklist value="[ ] A" onChange={onChange} editable startAdding />);
    const input = screen.getByPlaceholderText('material.addPlaceholder');
    fireEvent.change(input, { target: { value: 'Colle' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('[ ] A\n[ ] Colle');
    fireEvent.click(screen.getAllByRole('button', { name: /material.remove/ })[0]);
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('is read only without onChange', () => {
    render(<MaterialChecklist value="[ ] A" />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});

describe('MaterialCounter', () => {
  it('shows ready out of total, and nothing for an empty list', () => {
    const { container, rerender } = render(<MaterialCounter value={'[x] A\n[ ] B'} />);
    expect(container.textContent).toBe('1/2');
    rerender(<MaterialCounter value="" />);
    expect(container.textContent).toBe('');
  });
});
