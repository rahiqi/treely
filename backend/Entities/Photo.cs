namespace Treely.Api.Entities;

public class Photo
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public Person Person { get; set; } = null!;
}
