-- ============================================================
-- Setup PianificazioneTaglio su Factory
-- Eseguire una volta sola prima di avviare l'applicazione.
-- Rieseguibile: tutti i blocchi sono idempotenti.
-- ============================================================

-- ── 1. Colonna XSEQPIANO su A_NES ─────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('A_NES') AND name = 'XSEQPIANO'
)
BEGIN
    ALTER TABLE A_NES ADD XSEQPIANO INT NULL;
    PRINT 'Colonna A_NES.XSEQPIANO aggiunta.';
END
ELSE
    PRINT 'Colonna A_NES.XSEQPIANO già presente.';
GO

-- ── 2. Indice per query piano settimanale ─────────────────
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
    PRINT 'Indice IX_A_NES_PIANO già presente.';
GO

-- ── 3. Funzione tempo residuo nesting ─────────────────────
-- Stub di default: somma NMRIP * LTIME da L_NELM.
-- Personalizzare la logica in base alle esigenze
-- (es. sottrarre il tempo già lavorato, ecc.)
IF OBJECT_ID('dbo.xComputeTempoResiduo', 'FN') IS NOT NULL
    DROP FUNCTION dbo.xComputeTempoResiduo;
GO
CREATE FUNCTION dbo.xComputeTempoResiduo(@IdNes INT)
RETURNS INT
AS
BEGIN
    RETURN ISNULL(
        (SELECT SUM(e.NMRIP * e.LTIME) FROM L_NELM e WHERE e.IDNES = @IdNes),
        0
    );
END
GO
PRINT 'Funzione dbo.xComputeTempoResiduo creata/aggiornata.';
GO
