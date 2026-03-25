import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { NestingDto, TipoFaseDto } from './types';
import {
  getTipiFase, getMacchine, getNonPianificati, getPianificati, getCapacita,
  salvaPiano, rimuoviPiano, riordina,
} from './api/nestingApi';
import { UnscheduledPanel } from './components/UnscheduledPanel';
import { MachineColumn } from './components/MachineColumn';
import { NestingCard } from './components/NestingCard';
import './App.css';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function getMonday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() + ((day === 0 ? -6 : 1) - day));
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d: Date, n: number): Date {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}
// Formatta la data come YYYY-MM-DD usando il fuso locale (evita lo shift UTC)
function fmtISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}
function slotKey(maCod: string, data: Date): string {
  return `${maCod}__${fmtISO(data)}`;
}
function parseSlotKey(key: string): { maCod: string; data: Date } | null {
  const parts = key.split('__');
  if (parts.length !== 2) return null;
  // T12:00:00 evita che new Date("YYYY-MM-DD") sia interpretata come mezzanotte UTC
  return { maCod: parts[0], data: new Date(parts[1] + 'T12:00:00') };
}

type Containers = Record<string, NestingDto[]>;

function findContainer(id: string, c: Containers): string | undefined {
  if (id in c) return id;
  return Object.keys(c).find(key => c[key].some(n => String(n.idNes) === id));
}

// ── App principale ────────────────────────────────────────────────────────────
export default function App() {
  const [tipiFase, setTipiFase] = useState<TipoFaseDto[]>([]);
  const [tipoFase, setTipoFase] = useState<TipoFaseDto | null>(null);
  const [lunedi, setLunedi] = useState<Date>(getMonday(new Date()));
  const [tutteLeMacchine, setTutteLeMacchine] = useState<string[]>([]);
  const [macchineSelezionate, setMacchineSelezionate] = useState<string[]>([]);
  const [containers, setContainers] = useState<Containers>({ unscheduled: [] });
  const [activeNesting, setActiveNesting] = useState<NestingDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [capacita, setCapacita] = useState<Record<string, number>>({});

  const containersRef = useRef<Containers>(containers);
  useEffect(() => { containersRef.current = containers; }, [containers]);
  const originalContainerRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Carica i tipi fase disponibili all'avvio
  useEffect(() => {
    getTipiFase().then(tipi => {
      setTipiFase(tipi);
      if (tipi.length > 0) setTipoFase(tipi[0]);
    });
  }, []);

  const caricaDati = useCallback(async () => {
    if (!tipoFase) return;
    const sabato = addDays(lunedi, 5);
    const [np, pi] = await Promise.all([
      getNonPianificati(tipoFase.tfCod),
      getPianificati(lunedi, sabato, tipoFase.tfCod),
    ]);
    const nc: Containers = { unscheduled: np };
    for (const n of pi) {
      if (n.dataPiano && n.maCod) {
        const k = `${n.maCod}__${n.dataPiano.split('T')[0]}`;
        if (!nc[k]) nc[k] = [];
        nc[k].push(n);
      }
    }
    for (const k of Object.keys(nc)) {
      if (k !== 'unscheduled') nc[k].sort((a, b) => a.seqOrd - b.seqOrd);
    }
    setContainers(nc);
  }, [lunedi, tipoFase]);

  // Al cambio tipo fase: carica macchine abilitate
  useEffect(() => {
    if (!tipoFase) return;
    getMacchine(tipoFase.tfCod).then(m => {
      setTutteLeMacchine(m);
      setMacchineSelezionate(m.slice(0, Math.min(4, m.length)));
    });
  }, [tipoFase]);

  // Capacità giornaliera per macchine selezionate
  useEffect(() => {
    if (!macchineSelezionate.length) { setCapacita({}); return; }
    const sabato = addDays(lunedi, 5);
    getCapacita(macchineSelezionate, lunedi, sabato)
      .then(rows => {
        const map: Record<string, number> = {};
        for (const r of rows) {
          const dateKey = r.giorno.split('T')[0];
          map[`${r.maCod}__${dateKey}`] = r.secondiDisponibili;
        }
        setCapacita(map);
      })
      .catch(err => console.error('[capacita]', err));
  }, [macchineSelezionate, lunedi]);

  useEffect(() => { caricaDati(); }, [caricaDati]);

  function findNestingById(id: string): NestingDto | undefined {
    for (const items of Object.values(containersRef.current)) {
      const f = items.find(n => String(n.idNes) === id);
      if (f) return f;
    }
  }

  function onDragStart({ active }: DragStartEvent) {
    const id = String(active.id);
    originalContainerRef.current = findContainer(id, containersRef.current) ?? null;
    setActiveNesting(findNestingById(id) ?? null);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId   = String(over.id);
    const c = containersRef.current;
    const src = findContainer(activeId, c);
    const dst = findContainer(overId, c) ?? overId;
    if (!src || !dst || src === dst) return;
    setContainers(prev => {
      const srcItems = [...(prev[src] ?? [])];
      const dstItems = [...(prev[dst] ?? [])];
      const idx = srcItems.findIndex(n => String(n.idNes) === activeId);
      if (idx === -1) return prev;
      const overIdx = dstItems.findIndex(n => String(n.idNes) === overId);
      const at = overIdx >= 0 ? overIdx : dstItems.length;
      const [moved] = srcItems.splice(idx, 1);
      dstItems.splice(at, 0, moved);
      return { ...prev, [src]: srcItems, [dst]: dstItems };
    });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveNesting(null);
    const activeId = String(active.id);
    const overId   = over ? String(over.id) : null;
    const origCont = originalContainerRef.current;
    originalContainerRef.current = null;
    const c        = containersRef.current;
    const currCont = findContainer(activeId, c);
    if (!overId || !currCont || !origCont) { await caricaDati(); return; }

    setSaving(true);
    try {
      if (currCont === 'unscheduled') {
        await rimuoviPiano(parseInt(activeId));
      } else if (origCont === currCont) {
        const items   = c[currCont];
        const fromIdx = items.findIndex(n => String(n.idNes) === activeId);
        const toIdx   = items.findIndex(n => String(n.idNes) === overId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const newOrder = arrayMove(items, fromIdx, toIdx);
          const slot = parseSlotKey(currCont);
          if (slot) await riordina(slot.maCod, slot.data, newOrder.map(n => n.idNes));
        }
      } else {
        const slot = parseSlotKey(currCont);
        if (!slot) { await caricaDati(); return; }
        const items = c[currCont];
        const seq   = (items.findIndex(n => String(n.idNes) === activeId) + 1) || items.length;
        await salvaPiano(parseInt(activeId), slot.maCod, slot.data, seq);
        if (items.length > 1) await riordina(slot.maCod, slot.data, items.map(n => n.idNes));
      }
    } finally {
      setSaving(false);
      await caricaDati();
    }
  }

  function toggleMacchina(m: string) {
    setMacchineSelezionate(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  }

  const giorni = Array.from({ length: 6 }, (_, i) => addDays(lunedi, i));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="app">
        <header className="app-header">
          <h1>Pianificazione Taglio Laser</h1>
          <select
            className="fase-select"
            value={tipoFase?.tfCod ?? ''}
            onChange={e => {
              const tf = tipiFase.find(t => t.tfCod === e.target.value);
              if (tf) setTipoFase(tf);
            }}
          >
            {tipiFase.map(tf => (
              <option key={tf.tfCod} value={tf.tfCod}>{tf.tfDsc}</option>
            ))}
          </select>
          {saving && <span className="saving-badge">Salvataggio…</span>}
          <div className="week-nav">
            <button onClick={() => setLunedi(d => addDays(d, -7))}>◄</button>
            <span className="week-label">
              Sett. {fmtDate(lunedi)} – {fmtDate(addDays(lunedi, 5))}
            </span>
            <button onClick={() => setLunedi(d => addDays(d, 7))}>►</button>
            <button className="btn-oggi" onClick={() => setLunedi(getMonday(new Date()))}>Oggi</button>
          </div>
          <div className="machine-selector">
            {tutteLeMacchine.map(m => (
              <label key={m} className={`machine-chip${macchineSelezionate.includes(m) ? ' active' : ''}`}>
                <input type="checkbox" checked={macchineSelezionate.includes(m)} onChange={() => toggleMacchina(m)} />
                {m}
              </label>
            ))}
          </div>
        </header>

        <div className="app-body">
          <UnscheduledPanel nestings={containers['unscheduled'] ?? []} />
          <div className="week-grid">
            {giorni.map((data, gi) => (
              <div key={gi} className={`day-col${gi === 5 ? ' day-col--sab' : ''}`}>
                <div className="day-header">
                  <span className="day-name">{GIORNI[gi]}</span>
                  <span className="day-date">{fmtDate(data)}</span>
                </div>
                <div className="day-machines">
                  {macchineSelezionate.map(maCod => {
                    const key = slotKey(maCod, data);
                    return (
                      <MachineColumn key={key} id={key} maCod={maCod}
                        nestings={containers[key] ?? []}
                        secondiDisponibili={capacita[key] ?? 0}
                        onRemove={async idNes => { await rimuoviPiano(idNes); await caricaDati(); }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeNesting && <NestingCard nesting={activeNesting} isOverlay />}
      </DragOverlay>
    </DndContext>
  );
}
