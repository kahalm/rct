namespace Rct.Api.DTOs;

/// <summary>Eine Konto-Zeile der Admin-Userliste.</summary>
public class AdminUserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public bool CourseAccess { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SetCourseAccessDto
{
    public bool Access { get; set; }
}
