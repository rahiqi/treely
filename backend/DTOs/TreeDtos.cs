namespace Treely.Api.DTOs;

public record TreeDto(int Id, string Name, string? Description, DateTime CreatedAtUtc, string YourRole);
public record CreateTreeRequest(string Name, string? Description);
public record UpdateTreeRequest(string? Name, string? Description);
