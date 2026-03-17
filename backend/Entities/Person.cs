namespace Treely.Api.Entities;

public class Person
{
    public int Id { get; set; }
    public int TreeId { get; set; }
    /// <summary>Stored as string for family-chart compatibility (e.g. "1", "2").</summary>
    public string ExternalId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Gender { get; set; } = "M"; // M | F
    public string? Birthday { get; set; }
    public string? DeathDate { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Tree Tree { get; set; } = null!;
    public PersonProfile? Profile { get; set; }
    public ICollection<PersonRelation> Parents { get; set; } = new List<PersonRelation>();
    public ICollection<PersonRelation> Children { get; set; } = new List<PersonRelation>();
    public ICollection<PersonSpouse> Spouses { get; set; } = new List<PersonSpouse>();
    public ICollection<Photo> Photos { get; set; } = new List<Photo>();
}
