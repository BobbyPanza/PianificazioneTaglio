import { useEffect, useRef } from 'react';
import type { ParteNestingDto } from '../types';

interface Props {
  nsCod: string;
  idNes: number;
  parti: ParteNestingDto[];
  loading: boolean;
  onClose: () => void;
}

export function PartiDialog({ nsCod, idNes, parti, loading, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  function fmtData(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <dialog ref={dialogRef} className="parti-dialog" onClose={onClose}>
      <div className="dialog-header">
        <div>
          <span className="dialog-title">Parti nesting</span>
          <span className="dialog-subtitle">{nsCod || `#${idNes}`}</span>
        </div>
        <button className="dialog-close" onClick={onClose}>✕</button>
      </div>

      <div className="dialog-body">
        {loading ? (
          <div className="dialog-loading">Caricamento…</div>
        ) : parti.length === 0 ? (
          <div className="dialog-empty">Nessuna parte trovata</div>
        ) : (
          <table className="parti-table">
            <thead>
              <tr>
                <th>Parte</th>
                <th>Commessa</th>
                <th>Cliente</th>
                <th>Riferimento</th>
                <th>Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {parti.map((p, i) => (
                <tr key={i}>
                  <td className="cell-code">{p.paCod}</td>
                  <td className="cell-code">{p.coCod}</td>
                  <td>{p.ctDsc || '—'}</td>
                  <td className="cell-rif">{p.coRif || '—'}</td>
                  <td className={`cell-date${isScaduta(p.cmDts) ? ' scaduta' : ''}`}>
                    {fmtData(p.cmDts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dialog-footer">
        <span className="dialog-count">{parti.length} parti</span>
        <button onClick={onClose}>Chiudi</button>
      </div>
    </dialog>
  );
}

function isScaduta(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}
