namespace Treely.Api.Entities;

public class Tree
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<TreeMember> Members { get; set; } = new List<TreeMember>();
    public ICollection<Person> Persons { get; set; } = new List<Person>();
}
