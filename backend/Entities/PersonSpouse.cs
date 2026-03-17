namespace Treely.Api.Entities;

public class PersonSpouse
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public int SpouseId { get; set; }

    public Person Person { get; set; } = null!;
    public Person Spouse { get; set; } = null!;
}
