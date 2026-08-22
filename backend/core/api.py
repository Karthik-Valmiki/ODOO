from ninja import NinjaAPI
from core.models import User, LeaveRequest
from core.schemas import UserSchema, LeaveRequestSchema, LeaveRequestIn
from typing import List

api = NinjaAPI(title="Dayflow HRMS API")

@api.get("/db-check")
def db_check(request):
    try:
        user_count = User.objects.count()
        return {"status": "success", "message": f"Database connected successfully. Found {user_count} users."}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}

@api.get("/users", response=List[UserSchema])
def list_users(request):
    return User.objects.all()

@api.get("/leave-requests", response=List[LeaveRequestSchema])
def list_leave_requests(request):
    return LeaveRequest.objects.all()

@api.post("/leave-requests", response=LeaveRequestSchema)
def create_leave_request(request, payload: LeaveRequestIn):
    leave_request = LeaveRequest.objects.create(**payload.dict())
    return leave_request
