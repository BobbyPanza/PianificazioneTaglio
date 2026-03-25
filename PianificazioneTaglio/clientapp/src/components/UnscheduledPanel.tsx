import { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { NestingDto } from '../types';
import { NestingCard } from './NestingCard';

interface Props {
  nestings: NestingDto[];
}

type CampoDiRicerca = 'tutti' | 'piano' | 'macchina' | 'materiale' | 'commessa' | 'riferimento' | 'cliente';

const CAMPI: { value: CampoDiRicerca; label: string }[] = [
  { value: 'tutti',       label: 'Tutti i campi' },
  { value: 'piano',       label: 'Piano (desc.)' },
  { value: 'macchina',    label: 'Macchina' },
  { value: 'materiale',   label: 'Materiale' },
  { value: 'commessa',    label: 'Commessa' },
  { value: 'riferimento', label: 'Riferimento' },
  { value: 'cliente',     label: 'Cliente' },
];

export function UnscheduledPanel({ nestings }: Props) {
  const [filtro, setFiltro] = useState('');
  const [campo, setCampo] = useState<CampoDiRicerca>('tutti');
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });

  const filtrati = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return nestings;

    return nestings.filter(n => {
      switch (campo) {
        case 'piano':      return (n.nsDsc || n.nsCod).toLowerCase().includes(q);
        case 'macchina':   return n.maCod.toLowerCase().includes(q);
        case 'materiale':  return n.materiale.toLowerCase().includes(q);
        case 'commessa':   return n.commesse.toLowerCase().includes(q);
        case 'riferimento':return n.riferimenti.toLowerCase().includes(q);
        case 'cliente':    return n.clienti.toLowerCase().includes(q);
        case 'tutti':
        default:
          return (
            (n.nsDsc || n.nsCod).toLowerCase().includes(q) ||
            n.maCod.toLowerCase().includes(q) ||
            n.materiale.toLowerCase().includes(q) ||
            n.commesse.toLowerCase().includes(q) ||
            n.riferimenti.toLowerCase().includes(q) ||
            n.clienti.toLowerCase().includes(q)
          );
      }
    });
  }, [nestings, filtro, campo]);

  return (
    <div className={`unscheduled-panel${isOver ? ' unscheduled-panel--over' : ''}`}>
      <div className="panel-header">
        <h3>Non pianificati</h3>
        <span className="badge">{nestings.length}</span>
      </div>

      <div className="panel-filter">
        <select
          className="filter-campo"
          value={campo}
          onChange={e => setCampo(e.target.value as CampoDiRicerca)}
        >
          {CAMPI.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="filter-input-wrap">
          <input
            type="text"
            placeholder="Cerca…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          {filtro && (
            <button className="filter-clear" onClick={() => setFiltro('')} title="Cancella">✕</button>
          )}
        </div>
      </div>

      {filtro && (
        <div className="filter-result-bar">
          {filtrati.length} di {nestings.length} risultati
        </div>
      )}

      <SortableContext
        items={filtrati.map(n => String(n.idNes))}
        strategy={verticalListSortingStrategy}
      >
        <div className="panel-body" ref={setNodeRef}>
          {filtrati.map(n => (
            <NestingCard key={n.idNes} nesting={n} />
          ))}
          {filtrati.length === 0 && (
            <div className="empty-slot">
              {filtro ? 'Nessun risultato' : 'Nessun nesting da pianificare'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
