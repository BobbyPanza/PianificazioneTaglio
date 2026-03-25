import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NestingDto, ParteNestingDto } from '../types';
import { formatDurata, STNES_LABEL } from '../types';
import { getParti } from '../api/nestingApi';
import { PartiDialog } from './PartiDialog';

interface Props {
  nesting: NestingDto;
  onRemove?: (idNes: number) => void;
  isOverlay?: boolean;
}

export function NestingCard({ nesting, onRemove, isOverlay }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parti, setParti] = useState<ParteNestingDto[]>([]);
  const [loadingParti, setLoadingParti] = useState(false);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: String(nesting.idNes) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isOverlay ? 'grabbing' : 'grab',
  };

  const stnesColor: Record<number, string> = {
    3: '#f59e0b',
    4: '#3b82f6',
    5: '#10b981',
    6: '#6b7280',
  };

  async function openInfo(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setDialogOpen(true);
    setLoadingParti(true);
    try {
      const data = await getParti(nesting.idNes);
      setParti(data);
    } finally {
      setLoadingParti(false);
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`nesting-card${nesting.stNes === 5 ? ' nesting-card--terminato' : ''}`}
      >
        <div className="card-header" style={{ borderLeft: `4px solid ${stnesColor[nesting.stNes] ?? '#999'}` }}>
          <div className="card-header-left">
            <span className="card-code">{nesting.nsDsc || nesting.nsCod || `#${nesting.idNes}`}</span>
            <span className="card-idnes">#{nesting.idNes}</span>
          </div>
          <span className="card-status">{STNES_LABEL[nesting.stNes]}</span>
        </div>
        <div className="card-body">
          <div className="card-row">
            <span>🔧 {nesting.maCod || '—'}</span>
            <span>⏱ {formatDurata(nesting.tempoTotaleSec)}</span>
          </div>
          <div className="card-row">
            <span>📦 {nesting.numParti} parti</span>
            <span>🗂 {nesting.numLamiere} lam.</span>
          </div>
          {nesting.materiale && (
            <div className="card-material">{nesting.materiale}</div>
          )}
          {nesting.primaScadenza && (
            <div className={`card-scadenza${new Date(nesting.primaScadenza) < new Date() ? ' card-scadenza--late' : ''}`}>
              ⏰ {new Date(nesting.primaScadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </div>
          )}
        </div>

        {/* Bottoni azione */}
        <div className="card-actions">
          <button
            className="card-btn-info"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={openInfo}
            title="Dettaglio parti"
          >
            ℹ
          </button>
          {onRemove && (
            <button
              className="card-btn-remove"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(nesting.idNes)}
              title="Rimuovi dal piano"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {dialogOpen && (
        <PartiDialog
          nsCod={nesting.nsCod}
          idNes={nesting.idNes}
          parti={parti}
          loading={loadingParti}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
