import { Download } from 'lucide-react';
import { Button, Select } from '@/components/ui/index.js';

/**
 * A compact select-and-download control shared by directory pages. The page
 * owns the request, permissions, and busy state; this component only makes
 * the dataset choice explicit and accessible.
 */
export function CsvExportControl({
  options,
  value,
  onChange,
  onExport,
  isLoading = false,
  label = 'Export dataset'
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        aria-label={label}
        className="min-w-[220px]"
        containerClassName="min-w-[220px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        leftIcon={Download}
        onClick={onExport}
        isLoading={isLoading}
      >
        Export CSV
      </Button>
    </div>
  );
}
