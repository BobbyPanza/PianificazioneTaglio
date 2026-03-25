# Pianificazione Taglio Laser

## Prerequisiti
- .NET 10 SDK
- Node.js 20+
- SQL Server con database `Factory`

## 1. Crea la tabella di pianificazione
Eseguire su `Factory`:
```
Scripts/CreatePianoNesting.sql
```

## 2. Connection string
Editare `PianificazioneTaglio/appsettings.json`:
```json
"DefaultConnection": "Server=localhost;Database=Factory;Trusted_Connection=True;TrustServerCertificate=True;"
```

## 3. Build del frontend (una tantum, poi ad ogni modifica)
```cmd
cd PianificazioneTaglio\clientapp
npm install
npm run build
```
I file finiscono in `PianificazioneTaglio/wwwroot/`.

## 4. Avvio sviluppo
```cmd
cd PianificazioneTaglio
dotnet run
```
Aprire `http://localhost:5000`

In alternativa avviare il frontend con hot-reload:
```cmd
cd PianificazioneTaglio\clientapp
npm run dev        ← porta 5173, proxy API su localhost:5000
```

## 5. Deploy su IIS

### Build pubblicazione
```cmd
cd PianificazioneTaglio\clientapp
npm run build

cd ..
dotnet publish -c Release -o C:\inetpub\PianificazioneTaglio
```

### Configurazione IIS
1. Installare **ASP.NET Core Hosting Bundle** (se non già presente)
2. Creare sito IIS che punta a `C:\inetpub\PianificazioneTaglio`
3. Application Pool → **No Managed Code**
4. Assegnare la porta desiderata nei binding

## Struttura DB aggiunta
```
PIANO_NESTING
  IDPIANO  int PK
  IDNES    int → A_NES.IDNES
  MACOD    varchar(20)
  DATPIANO date
  SEQORD   int   (sequenza nel giorno/macchina)
  DTINS    datetime
  DTMOD    datetime
```

## Note STNES
| Valore | Significato |
|--------|-------------|
| 3 | Incompleto |
| 4 | Confermato |
| 5 | Terminato |
| 6 | Sfridi dichiarati |

Solo i nesting con STNES 3 e 4 appaiono nel pannello "Non pianificati".
