namespace Treely.Api.Entities;

/// <summary>Parent-child relationship. ChildId is the child, ParentId is the parent.</summary>
public class PersonRelation
{
    public int Id { get; set; }
    public int ParentId { get; set; }
    public int ChildId { get; set; }

    public Person Parent { get; set; } = null!;
    public Person Child { get; set; } = null!;
}
