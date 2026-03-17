using Microsoft.EntityFrameworkCore;
using Treely.Api.Data;
using Treely.Api.DTOs;
using Treely.Api.Entities;

namespace Treely.Api.Services;

public class PersonService
{
    private readonly AppDbContext _db;

    public PersonService(AppDbContext db) => _db = db;

    public async Task<List<FamilyChartNode>> GetTreeDataForChartAsync(int treeId, CancellationToken ct = default)
    {
        var persons = await _db.Persons
            .AsNoTracking()
            .Where(p => p.TreeId == treeId)
            .Include(p => p.Parents).ThenInclude(r => r.Parent)
            .Include(p => p.Children).ThenInclude(r => r.Child)
            .Include(p => p.Spouses).ThenInclude(s => s.Spouse)
            .ToListAsync(ct);

        return persons.Select(p =>
        {
            var data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
            {
                ["gender"] = p.Gender,
                ["first name"] = p.FirstName,
                ["last name"] = p.LastName,
                ["personId"] = p.Id
            };
            if (!string.IsNullOrEmpty(p.Birthday)) data["birthday"] = p.Birthday;
            if (!string.IsNullOrEmpty(p.DeathDate)) data["death"] = p.DeathDate;
            if (!string.IsNullOrEmpty(p.AvatarUrl)) data["avatar"] = p.AvatarUrl;

            var parentIds = p.Parents.Select(r => r.Parent.ExternalId).ToArray();
            var childIds = p.Children.Select(r => r.Child.ExternalId).ToArray();
            var spouseIds = p.Spouses.Select(s => s.Spouse.ExternalId).ToArray();

            return new FamilyChartNode(p.ExternalId, data, new FamilyChartRels(parentIds, spouseIds, childIds));
        }).ToList();
    }

    public async Task<PersonDto?> GetPersonAsync(int personId, CancellationToken ct = default)
    {
        var p = await _db.Persons
            .AsNoTracking()
            .Where(x => x.Id == personId)
            .Include(x => x.Parents).ThenInclude(r => r.Parent)
            .Include(x => x.Children).ThenInclude(r => r.Child)
            .Include(x => x.Spouses).ThenInclude(s => s.Spouse)
            .FirstOrDefaultAsync(ct);
        if (p == null) return null;
        return MapToDto(p);
    }

    public async Task<PersonDto?> GetByTreeAndExternalIdAsync(int treeId, string externalId, CancellationToken ct = default)
    {
        var p = await _db.Persons
            .AsNoTracking()
            .Where(x => x.TreeId == treeId && x.ExternalId == externalId)
            .Include(x => x.Parents).ThenInclude(r => r.Parent)
            .Include(x => x.Children).ThenInclude(r => r.Child)
            .Include(x => x.Spouses).ThenInclude(s => s.Spouse)
            .FirstOrDefaultAsync(ct);
        if (p == null) return null;
        return MapToDto(p);
    }

    public async Task<PersonDto?> CreatePersonAsync(int treeId, CreatePersonRequest req, CancellationToken ct = default)
    {
        var nextId = await _db.Persons.Where(p => p.TreeId == treeId).CountAsync(ct) + 1;
        var externalId = nextId.ToString();
        var person = new Person
        {
            TreeId = treeId,
            ExternalId = externalId,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Gender = req.Gender,
            Birthday = req.Birthday,
            DeathDate = req.DeathDate,
            AvatarUrl = req.AvatarUrl,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        _db.Persons.Add(person);
        await _db.SaveChangesAsync(ct);

        await SetRelationsAsync(person.Id, treeId, req.ParentIds, req.SpouseIds, req.ChildIds, ct);
        await _db.SaveChangesAsync(ct);
        return await GetPersonAsync(person.Id, ct);
    }

    public async Task<PersonDto?> UpdatePersonAsync(int personId, int treeId, UpdatePersonRequest req, CancellationToken ct = default)
    {
        var person = await _db.Persons.FirstOrDefaultAsync(p => p.Id == personId && p.TreeId == treeId, ct);
        if (person == null) return null;

        if (req.FirstName != null) person.FirstName = req.FirstName;
        if (req.LastName != null) person.LastName = req.LastName;
        if (req.Gender != null) person.Gender = req.Gender;
        if (req.Birthday != null) person.Birthday = req.Birthday;
        if (req.DeathDate != null) person.DeathDate = req.DeathDate;
        if (req.AvatarUrl != null) person.AvatarUrl = req.AvatarUrl;
        person.UpdatedAtUtc = DateTime.UtcNow;

        if (req.ParentIds != null || req.SpouseIds != null || req.ChildIds != null)
        {
            await SetRelationsAsync(person.Id, treeId, req.ParentIds, req.SpouseIds, req.ChildIds, ct);
        }
        await _db.SaveChangesAsync(ct);
        return await GetPersonAsync(person.Id, ct);
    }

    private async Task SetRelationsAsync(int personId, int treeId, string[]? parentIds, string[]? spouseIds, string[]? childIds, CancellationToken ct)
    {
        var person = await _db.Persons.Include(p => p.Parents).Include(p => p.Children).Include(p => p.Spouses)
            .FirstAsync(p => p.Id == personId, ct);

        if (parentIds != null)
        {
            _db.PersonRelations.RemoveRange(person.Parents);
            foreach (var extId in parentIds)
            {
                var parent = await _db.Persons.FirstOrDefaultAsync(p => p.TreeId == treeId && p.ExternalId == extId, ct);
                if (parent != null)
                    _db.PersonRelations.Add(new PersonRelation { ParentId = parent.Id, ChildId = personId });
            }
        }
        if (childIds != null)
        {
            _db.PersonRelations.RemoveRange(person.Children);
            foreach (var extId in childIds)
            {
                var child = await _db.Persons.FirstOrDefaultAsync(p => p.TreeId == treeId && p.ExternalId == extId, ct);
                if (child != null)
                    _db.PersonRelations.Add(new PersonRelation { ParentId = personId, ChildId = child.Id });
            }
        }
        if (spouseIds != null)
        {
            _db.PersonSpouses.RemoveRange(person.Spouses);
            foreach (var extId in spouseIds)
            {
                var spouse = await _db.Persons.FirstOrDefaultAsync(p => p.TreeId == treeId && p.ExternalId == extId, ct);
                if (spouse != null && spouse.Id != personId)
                    _db.PersonSpouses.Add(new PersonSpouse { PersonId = personId, SpouseId = spouse.Id });
            }
        }
    }

    private static PersonDto MapToDto(Person p)
    {
        return new PersonDto(
            p.Id,
            p.ExternalId,
            p.FirstName,
            p.LastName,
            p.Gender,
            p.Birthday,
            p.DeathDate,
            p.AvatarUrl,
            p.Parents.Select(r => r.Parent.ExternalId).ToArray(),
            p.Spouses.Select(s => s.Spouse.ExternalId).ToArray(),
            p.Children.Select(r => r.Child.ExternalId).ToArray()
        );
    }

    public async Task<int?> GetTreeIdByPersonIdAsync(int personId, CancellationToken ct = default)
    {
        var p = await _db.Persons.AsNoTracking().FirstOrDefaultAsync(x => x.Id == personId, ct);
        return p?.TreeId;
    }

    /// <summary>Replace entire tree with chart data from EditTree.exportData().</summary>
    public async Task<List<FamilyChartNode>> ReplaceChartDataAsync(int treeId, List<ChartNodeInput> nodes, CancellationToken ct = default)
    {
        var personIds = await _db.Persons.Where(p => p.TreeId == treeId).Select(p => p.Id).ToListAsync(ct);
        if (personIds.Count > 0)
        {
            await _db.PersonRelations.Where(r => personIds.Contains(r.ParentId) || personIds.Contains(r.ChildId)).ExecuteDeleteAsync(ct);
            await _db.PersonSpouses.Where(s => personIds.Contains(s.PersonId) || personIds.Contains(s.SpouseId)).ExecuteDeleteAsync(ct);
            await _db.PersonProfiles.Where(pr => personIds.Contains(pr.PersonId)).ExecuteDeleteAsync(ct);
            await _db.Photos.Where(ph => personIds.Contains(ph.PersonId)).ExecuteDeleteAsync(ct);
            await _db.Persons.Where(p => p.TreeId == treeId).ExecuteDeleteAsync(ct);
        }

        if (nodes.Count == 0)
            return new List<FamilyChartNode>();

        var idToPerson = new Dictionary<string, Person>(StringComparer.OrdinalIgnoreCase);
        foreach (var n in nodes)
        {
            var data = n.Data ?? new Dictionary<string, object>();
            var person = new Person
            {
                TreeId = treeId,
                ExternalId = n.Id,
                FirstName = GetString(data, "first name") ?? "",
                LastName = GetString(data, "last name") ?? "",
                Gender = GetString(data, "gender") ?? "M",
                Birthday = GetString(data, "birthday"),
                DeathDate = GetString(data, "death"),
                AvatarUrl = GetString(data, "avatar"),
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.Persons.Add(person);
            idToPerson[n.Id] = person;
        }
        await _db.SaveChangesAsync(ct);

        foreach (var n in nodes)
        {
            if (!idToPerson.TryGetValue(n.Id, out var person)) continue;
            var rels = n.Rels ?? new ChartRelsInput(null, null, null);
            foreach (var parentId in rels.Parents ?? Array.Empty<string>())
            {
                if (idToPerson.TryGetValue(parentId, out var parent))
                    _db.PersonRelations.Add(new PersonRelation { ParentId = parent.Id, ChildId = person.Id });
            }
            foreach (var childId in rels.Children ?? Array.Empty<string>())
            {
                if (idToPerson.TryGetValue(childId, out var child))
                    _db.PersonRelations.Add(new PersonRelation { ParentId = person.Id, ChildId = child.Id });
            }
            foreach (var spouseId in rels.Spouses ?? Array.Empty<string>())
            {
                if (idToPerson.TryGetValue(spouseId, out var spouse) && spouse.Id != person.Id)
                    _db.PersonSpouses.Add(new PersonSpouse { PersonId = person.Id, SpouseId = spouse.Id });
            }
        }
        await _db.SaveChangesAsync(ct);

        return await GetTreeDataForChartAsync(treeId, ct);
    }

    private static string? GetString(Dictionary<string, object> data, string key)
    {
        if (data.TryGetValue(key, out var v) && v != null)
            return v.ToString();
        return null;
    }
}
