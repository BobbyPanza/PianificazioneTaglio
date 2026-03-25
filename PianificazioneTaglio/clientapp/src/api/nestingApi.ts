import type { CapacitaDto, NestingDto, ParteNestingDto, TipoFaseDto } from '../types';

const BASE = `${import.meta.env.BASE_URL}api/nesting`;

export async function getTipiFase(): Promise<TipoFaseDto[]> {
  const r = await fetch(`${BASE}/tipifase`);
  return r.json();
}

export async function getMacchine(tfCod: string): Promise<string[]> {
  const r = await fetch(`${BASE}/macchine?tfCod=${encodeURIComponent(tfCod)}`);
  return r.json();
}

export async function getNonPianificati(tfCod: string): Promise<NestingDto[]> {
  const r = await fetch(`${BASE}/nonpianificati?tfCod=${encodeURIComponent(tfCod)}`);
  return r.json();
}

function fmtISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

export async function getPianificati(dal: Date, al: Date, tfCod: string): Promise<NestingDto[]> {
  const r = await fetch(`${BASE}/pianificati?dal=${fmtISO(dal)}&al=${fmtISO(al)}&tfCod=${encodeURIComponent(tfCod)}`);
  return r.json();
}

export async function getParti(idNes: number): Promise<ParteNestingDto[]> {
  const r = await fetch(`${BASE}/${idNes}/parti`);
  return r.json();
}

export async function salvaPiano(idNes: number, maCod: string, dataPiano: Date, seqOrd: number): Promise<void> {
  await fetch(`${BASE}/salva`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idNes, maCod, dataPiano: fmtISO(dataPiano), seqOrd }),
  });
}

export async function rimuoviPiano(idNes: number): Promise<void> {
  await fetch(`${BASE}/rimuovi/${idNes}`, { method: 'DELETE' });
}

export async function getCapacita(macchine: string[], dal: Date, al: Date): Promise<CapacitaDto[]> {
  const m = macchine.map(encodeURIComponent).join(',');
  const r = await fetch(`${BASE}/capacita?macchine=${m}&dal=${fmtISO(dal)}&al=${fmtISO(al)}`);
  return r.json();
}

export async function riordina(maCod: string, dataPiano: Date, idNesOrdinati: number[]): Promise<void> {
  await fetch(`${BASE}/riordina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maCod, dataPiano: fmtISO(dataPiano), idNesOrdinati }),
  });
}
