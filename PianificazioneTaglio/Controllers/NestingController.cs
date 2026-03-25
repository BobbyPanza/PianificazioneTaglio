using Microsoft.AspNetCore.Mvc;
using PianificazioneTaglio.Models;
using PianificazioneTaglio.Services;

namespace PianificazioneTaglio.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NestingController(NestingRepository repo) : ControllerBase
{
    [HttpGet("tipifase")]
    public async Task<IActionResult> GetTipiFase() =>
        Ok(await repo.GetTipiFaseAsync());

    [HttpGet("macchine")]
    public async Task<IActionResult> GetMacchine([FromQuery] string tfCod) =>
        Ok(await repo.GetMacchineAsync(tfCod));

    [HttpGet("nonpianificati")]
    public async Task<IActionResult> GetNonPianificati([FromQuery] string tfCod) =>
        Ok(await repo.GetNestingNonPianificatiAsync(tfCod));

    [HttpGet("pianificati")]
    public async Task<IActionResult> GetPianificati([FromQuery] DateTime dal, [FromQuery] DateTime al, [FromQuery] string tfCod) =>
        Ok(await repo.GetNestingPianificatiAsync(dal, al, tfCod));

    [HttpGet("{idNes:int}/parti")]
    public async Task<IActionResult> GetParti(int idNes) =>
        Ok(await repo.GetPartiNestingAsync(idNes));

    [HttpGet("capacita")]
    public async Task<IActionResult> GetCapacita([FromQuery] string macchine, [FromQuery] DateTime dal, [FromQuery] DateTime al)
    {
        var lista = macchine.Split(',', StringSplitOptions.RemoveEmptyEntries);
        return Ok(await repo.GetCapacitaAsync(lista, dal, al));
    }

    [HttpPost("salva")]
    public async Task<IActionResult> Salva([FromBody] SalvaPianoRequest req)
    {
        await repo.SalvaPianoAsync(req);
        return Ok();
    }

    [HttpDelete("rimuovi/{idNes:int}")]
    public async Task<IActionResult> Rimuovi(int idNes)
    {
        await repo.RimuoviPianoAsync(idNes);
        return Ok();
    }

    [HttpPost("riordina")]
    public async Task<IActionResult> Riordina([FromBody] RiordinaRequest req)
    {
        await repo.RiordinaAsync(req);
        return Ok();
    }
}
