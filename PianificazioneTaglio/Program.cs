using PianificazioneTaglio.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddScoped<NestingRepository>();

// In sviluppo serve il proxy verso Vite
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(opt =>
        opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseCors();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// SPA fallback: tutto ciò che non è /api/ viene servito da index.html
app.MapFallbackToFile("index.html");

app.Run();
