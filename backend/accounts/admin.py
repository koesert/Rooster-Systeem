from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.utils import timezone
from django.http import HttpRequest
from django.db.models import QuerySet
from typing import Any, Optional
from .models import Company, RegistrationRequest  # Fixed import

User = get_user_model()


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """Admin interface voor bedrijven"""

    list_display = [
        "name",
        "company_code",
        "cuisine_type",
        "employee_count",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "cuisine_type", "created_at"]
    search_fields = ["name", "company_code", "address"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basis Informatie",
            {"fields": ("name", "company_code", "cuisine_type", "is_active")},
        ),
        ("Contact Gegevens", {"fields": ("address", "phone", "email")}),
        ("Instellingen", {"fields": ("max_employees",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    @admin.display(description="Werknemers (actief/max)")
    def employee_count(self, obj: Company) -> str:
        """Toon aantal werknemers per bedrijf"""
        count = User.objects.filter(company=obj, is_active=True).count()
        return f"{count}/{obj.max_employees}"

    def save_model(
        self, request: HttpRequest, obj: Company, form: Any, change: bool
    ) -> None:
        """Auto-genereer company_code als deze leeg is"""
        if not obj.company_code:
            # Genereer code op basis van bedrijfsnaam
            base_code = "".join([c.upper() for c in obj.name.split()[:2]])[:4]
            counter = 1
            company_code = base_code

            while Company.objects.filter(company_code=company_code).exists():
                company_code = f"{base_code}{counter:02d}"
                counter += 1

            obj.company_code = company_code

        super().save_model(request, obj, form, change)


@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    """Admin interface voor registratie verzoeken"""

    list_display = [
        "applicant_name",
        "email",
        "company",
        "function",
        "status_badge",
        "email_verified_badge",
        "created_at",
        "reviewed_by",
    ]
    list_filter = ["status", "email_verified", "function", "company", "created_at"]
    search_fields = ["first_name", "last_name", "email", "phone"]
    readonly_fields = ["verification_token", "created_at", "reviewed_at"]

    fieldsets = (
        (
            "Aanvrager Gegevens",
            {"fields": ("first_name", "last_name", "email", "phone", "function")},
        ),
        ("Bedrijf Informatie", {"fields": ("company", "company_code_entered")}),
        (
            "Status & Verificatie",
            {"fields": ("status", "email_verified", "verification_token")},
        ),
        (
            "Behandeling",
            {
                "fields": ("reviewed_by", "reviewed_at", "rejection_reason"),
                "classes": ("collapse",),
            },
        ),
        ("Timestamps", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    actions = ["approve_requests", "reject_requests"]

    @admin.display(description="Naam", ordering="last_name")
    def applicant_name(self, obj: RegistrationRequest) -> str:
        """Volledige naam van aanvrager"""
        return f"{obj.first_name} {obj.last_name}"

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj: RegistrationRequest) -> str:
        """Gekleurde status badge"""
        colors = {
            "pending": "#ffc107",  # Geel
            "approved": "#28a745",  # Groen
            "rejected": "#dc3545",  # Rood
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Email Status", ordering="email_verified")
    def email_verified_badge(self, obj: RegistrationRequest) -> str:
        """Email verificatie status badge"""
        if obj.email_verified:
            return format_html('<span style="color: #28a745;">✓ Geverifieerd</span>')
        return format_html('<span style="color: #dc3545;">✗ Niet geverifieerd</span>')

    @admin.action(description="Geselecteerde registraties goedkeuren")
    def approve_requests(
        self, request: HttpRequest, queryset: QuerySet[RegistrationRequest]
    ) -> None:
        """Bulk goedkeuring van registraties"""
        approved_count = 0

        for registration_request in queryset.filter(
            status="pending", email_verified=True
        ):
            # Hier zou je de User aanmaak logica kunnen uitvoeren
            registration_request.status = "approved"
            registration_request.reviewed_by = request.user
            registration_request.reviewed_at = timezone.now()
            registration_request.save()
            approved_count += 1

        self.message_user(request, f"{approved_count} registratie(s) goedgekeurd.")

    @admin.action(description="Geselecteerde registraties afwijzen")
    def reject_requests(
        self, request: HttpRequest, queryset: QuerySet[RegistrationRequest]
    ) -> None:
        """Bulk afwijzing van registraties"""
        rejected_count = queryset.filter(status="pending").update(
            status="rejected",
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            rejection_reason="Afgewezen via bulk actie in admin",
        )
        self.message_user(request, f"{rejected_count} registratie(s) afgewezen.")

    def get_queryset(self, request: HttpRequest) -> QuerySet[RegistrationRequest]:
        """Filter op bedrijf van ingelogde gebruiker (voor managers)"""
        qs = super().get_queryset(request)

        # Superusers zien alles
        if request.user.is_superuser:
            return qs

        # Managers zien alleen hun eigen bedrijf
        if hasattr(request.user, "company"):
            return qs.filter(company=request.user.company)

        # Anderen zien niets
        return qs.none()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface voor gebruikers"""

    list_display = [
        "username",
        "get_full_name",
        "email",
        "company",
        "role",
        "function",
        "is_approved_badge",
        "employee_number",
        "hire_date",
        "is_active",
    ]
    list_filter = [
        "is_active",
        "is_approved",
        "role",
        "function",
        "company",
        "hire_date",
        "email_verified",
    ]
    search_fields = ["username", "first_name", "last_name", "email", "employee_number"]
    ordering = ["company", "last_name", "first_name"]

    # Aangepaste fieldsets voor restaurant context
    base_fieldsets = BaseUserAdmin.fieldsets or []
    restaurant_fieldsets = (
        (
            "Restaurant Informatie",
            {
                "fields": (
                    "company",
                    "role",
                    "function",
                    "employee_number",
                    "hire_date",
                    "hourly_rate",
                )
            },
        ),
        ("Contact & Persoonlijk", {"fields": ("phone", "birth_date")}),
        (
            "Account Status",
            {"fields": ("is_approved", "approved_by", "approved_at", "email_verified")},
        ),
    )

    # Combine base and restaurant fieldsets
    fieldsets = base_fieldsets + restaurant_fieldsets

    base_add_fieldsets = BaseUserAdmin.add_fieldsets or []
    restaurant_add_fieldsets = (
        ("Restaurant Informatie", {"fields": ("company", "role", "function", "phone")}),
    )

    # Combine base and restaurant add_fieldsets
    add_fieldsets = base_add_fieldsets + restaurant_add_fieldsets

    readonly_fields = ["employee_number", "approved_at", "created_at", "updated_at"]

    @admin.display(description="Goedkeuring", ordering="is_approved")
    def is_approved_badge(self, obj: Any) -> str:
        """Goedkeuring status badge"""
        if getattr(obj, "is_approved", False):
            approved_by = getattr(obj, "approved_by", None)
            approved_by_text = f"door {approved_by}" if approved_by else ""
            return format_html(
                '<span style="color: #28a745;" title="Goedgekeurd {}">✓ Goedgekeurd</span>',
                approved_by_text,
            )
        return format_html(
            '<span style="color: #dc3545;">✗ Wachtend op goedkeuring</span>'
        )

    def get_queryset(self, request: HttpRequest) -> QuerySet[Any]:
        """Filter op bedrijf van ingelogde gebruiker (voor managers)"""
        qs = super().get_queryset(request)

        # Superusers zien alles
        if request.user.is_superuser:
            return qs

        # Managers zien alleen hun eigen bedrijf
        if (
            hasattr(request.user, "company")
            and hasattr(request.user, "is_manager_or_above")
            and request.user.is_manager_or_above
        ):
            return qs.filter(company=request.user.company)

        # Gewone gebruikers zien alleen zichzelf
        if hasattr(request.user, "id"):
            return qs.filter(id=request.user.id)

        return qs.none()

    def save_model(
        self, request: HttpRequest, obj: Any, form: Any, change: bool
    ) -> None:
        """Auto-goedkeuring voor managers die accounts aanmaken"""
        if (
            not change
            and hasattr(request.user, "is_manager_or_above")
            and request.user.is_manager_or_above
        ):
            obj.is_approved = True
            obj.approved_by = request.user
            obj.approved_at = timezone.now()

        super().save_model(request, obj, form, change)


# Aanpassing van admin site headers
admin.site.site_header = "Restaurant Roster Management"
admin.site.site_title = "Roster Admin"
admin.site.index_title = "Restaurant Beheer"
