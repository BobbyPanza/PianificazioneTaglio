# Pianificazione Taglio Laser — Guida all'installazione

## Prerequisiti sul server

| Componente | Note |
|---|---|
| Windows Server + IIS | Con ruolo Web Server attivo |
| **.NET 10 Hosting Bundle** | Scaricabile da microsoft.com/dotnet — include runtime + modulo IIS |
| SQL Server | Accesso al database `Factory` |

Node.js e npm **non servono** sul server — React è già compilato nei file statici.

---

## 1. Preparazione database

Eseguire lo script su `Factory` in SSMS (o sqlcmd):

```
Scripts\CreatePianoNesting.sql
```

Lo script è idempotente (rieseguibile senza danni). Crea/aggiorna:
- Colonna `A_NES.XSEQPIANO INT NULL` — progressivo di sequenza nel piano giornaliero
- Indice `IX_A_NES_PIANO` su `A_NES(DTEXP, MACOD)` — per le query del piano settimanale
- Funzione `dbo.xComputeTempoResiduo(@IdNes)` — calcola i secondi di taglio residui del nesting (stub, personalizzabile)

---

## 2. Configurazione appsettings.json

Il file si trova nella cartella pubblicata. Modificarlo **prima** di avviare.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=NOMESERVER;Database=Factory;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "PianificazioneTipiFase": [ "42", "68", "69" ],
  "CapacitaFunzione": "dbo.ComputeCalendarTime",
  "TempoResiduoFunzione": "dbo.xComputeTempoResiduo"
}
```

### Parametri

| Parametro | Descrizione |
|---|---|
| `ConnectionStrings.DefaultConnection` | Stringa di connessione a Factory. Con `Trusted_Connection=True` usa l'identità dell'Application Pool IIS. |
| `PianificazioneTipiFase` | Array di `TFCOD` da mostrare nel selettore tipo fase. Se vuoto `[]`, mostra tutti i tipi con `TFVIS='Y'` in `A_TFA`. |
| `CapacitaFunzione` | Funzione SQL che riceve `(IDNUM, data)` e restituisce i secondi lavorativi disponibili per quella macchina in quel giorno. Default: `dbo.ComputeCalendarTime` (già presente in Factory). |
| `TempoResiduoFunzione` | Funzione SQL che riceve `(IDNES)` e restituisce i secondi di taglio residui del nesting. Default: `dbo.xComputeTempoResiduo` (creata dallo script, personalizzabile). |

---

## 3. Pubblicazione

Dalla cartella del **progetto** (non della solution):

```powershell
cd "C:\devtrd\Pianificazione Taglio\PianificazioneTaglio"

# Se si cambia il percorso IIS (es. /PT), aggiungere --base al build frontend:
cd clientapp
npm run build -- --base=/PT/
cd ..

dotnet publish -c Release -o "C:\intesi\WS\PianificazioneTaglio"
```

Se il sito IIS è alla radice (`/`), il `--base` non serve e il build standard funziona:
```powershell
cd clientapp && npm run build && cd ..
dotnet publish -c Release -o "C:\intesi\WS\PianificazioneTaglio"
```

---

## 4. Configurazione IIS

1. **Crea Application Pool**
   - Nome: `PianificazioneTaglio`
   - Versione .NET CLR: **Nessun codice gestito**
   - Identità: account con accesso in lettura/scrittura al DB (o `ApplicationPoolIdentity` se si usa Windows Auth sul DB)

2. **Crea Sito / Applicazione**
   - Percorso fisico: `C:\intesi\WS\PianificazioneTaglio`
   - Application Pool: quello creato sopra
   - Binding: porta e hostname desiderati

3. **Riavvia IIS** dopo ogni aggiornamento dei file.

---

## 5. Aggiornamento applicazione

```powershell
# 1. Rebuilda frontend (solo se ci sono modifiche React)
cd "C:\devtrd\Pianificazione Taglio\PianificazioneTaglio\clientapp"
npm run build -- --base=/PT/    # adatta il --base al tuo percorso IIS

# 2. Pubblica
cd ..
dotnet publish -c Release -o "C:\intesi\WS\PianificazioneTaglio"

# 3. Riavvia l'application pool IIS
Import-Module WebAdministration
Restart-WebItem 'IIS:\AppPools\PianificazioneTaglio'
```

---

## Struttura dati rilevante

| Tabella/Campo | Uso |
|---|---|
| `A_NES.DTEXP` | Data taglio previsto (scritta dal pianificatore) |
| `A_NES.MACOD` | Macchina assegnata (scritta dal pianificatore) |
| `A_NES.XSEQPIANO` | Progressivo sequenza giornaliera (NULL = non pianificato) |
| `A_NES.STNES` | Stato nesting: 3=Incompleto, 4=Confermato, 5=Terminato (verde) |
| `A_MAC.IDNUM` | ID calendario macchina, usato da `CapacitaFunzione` |
| `L_MATF` | Associazione macchina ↔ tipo fase |
