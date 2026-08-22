import uuid
from django.db import models

class User(models.Model):
    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("EMPLOYEE", "Employee"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_id = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
        managed = False

    @property
    def is_admin(self) -> bool:
        return self.role == "ADMIN"

    def __str__(self):
        return f"{self.employee_id} ({self.role}) - {self.email}"


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    salary_structure = models.JSONField(default=dict, blank=True)
    profile_picture_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        managed = False

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.full_name


class Attendance(models.Model):
    STATUS_CHOICES = (
        ("PRESENT", "Present"),
        ("ABSENT", "Absent"),
        ("HALF_DAY", "Half Day"),
        ("LEAVE", "Leave"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendances")
    record_date = models.DateField()
    check_in = models.DateTimeField(blank=True, null=True)
    check_out = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendance"
        managed = False
        unique_together = ("user", "record_date")

    def __str__(self):
        return f"{self.user.employee_id} - {self.record_date} ({self.status})"


class LeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = (
        ("PAID", "Paid Time Off"),
        ("SICK", "Sick Leave"),
        ("UNPAID", "Unpaid Leave"),
    )

    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    description = models.TextField(db_column="description", blank=True, null=True)
    admin_comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_requests"
        managed = False

    def __str__(self):
        return f"{self.user.employee_id} - {self.leave_type} ({self.status})"
