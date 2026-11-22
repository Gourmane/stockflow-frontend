import { ChevronLeft, ChevronRight } from 'lucide-react';
import ActionButton from './ActionButton';
import type { Pagination } from '../types/api';

const numberFormat = new Intl.NumberFormat('fr-FR');

interface LedgerPaginationProps {
  label: string;
  pagination: Pick<Pagination<unknown>, 'from' | 'to' | 'total' | 'current_page' | 'last_page'>;
  onPageChange: (page: number) => void;
}

export default function LedgerPagination({ label, pagination, onPageChange }: LedgerPaginationProps) {
  const { from, to, total, current_page: currentPage, last_page: lastPage } = pagination;

  return (
    <nav aria-label={label} className="pagination">
      <p className="text-xs text-muted tabular-nums sm:text-sm">
        {from !== null && to !== null
          ? <><span className="font-semibold text-ink">{numberFormat.format(from)}–{numberFormat.format(to)}</span> sur {numberFormat.format(total)}</>
          : 'Aucun résultat'}
      </p>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <span className="mr-1 text-xs text-muted tabular-nums">Page {currentPage} sur {lastPage}</span>
        <ActionButton variant="quiet" className="button-compact" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft aria-hidden="true" className="size-4" /> <span className="sr-only sm:not-sr-only">Précédent</span>
        </ActionButton>
        <ActionButton variant="quiet" className="button-compact" disabled={currentPage === lastPage} onClick={() => onPageChange(currentPage + 1)}>
          <span className="sr-only sm:not-sr-only">Suivant</span> <ChevronRight aria-hidden="true" className="size-4" />
        </ActionButton>
      </div>
    </nav>
  );
}
