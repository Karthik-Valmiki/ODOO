from ninja import NinjaAPI
from core.models import User

api = NinjaAPI(title="Dayflow HRMS API")

@api.get("/db-check")
def db_check(request):
    try:
        user_count = User.objects.count()
        return {"status": "success", "message": f"Database connected successfully. Found {user_count} users."}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}
