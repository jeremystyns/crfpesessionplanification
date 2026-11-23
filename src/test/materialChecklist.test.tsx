import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MaterialAddButton, MaterialChecklist, MaterialCounter } from '@/modules/timeline/MaterialChecklist';

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
    render(<MaterialChecklist value="[ ] A" onChange={onChange} editable adding />);
    const input = screen.getByPlaceholderText('material.addPlaceholder');
    fireEvent.change(input, { target: { value: 'Colle' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('[ ] A\n[ ] Colle');
    fireEvent.click(screen.getAllByRole('button', { name: /material.remove/ })[0]);
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('edits an existing entry in place and keeps the tick state', () => {
    const onChange = vi.fn();
    render(<MaterialChecklist value={'[x] Badges\n[ ] Marqueurs'} onChange={onChange} editable />);
    fireEvent.click(screen.getByText('Marqueurs'));
    const input = screen.getByRole('textbox', { name: /material.edit/ });
    fireEvent.change(input, { target: { value: 'Marqueurs noirs' } });
    expect(onChange).toHaveBeenLastCalledWith('[x] Badges\n[ ] Marqueurs noirs');
  });

  it('removes an entry that was emptied when editing ends', () => {
    const Harness = () => {
      const [value, setValue] = useState('[ ] A\n[ ] B');
      return (
        <>
          <MaterialChecklist value={value} onChange={setValue} editable />
          <output data-testid="value">{value}</output>
        </>
      );
    };
    render(<Harness />);
    fireEvent.click(screen.getByText('B'));
    const input = screen.getByRole('textbox', { name: /material.edit/ });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('value').textContent).toBe('[ ] A');
  });

  it('does not take a row of its own for the add button: it sits in the title row', () => {
    const onClick = vi.fn();
    const { container } = render(<MaterialAddButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('li')).toHaveLength(0);
    // The list itself only renders the add field while adding.
    const list = render(<MaterialChecklist value="[ ] A" onChange={() => {}} editable />);
    expect(list.container.querySelectorAll('li')).toHaveLength(1);
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
