import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CsvExportControl } from './CsvExportControl.jsx';

const options = [
  { value: 'filtered', label: 'Directory (current filters)' },
  { value: 'all', label: 'Directory (all customers)' }
];

describe('CsvExportControl', () => {
  it('exposes the dataset selector and invokes the selected export action', () => {
    const onChange = vi.fn();
    const onExport = vi.fn();

    render(
      <CsvExportControl
        options={options}
        value="filtered"
        onChange={onChange}
        onExport={onExport}
        label="Customer export dataset"
      />
    );

    fireEvent.change(screen.getByLabelText('Customer export dataset'), {
      target: { value: 'all' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(onChange).toHaveBeenCalledWith('all');
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
