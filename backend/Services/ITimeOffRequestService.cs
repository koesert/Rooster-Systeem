using backend.DTOs;
using backend.Models;

namespace backend.Services;

public interface ITimeOffRequestService
{
    Task<TimeOffRequest> CreateRequestAsync(int employeeId, CreateTimeOffRequestDto dto);
    Task<TimeOffRequest> UpdateRequestAsync(int id, int employeeId, CreateTimeOffRequestDto dto);
    Task<IEnumerable<TimeOffRequestResponseDto>> GetAllRequestsAsync(TimeOffRequestFilterDto? filter = null);
    Task<TimeOffRequestResponseDto?> GetRequestByIdAsync(int id);
    Task<IEnumerable<TimeOffRequestResponseDto>> GetRequestsByEmployeeAsync(int employeeId);
    Task<TimeOffRequest> UpdateRequestStatusAsync(int id, UpdateTimeOffRequestStatusDto dto, int managerId);
    Task CancelRequestAsync(int id, int employeeId);
    Task DeleteRequestAsync(int id, int employeeId);
    Task<bool> HasOverlappingRequestsAsync(int employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null);
}