namespace Treely.Api.Entities;

public class PersonProfile
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public string? Biography { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Person Person { get; set; } = null!;
}
