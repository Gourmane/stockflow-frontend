import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { StockMovementHistoryItem } from '../types/stockMovement';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const numberFormat = new Intl.NumberFormat('fr-FR');

function MovementType({ type }: Pick<StockMovementHistoryItem, 'type'>) {
  const inbound = type === 'in';
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={`badge whitespace-nowrap ${inbound ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-800'}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {inbound ? 'Entrée' : 'Sortie'}
    </span>
  );
}

function MovementQuantity({ type, quantity }: Pick<StockMovementHistoryItem, 'type' | 'quantity'>) {
  return <span className="whitespace-nowrap font-semibold tabular-nums">{type === 'in' ? '+' : '−'}{numberFormat.format(quantity)}</span>;
}

function MovementDate({ value }: { value: StockMovementHistoryItem['created_at'] }) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>
    : 'Non renseignée';
}

type Movement = Pick<StockMovementHistoryItem, 'id' | 'product' | 'user' | 'type' | 'quantity' | 'created_at'>
  & Partial<Pick<StockMovementHistoryItem, 'note'>>;

interface MovementTableProps {
  headingId: string;
  movements: Movement[];
  showNotes?: boolean;
}

export default function MovementTable({ headingId, movements, showNotes = false }: MovementTableProps) {
  return (
    <table role="table" aria-labelledby={headingId} className="ledger-table ledger-table--stack">
      <thead role="rowgroup">
        <tr role="row">
          <th role="columnheader" scope="col" className="w-1/4">Produit / SKU</th>
          <th role="columnheader" scope="col">Type</th>
          <th role="columnheader" scope="col" className="cell-end">Quantité</th>
          <th role="columnheader" scope="col">Date</th>
          <th role="columnheader" scope="col">Enregistré par</th>
          {showNotes && <th role="columnheader" scope="col" className="w-1/4">Note</th>}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {movements.map(({ id, product, type, quantity, created_at, user, note }) => (
          <tr key={id} role="row">
            <th role="rowheader" scope="row" className="col-span-2">
              {product.name}
              <span className="mt-0.5 block font-mono text-xs font-normal text-muted">{product.sku}</span>
            </th>
            <td role="cell">
              <span aria-hidden="true" className="ledger-label">Type</span>
              <MovementType type={type} />
            </td>
            <td role="cell" className="cell-end">
              <span aria-hidden="true" className="ledger-label">Quantité</span>
              <MovementQuantity type={type} quantity={quantity} />
            </td>
            <td role="cell" className="text-muted">
              <span aria-hidden="true" className="ledger-label">Date</span>
              <MovementDate value={created_at} />
            </td>
            <td role="cell">
              <span aria-hidden="true" className="ledger-label">Enregistré par</span>
              {user.name}
            </td>
            {showNotes && (
              <td role="cell" className={`col-span-2 text-muted ${note ? '' : 'max-lg:sr-only'}`}>
                <span aria-hidden="true" className="ledger-label">Note</span>
                {note ? <span className="whitespace-pre-wrap">{note}</span> : '—'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
