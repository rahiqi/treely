using Microsoft.EntityFrameworkCore;
using Treely.Api.Entities;

namespace Treely.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Tree> Trees => Set<Tree>();
    public DbSet<TreeMember> TreeMembers => Set<TreeMember>();
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<PersonRelation> PersonRelations => Set<PersonRelation>();
    public DbSet<PersonSpouse> PersonSpouses => Set<PersonSpouse>();
    public DbSet<PersonProfile> PersonProfiles => Set<PersonProfile>();
    public DbSet<Photo> Photos => Set<Photo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<TreeMember>(e =>
        {
            e.HasIndex(x => new { x.TreeId, x.UserId }).IsUnique();
            e.HasOne(x => x.Tree).WithMany(x => x.Members).HasForeignKey(x => x.TreeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany(x => x.TreeMembers).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Person>(e =>
        {
            e.HasIndex(x => new { x.TreeId, x.ExternalId }).IsUnique();
            e.HasOne(x => x.Tree).WithMany(x => x.Persons).HasForeignKey(x => x.TreeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Profile).WithOne(x => x.Person).HasForeignKey<PersonProfile>(x => x.PersonId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PersonRelation>(e =>
        {
            e.HasOne(x => x.Parent).WithMany(x => x.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Child).WithMany(x => x.Parents).HasForeignKey(x => x.ChildId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ParentId, x.ChildId }).IsUnique();
        });

        modelBuilder.Entity<PersonSpouse>(e =>
        {
            e.HasOne(x => x.Person).WithMany(x => x.Spouses).HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Spouse).WithMany().HasForeignKey(x => x.SpouseId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.PersonId, x.SpouseId }).IsUnique();
        });

        modelBuilder.Entity<PersonProfile>(e =>
        {
            e.HasIndex(x => x.PersonId).IsUnique();
        });

        modelBuilder.Entity<Photo>(e =>
        {
            e.HasOne(x => x.Person).WithMany(x => x.Photos).HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
