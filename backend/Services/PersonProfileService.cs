using Microsoft.EntityFrameworkCore;
using Treely.Api.Data;
using Treely.Api.DTOs;
using Treely.Api.Entities;

namespace Treely.Api.Services;

public class PersonProfileService
{
    private readonly AppDbContext _db;

    public PersonProfileService(AppDbContext db) => _db = db;

    public async Task<PersonProfileDto?> GetProfileAsync(int personId, CancellationToken ct = default)
    {
        var profile = await _db.PersonProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.PersonId == personId, ct);
        if (profile == null)
            return new PersonProfileDto(personId, null, default);
        return new PersonProfileDto(profile.PersonId, profile.Biography, profile.UpdatedAtUtc);
    }

    public async Task<PersonProfileDto?> UpsertProfileAsync(int personId, UpdatePersonProfileRequest req, CancellationToken ct = default)
    {
        var profile = await _db.PersonProfiles.FirstOrDefaultAsync(p => p.PersonId == personId, ct);
        if (profile == null)
        {
            profile = new PersonProfile { PersonId = personId, UpdatedAtUtc = DateTime.UtcNow };
            _db.PersonProfiles.Add(profile);
        }
        if (req.Biography != null)
            profile.Biography = req.Biography;
        profile.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetProfileAsync(personId, ct);
    }
}
