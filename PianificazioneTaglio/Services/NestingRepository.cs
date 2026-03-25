using Dapper;
using Microsoft.Data.SqlClient;
using PianificazioneTaglio.Models;

namespace PianificazioneTaglio.Services;

public class NestingRepository(IConfiguration config)
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection"));

    private string SubTempoResiduo =>
        $"ISNULL({config["TempoResiduoFunzione"] ?? "dbo.ComputeTempoResiduo"}(n.IDNES), 0) AS TempoTotaleSec";

    // Subquery prima scadenza
    private const string SubPrimaScadenza = @"
        (SELECT MIN(cmpa.CMDTS)
         FROM L_PCPA t1x
         INNER JOIN A_LAV t2x ON t1x.CONUM = t2x.CONUM AND t1x.LOCOD = t2x.LOCOD AND t1x.IDFAS = t2x.IDFAS
         INNER JOIN A_LOT t3x ON t3x.CONUM = t2x.CONUM AND t3x.LOCOD = t2x.LOCOD
         INNER JOIN A_LOT lcx ON lcx.CONUM = t3x.CONUM
             AND t3x.LOCOD = CASE WHEN ISNULL(t3x.LOCLM,0)=0 THEN lcx.LOCLC ELSE lcx.LOCOD END
         INNER JOIN L_CMPA cmpa ON cmpa.CONUM = lcx.CONUM AND cmpa.LOCOD = lcx.LOCLM
         WHERE t1x.IDPTC = n.IDNES) AS PrimaScadenza";

    // Subquery riutilizzabili per commesse/riferimenti/clienti
    private const string SubCommesse = @"
        ISNULL((
            SELECT STUFF((
                SELECT DISTINCT ', ' + com2.COCOD
                FROM L_PCPA t1x
                INNER JOIN A_LAV t2x ON t1x.CONUM = t2x.CONUM AND t1x.LOCOD = t2x.LOCOD AND t1x.IDFAS = t2x.IDFAS
                INNER JOIN A_LOT t3x ON t3x.CONUM = t2x.CONUM AND t3x.LOCOD = t2x.LOCOD
                INNER JOIN A_LOT lcx ON lcx.CONUM = t3x.CONUM
                    AND t3x.LOCOD = CASE WHEN ISNULL(t3x.LOCLM,0)=0 THEN lcx.LOCLC ELSE lcx.LOCOD END
                INNER JOIN L_CMPA cx ON cx.CONUM = lcx.CONUM AND cx.LOCOD = lcx.LOCLM
                INNER JOIN A_COM com2 ON com2.CONUM = t1x.CONUM
                WHERE t1x.IDPTC = n.IDNES AND com2.COCOD IS NOT NULL
                FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '')
        ), '') AS Commesse";

    private const string SubRiferimenti = @"
        ISNULL((
            SELECT STUFF((
                SELECT DISTINCT ', ' + com2.CORIF
                FROM L_PCPA t1x
                INNER JOIN A_LAV t2x ON t1x.CONUM = t2x.CONUM AND t1x.LOCOD = t2x.LOCOD AND t1x.IDFAS = t2x.IDFAS
                INNER JOIN A_LOT t3x ON t3x.CONUM = t2x.CONUM AND t3x.LOCOD = t2x.LOCOD
                INNER JOIN A_LOT lcx ON lcx.CONUM = t3x.CONUM
                    AND t3x.LOCOD = CASE WHEN ISNULL(t3x.LOCLM,0)=0 THEN lcx.LOCLC ELSE lcx.LOCOD END
                INNER JOIN L_CMPA cx ON cx.CONUM = lcx.CONUM AND cx.LOCOD = lcx.LOCLM
                INNER JOIN A_COM com2 ON com2.CONUM = t1x.CONUM
                WHERE t1x.IDPTC = n.IDNES AND com2.CORIF IS NOT NULL AND com2.CORIF <> ''
                FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '')
        ), '') AS Riferimenti";

    private const string SubClienti = @"
        ISNULL((
            SELECT STUFF((
                SELECT DISTINCT ', ' + com2.CTDSC
                FROM L_PCPA t1x
                INNER JOIN A_LAV t2x ON t1x.CONUM = t2x.CONUM AND t1x.LOCOD = t2x.LOCOD AND t1x.IDFAS = t2x.IDFAS
                INNER JOIN A_LOT t3x ON t3x.CONUM = t2x.CONUM AND t3x.LOCOD = t2x.LOCOD
                INNER JOIN A_LOT lcx ON lcx.CONUM = t3x.CONUM
                    AND t3x.LOCOD = CASE WHEN ISNULL(t3x.LOCLM,0)=0 THEN lcx.LOCLC ELSE lcx.LOCOD END
                INNER JOIN L_CMPA cx ON cx.CONUM = lcx.CONUM AND cx.LOCOD = lcx.LOCLM
                INNER JOIN A_COM com2 ON com2.CONUM = t1x.CONUM
                WHERE t1x.IDPTC = n.IDNES AND com2.CTDSC IS NOT NULL AND com2.CTDSC <> ''
                FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '')
        ), '') AS Clienti";

    // ── Tipi fase disponibili ─────────────────────────────────────────────────
    public async Task<IEnumerable<TipoFaseDto>> GetTipiFaseAsync()
    {
        using var conn = CreateConnection();
        var codiciAbilitati = config.GetSection("PianificazioneTipiFase").Get<string[]>() ?? [];
        if (codiciAbilitati.Length > 0)
        {
            return await conn.QueryAsync<TipoFaseDto>(@"
                SELECT TFCOD AS TfCod, TFDSC AS TfDsc
                FROM A_TFA WHERE TFCOD IN @Codici
                ORDER BY TFORD, TFDSC",
                new { Codici = codiciAbilitati });
        }
        return await conn.QueryAsync<TipoFaseDto>(@"
            SELECT TFCOD AS TfCod, TFDSC AS TfDsc
            FROM A_TFA WHERE TFVIS = 'Y'
            ORDER BY TFORD, TFDSC");
    }

    // ── Macchine abilitate per tipo fase ─────────────────────────────────────
    public async Task<IEnumerable<string>> GetMacchineAsync(string tfCod)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<string>(@"
            SELECT DISTINCT MACOD FROM L_MATF
            WHERE TFCOD = @TfCod AND MACOD IS NOT NULL AND MACOD <> ''
            ORDER BY MACOD",
            new { TfCod = tfCod });
    }

    // ── Nesting non pianificati ───────────────────────────────────────────────
    public async Task<IEnumerable<NestingDto>> GetNestingNonPianificatiAsync(string tfCod)
    {
        using var conn = CreateConnection();
        var sql = $@"
            SELECT
                n.IDNES            AS IdNes,
                n.NSCOD            AS NsCod,
                ISNULL(n.NSDSC,'') AS NsDsc,
                n.TFCOD            AS TfCod,
                n.MACOD            AS MaCod,
                n.STNES            AS StNes,
                n.DTEXP            AS DtExp,
                ISNULL((SELECT COUNT(*) FROM L_PCPA p WHERE p.IDPTC = n.IDNES), 0) AS NumParti,
                ISNULL((SELECT COUNT(*) FROM L_PCFO f WHERE f.IDPTC = n.IDNES), 0) AS NumLamiere,
                ISNULL((
                    SELECT STUFF((
                        SELECT DISTINCT ', ' + f2.MTCOD FROM L_PCFO f2
                        WHERE f2.IDPTC = n.IDNES AND f2.MTCOD IS NOT NULL
                        FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '')
                ), '') AS Materiale,
                {SubTempoResiduo},
                NULL AS IdPiano,
                NULL AS DataPiano,
                0    AS SeqOrd,
                {SubCommesse},
                {SubRiferimenti},
                {SubClienti},
                {SubPrimaScadenza}
            FROM A_NES n
            WHERE n.STNES IN (3, 4)
              AND n.TFCOD = @TfCod
              AND n.XSEQPIANO IS NULL
            ORDER BY PrimaScadenza ASC, n.NSDSC, n.NSCOD";
        return await conn.QueryAsync<NestingDto>(sql, new { TfCod = tfCod });
    }

    // ── Nesting pianificati per settimana ─────────────────────────────────────
    public async Task<IEnumerable<NestingDto>> GetNestingPianificatiAsync(DateTime dal, DateTime al, string tfCod)
    {
        using var conn = CreateConnection();
        var sql = $@"
            SELECT
                n.IDNES            AS IdNes,
                n.NSCOD            AS NsCod,
                ISNULL(n.NSDSC,'') AS NsDsc,
                n.TFCOD            AS TfCod,
                pn.MACOD           AS MaCod,
                n.STNES            AS StNes,
                n.DTEXP            AS DtExp,
                ISNULL((SELECT COUNT(*) FROM L_PCPA p WHERE p.IDPTC = n.IDNES), 0) AS NumParti,
                ISNULL((SELECT COUNT(*) FROM L_PCFO f WHERE f.IDPTC = n.IDNES), 0) AS NumLamiere,
                ISNULL((
                    SELECT STUFF((
                        SELECT DISTINCT ', ' + f2.MTCOD FROM L_PCFO f2
                        WHERE f2.IDPTC = n.IDNES AND f2.MTCOD IS NOT NULL
                        FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '')
                ), '') AS Materiale,
                {SubTempoResiduo},
                NULL           AS IdPiano,
                n.DTEXP        AS DataPiano,
                n.XSEQPIANO    AS SeqOrd,
                {SubCommesse},
                {SubRiferimenti},
                {SubClienti},
                {SubPrimaScadenza}
            FROM A_NES n
            WHERE n.TFCOD = @TfCod
              AND n.DTEXP >= @Dal AND n.DTEXP <= @Al
              AND n.XSEQPIANO IS NOT NULL
            ORDER BY n.DTEXP, n.MACOD, n.XSEQPIANO";
        return await conn.QueryAsync<NestingDto>(sql, new { Dal = dal.Date, Al = al.Date, TfCod = tfCod });
    }

    // ── Capacità giornaliera per macchina ─────────────────────────────────────
    public async Task<IEnumerable<CapacitaDto>> GetCapacitaAsync(IEnumerable<string> macchine, DateTime dal, DateTime al)
    {
        using var conn = CreateConnection();

        // Costruisco le date della settimana come righe inline
        var giorni = new List<DateTime>();
        for (var d = dal.Date; d <= al.Date; d = d.AddDays(1))
            giorni.Add(d);

        var giorni_params = string.Join(",\n", giorni.Select((g, i) => $"(@G{i})"));
        var paramObj = new DynamicParameters();
        for (int i = 0; i < giorni.Count; i++)
            paramObj.Add($"G{i}", giorni[i]);
        paramObj.Add("Macchine", macchine.ToList());

        var fnCapacita = config["CapacitaFunzione"] ?? "dbo.ComputeCalendarTime";
        var sql = $@"
            SELECT
                m.MACOD                                         AS MaCod,
                d.Giorno                                        AS Giorno,
                ISNULL({fnCapacita}(m.IDNUM, d.Giorno), 0) AS SecondiDisponibili
            FROM A_MAC m
            CROSS JOIN (VALUES {giorni_params}) AS d(Giorno)
            WHERE m.MACOD IN @Macchine
              AND m.IDNUM IS NOT NULL";

        return await conn.QueryAsync<CapacitaDto>(sql, paramObj);
    }

    // ── Parti di un nesting ───────────────────────────────────────────────────
    public async Task<IEnumerable<ParteNestingDto>> GetPartiNestingAsync(int idNes)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<ParteNestingDto>(@"
            SELECT DISTINCT
                t3.PACOD             AS PaCod,
                cmpa.CMDTS           AS CmDts,
                com.COCOD            AS CoCod,
                ISNULL(com.CORIF,'') AS CoRif,
                ISNULL(com.CTDSC,'') AS CtDsc
            FROM L_PCPA t1
            INNER JOIN A_LAV t2  ON t1.CONUM = t2.CONUM AND t1.LOCOD = t2.LOCOD AND t1.IDFAS = t2.IDFAS
            INNER JOIN A_LOT t3  ON t3.CONUM = t2.CONUM AND t3.LOCOD = t2.LOCOD
            INNER JOIN A_LOT lc  ON lc.CONUM = t3.CONUM
                AND t3.LOCOD = CASE WHEN ISNULL(t3.LOCLM,0)=0 THEN lc.LOCLC ELSE lc.LOCOD END
            INNER JOIN L_CMPA cmpa ON cmpa.CONUM = lc.CONUM AND cmpa.LOCOD = lc.LOCLM
            INNER JOIN A_COM com  ON com.CONUM = t1.CONUM
            WHERE t1.IDPTC = @IdNes
            ORDER BY cmpa.CMDTS, t3.PACOD",
            new { IdNes = idNes });
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    private async Task LogAsync(SqlConnection conn, string azione, int idNes,
        string? macod, DateTime? dataPiano, int? seqPiano)
    {
        await conn.ExecuteAsync(@"
            INSERT INTO XPIANO_LOG (IDNES, AZIONE, MACOD, DATPIANO, SEQPIANO, DTLOG)
            VALUES (@IdNes, @Azione, @Macod, @DataPiano, @SeqPiano, GETDATE())",
            new { IdNes = idNes, Azione = azione, Macod = macod,
                  DataPiano = dataPiano, SeqPiano = seqPiano });
    }

    // ── Salva / sposta ────────────────────────────────────────────────────────
    public async Task SalvaPianoAsync(SalvaPianoRequest req)
    {
        using var conn = CreateConnection();
        // Determina se è un nuovo inserimento o uno spostamento
        var vecchio = await conn.QueryFirstOrDefaultAsync<(string? Macod, DateTime? Dtexp)>(
            "SELECT MACOD, DTEXP FROM A_NES WHERE IDNES = @IdNes", new { req.IdNes });
        var azione = vecchio.Dtexp == null ? "PIANIFICATO" : "SPOSTATO";

        await conn.ExecuteAsync(
            "UPDATE A_NES SET MACOD = @MaCod, DTEXP = @DataPiano, XSEQPIANO = @SeqOrd WHERE IDNES = @IdNes",
            new { req.MaCod, DataPiano = req.DataPiano.Date, req.SeqOrd, req.IdNes });

        await LogAsync(conn, azione, req.IdNes, req.MaCod, req.DataPiano.Date, req.SeqOrd);
    }

    // ── Rimuovi dal piano ─────────────────────────────────────────────────────
    public async Task RimuoviPianoAsync(int idNes)
    {
        using var conn = CreateConnection();
        await conn.ExecuteAsync(
            "UPDATE A_NES SET DTEXP = NULL, XSEQPIANO = NULL WHERE IDNES = @IdNes",
            new { IdNes = idNes });

        await LogAsync(conn, "RIMOSSO", idNes, null, null, null);
    }

    // ── Riordina sequenza ─────────────────────────────────────────────────────
    public async Task RiordinaAsync(RiordinaRequest req)
    {
        using var conn = CreateConnection();
        for (int i = 0; i < req.IdNesOrdinati.Count; i++)
        {
            var seq = i + 1;
            await conn.ExecuteAsync(
                "UPDATE A_NES SET XSEQPIANO = @Seq WHERE IDNES = @IdNes",
                new { Seq = seq, IdNes = req.IdNesOrdinati[i] });

            await LogAsync(conn, "RIORDINATO", req.IdNesOrdinati[i],
                req.MaCod, req.DataPiano.Date, seq);
        }
    }
}
