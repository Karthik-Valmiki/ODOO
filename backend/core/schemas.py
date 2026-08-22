from ninja import ModelSchema
from core.models import User, LeaveRequest, Attendance, Profile

class UserSchema(ModelSchema):
    class Meta:
        model = User
        fields = ['id', 'employee_id', 'email', 'role', 'is_verified', 'created_at']

class LeaveRequestSchema(ModelSchema):
    class Meta:
        model = LeaveRequest
        fields = ['id', 'user', 'leave_type', 'start_date', 'end_date', 'status', 'employee_remarks', 'admin_comments', 'created_at']

class LeaveRequestIn(ModelSchema):
    class Meta:
        model = LeaveRequest
        fields = ['user', 'leave_type', 'start_date', 'end_date', 'employee_remarks']

class AttendanceSchema(ModelSchema):
    class Meta:
        model = Attendance
        fields = ['id', 'user', 'record_date', 'check_in', 'check_out', 'status']

class ProfileSchema(ModelSchema):
    class Meta:
        model = Profile
        fields = ['id', 'user', 'first_name', 'last_name', 'phone', 'address', 'profile_picture_url']
