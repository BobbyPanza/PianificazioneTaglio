-- ============================================================
--  PianificazioneTaglio -- Script di installazione completo
--  Eseguire su Factory_ADQ (o sul database target) con utente
--  che abbia permessi CREATE TABLE / CREATE FUNCTION.
-- ============================================================

PRINT '=== Inizio installazione PianificazioneTaglio ===';
GO

-- ────────────────────────────────────────────────────────────
--  1. Tabella PIANO_NESTING
-- ────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'PIANO_NESTING'
)
BEGIN
    CREATE TABLE PIANO_NESTING (
        IDPIANO  INT IDENTITY(1,1) PRIMARY KEY,
        IDNES    INT          NOT NULL,   -- FK logica verso A_NES.IDNES
        MACOD    VARCHAR(20)  NOT NULL,   -- Codice macchina
        DATPIANO DATE         NOT NULL,   -- Giorno pianificato
        SEQORD   INT          NOT NULL DEFAULT 0,
        DTINS    DATETIME     NOT NULL DEFAULT GETDATE(),
        DTMOD    DATETIME     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_PIANO_NESTING_IDNES UNIQUE (IDNES)
    );

    CREATE INDEX IX_PIANO_NESTING_DATA ON PIANO_NESTING (DATPIANO, MACOD);

    PRINT 'Tabella PIANO_NESTING creata.';
END
ELSE
    PRINT 'Tabella PIANO_NESTING gia'' esistente -- saltata.';
GO

-- ────────────────────────────────────────────────────────────
--  2. Funzione xComputeTempoResiduo  (personalizzata)
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
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'dbo.xComputeTempoResiduo')
      AND type IN (N'FN', N'IF', N'TF')
)
BEGIN
    EXEC sp_executesql N'
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
    DECLARE @Secondi INT;

    SELECT @Secondi = ISNULL(SUM(e.NMRIP * e.LTIME), 0)
    FROM L_NELM e
    WHERE e.IDNES = @IdNes;

    RETURN @Secondi;
END
';
    PRINT 'Funzione dbo.xComputeTempoResiduo creata.';
END
ELSE
    PRINT 'Funzione dbo.xComputeTempoResiduo gia'' esistente -- saltata.';
GO

-- ────────────────────────────────────────────────────────────
--  NOTA: dbo.ComputeCalendarTime è una funzione standard di
--  Factory ADQ e non va creata né modificata qui.
--  Configurare in appsettings.json:
--      "CapacitaFunzione": "dbo.ComputeCalendarTime"
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
--  3. Verifica finale
-- ────────────────────────────────────────────────────────────
SELECT Oggetto, Stato FROM (
    SELECT 1 AS Ord, 'PIANO_NESTING' AS Oggetto,
        CASE WHEN EXISTS (SELECT 1 FROM sys.tables WHERE name='PIANO_NESTING')
             THEN 'OK' ELSE 'MANCANTE' END AS Stato
    UNION ALL
    SELECT 2, 'dbo.xComputeTempoResiduo',
        CASE WHEN OBJECT_ID('dbo.xComputeTempoResiduo') IS NOT NULL
             THEN 'OK' ELSE 'MANCANTE' END
    UNION ALL
    SELECT 3, 'dbo.ComputeCalendarTime (Factory ADQ standard)',
        CASE WHEN OBJECT_ID('dbo.ComputeCalendarTime') IS NOT NULL
             THEN 'OK' ELSE 'MANCANTE - installare Factory ADQ' END
) x ORDER BY Ord;

PRINT '=== Installazione completata ===';
GO
