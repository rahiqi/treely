namespace Treely.Api.DTOs;

public record TreeDto(int Id, string Name, string? Description, DateTime CreatedAtUtc, string YourRole);
public record CreateTreeRequest(string Name, string? Description);
public record UpdateTreeRequest(string? Name, string? Description);

public record AddTreeMemberRequest(string Email, string Role); // Role: "Contributor" | "Visitor"
public record TreeMemberDto(int UserId, string Email, string DisplayName, string Role, DateTime JoinedAtUtc);
