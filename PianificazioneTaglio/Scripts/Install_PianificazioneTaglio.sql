-- ============================================================
--  PianificazioneTaglio -- Script di installazione completo
--  Eseguire su Factory (o sul database target) con utente
--  che abbia permessi ALTER TABLE / CREATE FUNCTION.
--  Idempotente: rieseguibile senza danni.
-- ============================================================

PRINT '=== Inizio installazione PianificazioneTaglio ===';
GO

-- ────────────────────────────────────────────────────────────
--  1. Colonna XSEQPIANO su A_NES
--
--  Progressivo di sequenza giornaliero assegnato dal pianificatore.
--  NULL = nesting non ancora pianificato.
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('A_NES') AND name = 'XSEQPIANO'
)
BEGIN
    ALTER TABLE A_NES ADD XSEQPIANO INT NULL;
    PRINT 'Colonna A_NES.XSEQPIANO aggiunta.';
END
ELSE
    PRINT 'Colonna A_NES.XSEQPIANO gia'' presente -- saltata.';
GO

-- ────────────────────────────────────────────────────────────
--  2. Indice per query piano settimanale
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('A_NES') AND name = 'IX_A_NES_PIANO'
)
BEGIN
    CREATE INDEX IX_A_NES_PIANO ON A_NES (DTEXP, MACOD)
    WHERE XSEQPIANO IS NOT NULL;
    PRINT 'Indice IX_A_NES_PIANO creato.';
END
ELSE
    PRINT 'Indice IX_A_NES_PIANO gia'' presente -- saltato.';
GO

-- ────────────────────────────────────────────────────────────
--  3. Funzione xComputeTempoResiduo  (personalizzabile)
--
--  Firma attesa:
--      dbo.xComputeTempoResiduo(@IdNes INT)
--      RETURNS INT  -- secondi di taglio residui per il nesting
--
--  Configurazione in appsettings.json:
--      "TempoResiduoFunzione": "dbo.xComputeTempoResiduo"
--
--  L'implementazione di DEFAULT calcola SUM(NMRIP * LTIME)
--  su L_NELM (= tempo totale senza sottrarre l'eseguito).
--  Personalizzare per tenere conto delle operazioni già tagliate,
--  tabelle di consuntivo, ecc.
-- ────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.xComputeTempoResiduo', 'FN') IS NOT NULL
    DROP FUNCTION dbo.xComputeTempoResiduo;
GO
CREATE FUNCTION dbo.xComputeTempoResiduo
(
    @IdNes INT   -- A_NES.IDNES
)
RETURNS INT
AS
BEGIN
    -- ── IMPLEMENTAZIONE DI DEFAULT ──────────────────────────
    -- Restituisce il tempo totale come SUM(NMRIP * LTIME).
    -- Sostituire con logica di consuntivo per il tempo RESIDUO.
    RETURN ISNULL(
        (SELECT SUM(e.NMRIP * e.LTIME) FROM L_NELM e WHERE e.IDNES = @IdNes),
        0
    );
END
GO
PRINT 'Funzione dbo.xComputeTempoResiduo creata/aggiornata.';
GO

-- ────────────────────────────────────────────────────────────
--  NOTA: dbo.ComputeCalendarTime è una funzione standard di
--  Factory e non va creata né modificata qui.
--  Configurare in appsettings.json:
--      "CapacitaFunzione": "dbo.ComputeCalendarTime"
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
--  4. Verifica finale
-- ────────────────────────────────────────────────────────────
SELECT Oggetto, Stato FROM (
    SELECT 1 AS Ord, 'A_NES.XSEQPIANO' AS Oggetto,
        CASE WHEN EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('A_NES') AND name = 'XSEQPIANO')
             THEN 'OK' ELSE 'MANCANTE' END AS Stato
    UNION ALL
    SELECT 2, 'dbo.xComputeTempoResiduo',
        CASE WHEN OBJECT_ID('dbo.xComputeTempoResiduo') IS NOT NULL
             THEN 'OK' ELSE 'MANCANTE' END
    UNION ALL
    SELECT 3, 'dbo.ComputeCalendarTime (Factory standard)',
        CASE WHEN OBJECT_ID('dbo.ComputeCalendarTime') IS NOT NULL
             THEN 'OK' ELSE 'MANCANTE - verificare installazione Factory' END
) x ORDER BY Ord;

PRINT '=== Installazione completata ===';
GO
