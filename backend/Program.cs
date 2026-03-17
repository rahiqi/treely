using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore;
using Treely.Api.Data;
using Treely.Api.DTOs;
using Treely.Api.Extensions;
using Treely.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TreeService>();
builder.Services.AddScoped<PersonService>();
builder.Services.AddScoped<PersonProfileService>();
builder.Services.AddScoped<PhotoService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not set");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(jwtKey))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration["Cors:Origins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? new[] { "http://localhost:5173", "http://localhost:3000", "http://localhost", "http://localhost:80","http://192.168.100.28:801" })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Treely API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Description = "JWT. Example: \"Bearer {token}\""
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Treely API v1"));
app.UseAuthentication();
app.UseAuthorization();

// Auth
app.MapPost("/api/auth/register", async (RegisterRequest req, AuthService auth, CancellationToken ct) =>
{
    var result = await auth.RegisterAsync(req, ct);
    return result is not null ? Results.Ok(result) : Results.Conflict("Email already registered");
}).AllowAnonymous();

app.MapPost("/api/auth/login", async (LoginRequest req, AuthService auth, CancellationToken ct) =>
{
    var result = await auth.LoginAsync(req, ct);
    return result is not null ? Results.Ok(result) : Results.Unauthorized();
}).AllowAnonymous();

// Trees
app.MapGet("/api/trees", async (HttpContext ctx, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var list = await treeService.GetMyTreesAsync(userId.Value, ct);
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/api/trees", async (CreateTreeRequest req, HttpContext ctx, TreeService treeService, Treely.Api.Data.AppDbContext db, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
    var tree = await treeService.CreateTreeAsync(req, userId.Value, user?.DisplayName, ct);
    return Results.Created($"/api/trees/{tree?.Id}", tree);
}).RequireAuthorization();

app.MapGet("/api/trees/{treeId:int}", async (int treeId, HttpContext ctx, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var tree = await treeService.GetTreeAsync(treeId, userId.Value, ct);
    return tree is not null ? Results.Ok(tree) : Results.NotFound();
}).RequireAuthorization();

// Tree data for family chart
app.MapGet("/api/trees/{treeId:int}/chart", async (int treeId, HttpContext ctx, TreeService treeService, PersonService personService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    if (!await treeService.CanViewAsync(treeId, userId.Value, ct)) return Results.NotFound();
    var data = await personService.GetTreeDataForChartAsync(treeId, ct);
    return Results.Ok(data);
}).RequireAuthorization();

// Replace full tree (from EditTree.exportData()) – Creator/Contributor only
app.MapPut("/api/trees/{treeId:int}/chart", async (int treeId, List<ChartNodeInput> nodes, HttpContext ctx, TreeService treeService, PersonService personService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    if (!await treeService.CanEditAsync(treeId, userId.Value, ct)) return Results.Forbid();
    var data = await personService.ReplaceChartDataAsync(treeId, nodes ?? new List<ChartNodeInput>(), ct);
    return Results.Ok(data);
}).RequireAuthorization();

// Tree members – list (any member), add (Creator only)
app.MapGet("/api/trees/{treeId:int}/members", async (int treeId, HttpContext ctx, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var list = await treeService.GetMembersAsync(treeId, userId.Value, ct);
    return Results.Ok(list);
}).RequireAuthorization();

app.MapPost("/api/trees/{treeId:int}/members", async (int treeId, AddTreeMemberRequest req, HttpContext ctx, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var (ok, error) = await treeService.AddMemberAsync(treeId, req.Email, req.Role, userId.Value, ct);
    if (!ok) return string.IsNullOrEmpty(error) ? Results.Forbid() : Results.BadRequest(new { message = error });
    var members = await treeService.GetMembersAsync(treeId, userId.Value, ct);
    return Results.Ok(members);
}).RequireAuthorization();

// Persons
app.MapGet("/api/persons/{personId:int}", async (int personId, HttpContext ctx, PersonService personService, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var treeId = await personService.GetTreeIdByPersonIdAsync(personId, ct);
    if (treeId == null || !await treeService.CanViewAsync(treeId.Value, userId.Value, ct))
        return Results.NotFound();
    var person = await personService.GetPersonAsync(personId, ct);
    return person is not null ? Results.Ok(person) : Results.NotFound();
}).RequireAuthorization();

app.MapPost("/api/trees/{treeId:int}/persons", async (int treeId, CreatePersonRequest req, HttpContext ctx, TreeService treeService, PersonService personService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    if (!await treeService.CanEditAsync(treeId, userId.Value, ct)) return Results.Forbid();
    var person = await personService.CreatePersonAsync(treeId, req, ct);
    return Results.Created($"/api/persons/{person?.Id}", person);
}).RequireAuthorization();

app.MapPut("/api/trees/{treeId:int}/persons/{personId:int}", async (int treeId, int personId, UpdatePersonRequest req, HttpContext ctx, TreeService treeService, PersonService personService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    if (!await treeService.CanEditAsync(treeId, userId.Value, ct)) return Results.Forbid();
    var person = await personService.UpdatePersonAsync(personId, treeId, req, ct);
    return person is not null ? Results.Ok(person) : Results.NotFound();
}).RequireAuthorization();

// Person profile
app.MapGet("/api/persons/{personId:int}/profile", async (int personId, HttpContext ctx, PersonProfileService profileService, PersonService personService, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var treeId = await personService.GetTreeIdByPersonIdAsync(personId, ct);
    if (treeId == null || !await treeService.CanViewAsync(treeId.Value, userId.Value, ct))
        return Results.NotFound();
    var profile = await profileService.GetProfileAsync(personId, ct);
    return Results.Ok(profile);
}).RequireAuthorization();

app.MapPut("/api/persons/{personId:int}/profile", async (int personId, UpdatePersonProfileRequest req, HttpContext ctx, PersonProfileService profileService, PersonService personService, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var treeId = await personService.GetTreeIdByPersonIdAsync(personId, ct);
    if (treeId == null || !await treeService.CanEditAsync(treeId.Value, userId.Value, ct))
        return Results.NotFound();
    var profile = await profileService.UpsertProfileAsync(personId, req, ct);
    return Results.Ok(profile);
}).RequireAuthorization();

// Photos
app.MapGet("/api/persons/{personId:int}/photos", async (int personId, HttpContext ctx, PhotoService photoService, PersonService personService, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var treeId = await personService.GetTreeIdByPersonIdAsync(personId, ct);
    if (treeId == null || !await treeService.CanViewAsync(treeId.Value, userId.Value, ct))
        return Results.NotFound();
    var photos = await photoService.GetPhotosAsync(personId, ct);
    return Results.Ok(photos);
}).RequireAuthorization();

app.MapPost("/api/persons/{personId:int}/photos", async (int personId, AddPhotoRequest req, HttpContext ctx, PhotoService photoService, PersonService personService, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var treeId = await personService.GetTreeIdByPersonIdAsync(personId, ct);
    if (treeId == null || !await treeService.CanEditAsync(treeId.Value, userId.Value, ct))
        return Results.NotFound();
    var photo = await photoService.AddPhotoAsync(personId, req, ct);
    return Results.Created($"/api/persons/{personId}/photos/{photo?.Id}", photo);
}).RequireAuthorization();

app.MapDelete("/api/persons/{personId:int}/photos/{photoId:int}", async (int personId, int photoId, HttpContext ctx, PhotoService photoService, PersonService personService, TreeService treeService, CancellationToken ct) =>
{
    var userId = ctx.User.GetUserId();
    if (userId == null) return Results.Unauthorized();
    var treeId = await personService.GetTreeIdByPersonIdAsync(personId, ct);
    if (treeId == null || !await treeService.CanEditAsync(treeId.Value, userId.Value, ct))
        return Results.NotFound();
    var deleted = await photoService.DeletePhotoAsync(photoId, personId, ct);
    return deleted ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization();

app.Run();
