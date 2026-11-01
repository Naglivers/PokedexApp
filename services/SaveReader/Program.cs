using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using PKHeX.Core;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = SaveDecoder.MaxBytes);
builder.Logging.SetMinimumLevel(LogLevel.Warning);
var origins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:8081,http://127.0.0.1:8081").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins(origins).WithMethods("GET", "POST").WithHeaders("Content-Type")));
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    options.AddPolicy("uploads", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 12, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
var app = builder.Build();
app.UseCors();
app.UseRateLimiter();
app.MapGet("/health", () => Results.Ok(new { ok = true, engine = "PKHeX.Core", version = typeof(PKM).Assembly.GetName().Version?.ToString(), maxBytes = SaveDecoder.MaxBytes }));
var workers = new SemaphoreSlim(2);
app.MapPost("/parse", async (HttpRequest request, CancellationToken cancellation) => {
    if (request.ContentLength is < 1 or > SaveDecoder.MaxBytes) return Results.Json(new { message = "Escolha um save de até 64 MB." }, statusCode: 413);
    if (!await workers.WaitAsync(0, cancellation)) return Results.Json(new { message = "O leitor está ocupado. Tente novamente em instantes." }, statusCode: 503);
    try {
        // Never write uploads to disk or retain a save after this request.
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await request.Body.ReadAsync(chunk, cancellation)) > 0) {
            if (buffer.Length + read > SaveDecoder.MaxBytes) return Results.Json(new { message = "O save ultrapassa o limite de 64 MB." }, statusCode: 413);
            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellation);
        }
        return Results.Ok(SaveDecoder.Decode(buffer.ToArray()));
    } catch (InvalidDataException error) {
        return Results.Json(new { message = error.Message }, statusCode: 422);
    } catch (OperationCanceledException) { return Results.StatusCode(499); }
    catch { return Results.Json(new { message = "Não foi possível ler este arquivo. Use um save exportado e descriptografado de um jogo compatível com PKHeX." }, statusCode: 422); }
    finally { workers.Release(); }
}).RequireRateLimiting("uploads");
app.Run();

public static class SaveDecoder {
    public const int MaxBytes = 64 * 1024 * 1024;
    public static SaveSnapshot Decode(byte[] bytes) {
        if (bytes.Length is 0 or > MaxBytes) throw new InvalidDataException("Escolha um save de até 64 MB.");
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var save = SaveUtil.GetSaveFile(bytes.AsMemory());
        if (save is null) throw new InvalidDataException("Formato não reconhecido pelo PKHeX. Envie o save do jogo, não a ROM, um ZIP ou um save state do emulador.");
        if (!save.ChecksumsValid) throw new InvalidDataException("A verificação de integridade do save falhou. Exporte outra cópia do jogo antes de importar.");
        if (save.BoxCount > 1024 || save.BoxSlotCount > 128 || save.SlotCount > 20000) throw new InvalidDataException("Este formato excede os limites de armazenamento da box.");
        var strings = GameInfo.GetStrings("en");
        string Label(string[] list, int id) => (uint)id < list.Length ? list[id] : $"#{id}";
        var entries = new List<PokemonEntry>();
        var warnings = new List<string>();
        void ReadSlot(Func<PKM> reader, string location, int? box, int slot) {
            var pk = reader();
            if (pk.Species == 0) return;
            if (!pk.Valid || pk.Species > save.MaxSpeciesID) throw new InvalidDataException("Um Pokémon do save está corrompido ou usa um formato modificado. Nenhum dado foi importado.");
            entries.Add(new PokemonEntry(location, box, slot, pk.Species, pk.Form, pk.Nickname, pk.CurrentLevel, pk.Gender, pk.IsShiny, pk.IsEgg, pk.Nature.ToString(), pk.Ability, pk.HeldItem, pk.OriginalTrainerName,
                pk.ID32.ToString(), pk.PID.ToString("x8"), pk.EncryptionConstant.ToString("x8"), pk.Extension,
                Convert.ToBase64String(pk.Data[..pk.SIZE_STORED]),
                new(pk.IV_HP, pk.IV_ATK, pk.IV_DEF, pk.IV_SPA, pk.IV_SPD, pk.IV_SPE),
                new(pk.EV_HP, pk.EV_ATK, pk.EV_DEF, pk.EV_SPA, pk.EV_SPD, pk.EV_SPE),
                [pk.Move1, pk.Move2, pk.Move3, pk.Move4], Label(strings.specieslist, pk.Species), Label(strings.abilitylist, pk.Ability), Label(strings.itemlist, pk.HeldItem), new int[] {pk.Move1, pk.Move2, pk.Move3, pk.Move4}.Select(id => id == 0 ? "" : Label(strings.movelist, id)).ToArray()));
        }
        if (save.HasParty) for (int slot = 0; slot < Math.Clamp(save.PartyCount, 0, 6); slot++) { int index = slot; ReadSlot(() => save.GetPartySlotAtIndex(index), "party", null, slot); }
        if (save.HasBox) for (int box = 0; box < save.BoxCount; box++) for (int slot = 0; slot < save.BoxSlotCount; slot++) { int b = box, s = slot; ReadSlot(() => save.GetBoxSlotAtIndex(b, s), "box", box, slot); }
        if (!save.HasBox) warnings.Add("Este save não disponibiliza boxes convencionais; foram lidos os Pokémon da equipe disponíveis neste formato.");
        var names = Enumerable.Range(0, save.HasBox ? save.BoxCount : 0).Select(box => save is IBoxDetailNameRead named ? named.GetBoxName(box) : $"Box {box + 1}").ToArray();
        var identity = $"{save.GetType().Name}|{save.Version}|{save.Generation}|{save.OT}|{save.ID32}";
        return new(1, hash, Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(identity))), GameInfo.GetVersionName(save.Version), save.Generation, save.OT, save.HasBox ? save.BoxCount : 0, save.BoxSlotCount, names, entries, warnings);
    }
}
public record PokemonStats(int Hp, int Atk, int Def, int Spa, int Spd, int Spe);
public record PokemonEntry(string Location, int? BoxIndex, int SlotIndex, int Species, int Form, string Nickname, int Level, int Gender, bool IsShiny, bool IsEgg, string Nature, int Ability, int HeldItem, string OriginalTrainer, string TrainerId, string Personality, string EncryptionConstant, string Format, string RawData, PokemonStats Ivs, PokemonStats Evs, int[] Moves, string SpeciesName, string AbilityName, string HeldItemName, string[] MoveNames);
public record SaveSnapshot(int SchemaVersion, string FileHash, string SourceKey, string Game, int Generation, string TrainerName, int BoxCount, int SlotsPerBox, string[] BoxNames, List<PokemonEntry> Pokemon, List<string> Warnings);
