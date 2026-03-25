import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { NestingDto } from '../types';
import { NestingCard } from './NestingCard';
import { formatDurata } from '../types';

interface Props {
  id: string;
  maCod: string;
  nestings: NestingDto[];
  secondiDisponibili: number;
  onRemove: (idNes: number) => void;
}

export function MachineColumn({ id, maCod, nestings, secondiDisponibili, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const totSec = nestings.reduce((s, n) => s + n.tempoTotaleSec, 0);
  const pct = secondiDisponibili > 0 ? Math.round((totSec / secondiDisponibili) * 100) : null;

  return (
    <div className={`machine-col${isOver ? ' machine-col--over' : ''}`}>
      <div className="machine-col-header">
        <div className="machine-header-left">
          <span className="machine-name">{maCod}</span>
          {secondiDisponibili > 0 && (
            <span className="machine-cap">{formatDurata(secondiDisponibili)} disp.</span>
          )}
        </div>
        <div className="machine-header-right">
          {nestings.length > 0 && (
            <span className={`machine-total${pct !== null && pct > 100 ? ' machine-total--over' : ''}`}>
              {formatDurata(totSec)}{pct !== null ? ` (${pct}%)` : ''}
            </span>
          )}
        </div>
      </div>
      <SortableContext
        items={nestings.map(n => String(n.idNes))}
        strategy={verticalListSortingStrategy}
      >
        <div className="machine-col-body" ref={setNodeRef}>
          {nestings.map(n => (
            <NestingCard key={n.idNes} nesting={n} onRemove={onRemove} />
          ))}
          {nestings.length === 0 && (
            <div className="empty-slot">Trascina qui</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
