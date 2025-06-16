from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
import uuid


class Company(models.Model):
    """Restaurant/Company model voor multi-tenant systeem"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="Bedrijfsnaam")
    company_code = models.CharField(
        max_length=8,
        unique=True,
        verbose_name="Bedrijfscode",
        help_text="Unieke 8-karakter code voor werknemersregistratie",
    )
    address = models.TextField(verbose_name="Adres", blank=True)
    phone = models.CharField(max_length=20, verbose_name="Telefoon", blank=True)
    email = models.EmailField(verbose_name="E-mail", blank=True)

    # Restaurant specifieke velden
    cuisine_type = models.CharField(
        max_length=100, verbose_name="Keukentype", blank=True
    )
    max_employees = models.PositiveIntegerField(
        default=50, verbose_name="Maximum werknemers"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, verbose_name="Actief")

    class Meta:
        verbose_name = "Bedrijf"
        verbose_name_plural = "Bedrijven"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.company_code})"


class User(AbstractUser):
    """Custom User model voor restaurant werknemers"""

    ROLE_CHOICES = [
        ("employee", "Werknemer"),
        ("shift_supervisor", "Ploegbaas"),
        ("manager", "Manager"),
        ("owner", "Eigenaar"),
    ]

    FUNCTION_CHOICES = [
        ("server", "Bediening"),
        ("kitchen", "Keuken"),
        ("bartender", "Barman/vrouw"),
        ("host", "Gastheer/vrouw"),
        ("cleaner", "Schoonmaak"),
        ("delivery", "Bezorger"),
        ("manager", "Manager"),
    ]

    # Basis gebruiker info
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, verbose_name="Bedrijf"
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default="employee", verbose_name="Rol"
    )
    function = models.CharField(
        max_length=20, choices=FUNCTION_CHOICES, verbose_name="Functie"
    )

    # Persoonlijke informatie
    phone = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$", message="Geldig telefoonnummer vereist"
            )
        ],
        verbose_name="Telefoonnummer",
    )
    birth_date = models.DateField(null=True, blank=True, verbose_name="Geboortedatum")

    # Werknemers specifiek
    employee_number = models.CharField(
        max_length=20, unique=True, verbose_name="Personeelsnummer"
    )
    hire_date = models.DateField(null=True, blank=True, verbose_name="Datum in dienst")
    hourly_rate = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True, verbose_name="Uurloon"
    )

    # Account status en verificatie
    is_approved = models.BooleanField(
        default=False, verbose_name="Goedgekeurd door manager"
    )
    approved_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_employees",
        verbose_name="Goedgekeurd door",
    )
    approved_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Goedgekeurd op"
    )

    # Verificatie tokens
    email_verified = models.BooleanField(
        default=False, verbose_name="E-mail geverifieerd"
    )
    email_verification_token = models.CharField(max_length=100, null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Gebruiker"
        verbose_name_plural = "Gebruikers"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.company.name})"

    def get_full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username

    @property
    def is_manager_or_above(self):
        """Check of gebruiker manager of hoger is"""
        return self.role in ["manager", "owner"]

    @property
    def can_approve_users(self):
        """Check of gebruiker nieuwe accounts kan goedkeuren"""
        return self.role in ["manager", "owner"] and self.is_approved

    def save(self, *args, **kwargs):
        # Genereer employee_number als deze nog niet bestaat
        if not self.employee_number:
            # Laatste nummer binnen bedrijf + 1
            last_number = User.objects.filter(
                company=self.company, employee_number__isnull=False
            ).count()
            self.employee_number = f"{self.company.company_code}-{last_number + 1:04d}"

        super().save(*args, **kwargs)


class RegistrationRequest(models.Model):
    """Model voor registratie verzoeken die goedkeuring nodig hebben"""

    STATUS_CHOICES = [
        ("pending", "In afwachting"),
        ("approved", "Goedgekeurd"),
        ("rejected", "Afgewezen"),
    ]

    # Basis registratie info
    email = models.EmailField(verbose_name="E-mailadres")
    first_name = models.CharField(max_length=150, verbose_name="Voornaam")
    last_name = models.CharField(max_length=150, verbose_name="Achternaam")
    phone = models.CharField(max_length=15, verbose_name="Telefoonnummer")
    function = models.CharField(
        max_length=20, choices=User.FUNCTION_CHOICES, verbose_name="Functie"
    )

    # Bedrijf info
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, verbose_name="Bedrijf"
    )
    company_code_entered = models.CharField(
        max_length=8, verbose_name="Ingevoerde bedrijfscode"
    )

    # Status tracking
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Status"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Aangevraagd op")

    # Goedkeuring/afwijzing
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Behandeld door",
    )
    reviewed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Behandeld op"
    )
    rejection_reason = models.TextField(blank=True, verbose_name="Reden afwijzing")

    # Verificatie
    verification_token = models.CharField(
        max_length=100, unique=True, verbose_name="Verificatie token"
    )
    email_verified = models.BooleanField(
        default=False, verbose_name="E-mail geverifieerd"
    )

    class Meta:
        verbose_name = "Registratie verzoek"
        verbose_name_plural = "Registratie verzoeken"
        ordering = ["-created_at"]
        unique_together = ["email", "company"]  # Voorkom dubbele aanvragen

    def __str__(self):
        return (
            f"{self.first_name} {self.last_name} - {self.company.name} ({self.status})"
        )
