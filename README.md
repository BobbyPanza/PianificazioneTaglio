# Pianificazione Taglio Laser

Ciao Scalzo! Segui questi 5 passi e sei operativo.

---

## 1. Installa il .NET Hosting Bundle

L'ho già messo assieme nella cartella condivisa. Installalo sul server e riavvia IIS dopo.

---

## 2. Copia i file su IIS

Prendi lo zip dalla [pagina Release](../../releases/latest), estrailo e puntaci un sito IIS sopra.

---

## 3. Application Pool

Sull'application pool collegato al sito metti:
- **Versione .NET CLR → Nessun codice gestito**

---

## 4. Esegui gli script SQL

Nella cartella `Scripts\` trovi `Install_PianificazioneTaglio.sql`.
Aprilo in SSMS, seleziona il database giusto (**Factory**) e fallo girare.
Alla fine ti mostra una tabellina con tutti OK se è andato bene.

---

## 5. Configura appsettings.json

Nella cartella del sito trovi `appsettings.template.json` — copialo come `appsettings.json` e modifica:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=NOMESERVER;Database=Factory;User=sa;Password=...;TrustServerCertificate=True;"
  },
  "PianificazioneTipiFase": [ "42", "68", "69" ]
}
```

- **DefaultConnection** → stringa di connessione al tuo Factory
- **PianificazioneTipiFase** → i codici TFCOD che vuoi far comparire nel selettore (chiedi a Russo se non li sai)

---

Riavvia l'application pool e dovresti essere a posto. In bocca al lupo!
