namespace PianificazioneTaglio.Models;

public class NestingDto
{
    public int IdNes { get; set; }
    public string NsCod { get; set; } = "";
    public string NsDsc { get; set; } = "";
    public string TfCod { get; set; } = "";
    public string MaCod { get; set; } = "";
    public int StNes { get; set; }
    public DateTime? DtExp { get; set; }

    // Calcolati
    public int NumParti { get; set; }
    public string Materiale { get; set; } = "";
    public int NumLamiere { get; set; }
    public int TempoTotaleSec { get; set; }
    public string Commesse { get; set; } = "";
    public string Riferimenti { get; set; } = "";
    public string Clienti { get; set; } = "";
    public DateTime? PrimaScadenza { get; set; }

    // Piano
    public int? IdPiano { get; set; }
    public DateTime? DataPiano { get; set; }
    public int SeqOrd { get; set; }
}

public class TipoFaseDto
{
    public string TfCod { get; set; } = "";
    public string TfDsc { get; set; } = "";
}
