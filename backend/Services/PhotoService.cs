using Microsoft.EntityFrameworkCore;
using Treely.Api.Data;
using Treely.Api.DTOs;
using Treely.Api.Entities;

namespace Treely.Api.Services;

public class PhotoService
{
    private readonly AppDbContext _db;

    public PhotoService(AppDbContext db) => _db = db;

    public async Task<List<PhotoDto>> GetPhotosAsync(int personId, CancellationToken ct = default)
    {
        return await _db.Photos
            .AsNoTracking()
            .Where(p => p.PersonId == personId)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Id)
            .Select(p => new PhotoDto(p.Id, p.Url, p.Caption, p.SortOrder))
            .ToListAsync(ct);
    }

    public async Task<PhotoDto?> AddPhotoAsync(int personId, AddPhotoRequest req, CancellationToken ct = default)
    {
        var maxOrder = await _db.Photos.Where(p => p.PersonId == personId).MaxAsync(p => (int?)p.SortOrder, ct) ?? 0;
        var photo = new Photo
        {
            PersonId = personId,
            Url = req.Url,
            Caption = req.Caption,
            SortOrder = maxOrder + 1,
            CreatedAtUtc = DateTime.UtcNow
        };
        _db.Photos.Add(photo);
        await _db.SaveChangesAsync(ct);
        return new PhotoDto(photo.Id, photo.Url, photo.Caption, photo.SortOrder);
    }

    public async Task<bool> DeletePhotoAsync(int photoId, int personId, CancellationToken ct = default)
    {
        var photo = await _db.Photos.FirstOrDefaultAsync(p => p.Id == photoId && p.PersonId == personId, ct);
        if (photo == null) return false;
        _db.Photos.Remove(photo);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
