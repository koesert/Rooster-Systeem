namespace backend.Models;

public enum ShiftType
{
    /// <summary>
    /// Schoonmaak shift - cleaning duties
    /// </summary>
    Schoonmaak = 0,

    /// <summary>
    /// Bedienen shift - serving/service duties
    /// </summary>
    Bedienen = 1,

    /// <summary>
    /// Combinatie van schoonmaak en bedienen - combined cleaning and service duties
    /// </summary>
    SchoonmaakBedienen = 2
}