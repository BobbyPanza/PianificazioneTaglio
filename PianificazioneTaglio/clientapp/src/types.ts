export interface TipoFaseDto {
  tfCod: string;
  tfDsc: string;
}

export interface NestingDto {
  idNes: number;
  nsCod: string;
  nsDsc: string;
  tfCod: string;
  maCod: string;
  stNes: number;
  dtExp: string | null;
  numParti: number;
  materiale: string;
  numLamiere: number;
  tempoTotaleSec: number;
  commesse: string;
  riferimenti: string;
  clienti: string;
  primaScadenza: string | null;
  idPiano: number | null;
  dataPiano: string | null;
  seqOrd: number;
}

export const STNES_LABEL: Record<number, string> = {
  3: 'Incompleto',
  4: 'Confermato',
  5: 'Terminato',
  6: 'Sfridi dichiarati',
};

export interface CapacitaDto {
  maCod: string;
  giorno: string;
  secondiDisponibili: number;
}

export interface ParteNestingDto {
  paCod: string;
  cmDts: string | null;
  coCod: string;
  coRif: string;
  ctDsc: string;
}

export function formatDurata(sec: number): string {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
