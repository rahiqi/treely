namespace Treely.Api.DTOs;

/// <summary>Family-chart node format: id, data, rels.</summary>
public record FamilyChartNode(string Id, Dictionary<string, object> Data, FamilyChartRels Rels);
public record FamilyChartRels(string[] Parents, string[] Spouses, string[] Children);

/// <summary>Payload for PUT chart: full tree from EditTree.exportData().</summary>
public record ChartNodeInput(string Id, Dictionary<string, object> Data, ChartRelsInput Rels);
public record ChartRelsInput(string[]? Parents, string[]? Spouses, string[]? Children);

public record PersonDto(
    int Id,
    string ExternalId,
    string FirstName,
    string LastName,
    string Gender,
    string? Birthday,
    string? DeathDate,
    string? AvatarUrl,
    string[] ParentIds,
    string[] SpouseIds,
    string[] ChildIds
);

public record CreatePersonRequest(
    string FirstName,
    string LastName,
    string Gender,
    string? Birthday,
    string? DeathDate,
    string? AvatarUrl,
    string[]? ParentIds,
    string[]? SpouseIds,
    string[]? ChildIds
);

public record UpdatePersonRequest(
    string? FirstName,
    string? LastName,
    string? Gender,
    string? Birthday,
    string? DeathDate,
    string? AvatarUrl,
    string[]? ParentIds,
    string[]? SpouseIds,
    string[]? ChildIds
);

public record PersonProfileDto(int PersonId, string? Biography, DateTime UpdatedAtUtc);
public record UpdatePersonProfileRequest(string? Biography);

public record PhotoDto(int Id, string Url, string? Caption, int SortOrder);
public record AddPhotoRequest(string Url, string? Caption);
