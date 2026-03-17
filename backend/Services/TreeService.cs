using Microsoft.EntityFrameworkCore;
using Treely.Api.Data;
using Treely.Api.DTOs;
using Treely.Api.Entities;

namespace Treely.Api.Services;

public class TreeService
{
    private readonly AppDbContext _db;

    public TreeService(AppDbContext db) => _db = db;

    public async Task<TreeDto?> GetTreeAsync(int treeId, int userId, CancellationToken ct = default)
    {
        var member = await _db.TreeMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.TreeId == treeId && m.UserId == userId, ct);
        if (member == null) return null;
        var tree = await _db.Trees.AsNoTracking().FirstOrDefaultAsync(t => t.Id == treeId, ct);
        if (tree == null) return null;
        return new TreeDto(tree.Id, tree.Name, tree.Description, tree.CreatedAtUtc, member.Role.ToString());
    }

    public async Task<TreeDto?> CreateTreeAsync(CreateTreeRequest req, int userId, CancellationToken ct = default)
    {
        var tree = new Tree
        {
            Name = req.Name,
            Description = req.Description,
            CreatedAtUtc = DateTime.UtcNow
        };
        _db.Trees.Add(tree);
        await _db.SaveChangesAsync(ct);
        _db.TreeMembers.Add(new TreeMember
        {
            TreeId = tree.Id,
            UserId = userId,
            Role = TreeRole.Creator,
            JoinedAtUtc = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return new TreeDto(tree.Id, tree.Name, tree.Description, tree.CreatedAtUtc, nameof(TreeRole.Creator));
    }

    public async Task<List<TreeDto>> GetMyTreesAsync(int userId, CancellationToken ct = default)
    {
        return await _db.TreeMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Include(m => m.Tree)
            .Select(m => new TreeDto(m.Tree.Id, m.Tree.Name, m.Tree.Description, m.Tree.CreatedAtUtc, m.Role.ToString()))
            .ToListAsync(ct);
    }

    public async Task<bool> CanViewAsync(int treeId, int userId, CancellationToken ct = default)
    {
        return await _db.TreeMembers.AnyAsync(m => m.TreeId == treeId && m.UserId == userId, ct);
    }

    public async Task<bool> CanEditAsync(int treeId, int userId, CancellationToken ct = default)
    {
        return await _db.TreeMembers.AnyAsync(m =>
            m.TreeId == treeId && m.UserId == userId && (m.Role == TreeRole.Creator || m.Role == TreeRole.Contributor), ct);
    }

    public async Task<bool> IsCreatorAsync(int treeId, int userId, CancellationToken ct = default)
    {
        return await _db.TreeMembers.AnyAsync(m =>
            m.TreeId == treeId && m.UserId == userId && m.Role == TreeRole.Creator, ct);
    }
}
