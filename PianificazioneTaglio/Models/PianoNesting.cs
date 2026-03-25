namespace PianificazioneTaglio.Models;

public class PianoNesting
{
    public int IdPiano { get; set; }
    public int IdNes { get; set; }
    public string MaCod { get; set; } = "";
    public DateTime DataPiano { get; set; }
    public int SeqOrd { get; set; }
    public DateTime DtIns { get; set; }
    public DateTime DtMod { get; set; }
}

public class SalvaPianoRequest
{
    public int IdNes { get; set; }
    public string MaCod { get; set; } = "";
    public DateTime DataPiano { get; set; }
    public int SeqOrd { get; set; }
}

public class RimuoviPianoRequest
{
    public int IdNes { get; set; }
}

public class RiordinaRequest
{
    public string MaCod { get; set; } = "";
    public DateTime DataPiano { get; set; }
    public List<int> IdNesOrdinati { get; set; } = new();
}
