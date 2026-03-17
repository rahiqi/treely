namespace Treely.Api.Entities;

public class TreeMember
{
    public int Id { get; set; }
    public int TreeId { get; set; }
    public int UserId { get; set; }
    public TreeRole Role { get; set; }
    public DateTime JoinedAtUtc { get; set; }

    public Tree Tree { get; set; } = null!;
    public User User { get; set; } = null!;
}
