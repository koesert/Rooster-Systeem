from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from typing import Dict, Any
import re
import uuid
from .models import Company, RegistrationRequest  # Fixed import

User = get_user_model()


class CompanyLookupSerializer(serializers.Serializer):
    """Serializer voor bedrijf opzoeken met bedrijfscode"""

    company_code = serializers.CharField(
        max_length=8, min_length=4, help_text="Voer de 4-8 karakter bedrijfscode in"
    )

    def validate_company_code(self, value: str) -> str:
        """Valideer of bedrijfscode bestaat en actief is"""
        try:
            Company.objects.get(company_code=value.upper(), is_active=True)
            return value.upper()
        except Company.DoesNotExist:
            raise serializers.ValidationError(
                "Bedrijfscode niet gevonden. Controleer de code en probeer opnieuw."
            )


class RegistrationRequestSerializer(serializers.ModelSerializer):
    """Serializer voor het aanmaken van registratie verzoeken"""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Minimaal 8 tekens met hoofdletters, kleine letters en cijfers",
    )
    password_confirm = serializers.CharField(write_only=True)
    company_code = serializers.CharField(max_length=8, write_only=True)

    class Meta:
        model = RegistrationRequest
        fields = [
            "email",
            "first_name",
            "last_name",
            "phone",
            "function",
            "company_code",
            "password",
            "password_confirm",
        ]
        extra_kwargs = {
            "email": {"help_text": "Uw werk e-mailadres"},
            "first_name": {"help_text": "Uw voornaam"},
            "last_name": {"help_text": "Uw achternaam"},
            "phone": {"help_text": "Uw telefoonnummer (bijv. 06-12345678)"},
            "function": {"help_text": "Selecteer uw functie in het restaurant"},
        }

    def validate_email(self, value: str) -> str:
        """Valideer email formaat en uniciteit"""
        # Check of email al bestaat als actieve gebruiker
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError(
                "Dit e-mailadres is al geregistreerd. Probeer in te loggen of neem contact op met uw manager."
            )
        return value.lower()

    def validate_phone(self, value: str) -> str:
        """Valideer telefoon formaat"""
        # Verwijder spaties en strepen
        cleaned_phone = re.sub(r"[\s-]", "", value)

        # Check Nederlandse mobiele nummers
        if not re.match(r"^(\+31|0031|0)6\d{8}$", cleaned_phone):
            raise serializers.ValidationError(
                "Voer een geldig Nederlands mobiel nummer in (bijv. 06-12345678)"
            )

        # Normaliseer naar +31 formaat
        if cleaned_phone.startswith("06"):
            return f"+31{cleaned_phone[1:]}"
        elif cleaned_phone.startswith("0031"):
            return f"+{cleaned_phone[2:]}"
        elif cleaned_phone.startswith("+31"):
            return cleaned_phone

        return value

    def validate_password(self, value: str) -> str:
        """Valideer wachtwoord complexiteit"""
        try:
            # Django's ingebouwde password validators
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)

        # Extra validaties voor restaurant context
        if len(value) < 8:
            raise serializers.ValidationError(
                "Wachtwoord moet minimaal 8 tekens lang zijn."
            )

        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError(
                "Wachtwoord moet minimaal één hoofdletter bevatten."
            )

        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError(
                "Wachtwoord moet minimaal één kleine letter bevatten."
            )

        if not re.search(r"\d", value):
            raise serializers.ValidationError(
                "Wachtwoord moet minimaal één cijfer bevatten."
            )

        return value

    def validate_company_code(self, value: str) -> str:
        """Valideer bedrijfscode"""
        try:
            Company.objects.get(company_code=value.upper(), is_active=True)
            return value.upper()
        except Company.DoesNotExist:
            raise serializers.ValidationError(
                "Ongeldige bedrijfscode. Vraag uw manager om de juiste code."
            )

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Cross-field validatie"""
        # Check wachtwoord bevestiging
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Wachtwoorden komen niet overeen."}
            )

        # Check of al een pending request bestaat voor dit email + bedrijf
        company = Company.objects.get(company_code=attrs["company_code"])
        existing_request = RegistrationRequest.objects.filter(
            email=attrs["email"], company=company, status="pending"
        ).exists()

        if existing_request:
            raise serializers.ValidationError(
                "Er is al een registratie verzoek in behandeling voor dit e-mailadres bij dit bedrijf."
            )

        return attrs

    def create(self, validated_data: Dict[str, Any]) -> RegistrationRequest:
        """Maak registratie verzoek aan"""
        # Haal company op
        company_code = validated_data.pop("company_code")
        company = Company.objects.get(company_code=company_code)

        # Verwijder password velden (worden apart opgeslagen)
        password = validated_data.pop("password")
        validated_data.pop("password_confirm")

        # Maak registratie verzoek
        registration_request = RegistrationRequest.objects.create(
            company=company,
            company_code_entered=company_code,
            verification_token=str(uuid.uuid4()),
            **validated_data,
        )

        # Sla wachtwoord tijdelijk op (in productie: gebruik geëncrypte opslag)
        setattr(registration_request, "_temp_password", password)

        return registration_request


class RegistrationApprovalSerializer(serializers.ModelSerializer):
    """Serializer voor manager goedkeuring van registraties"""

    class Meta:
        model = RegistrationRequest
        fields = ["status", "rejection_reason"]

    def validate_status(self, value: str) -> str:
        if value not in ["approved", "rejected"]:
            raise serializers.ValidationError(
                "Status moet 'approved' of 'rejected' zijn."
            )
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        if attrs.get("status") == "rejected" and not attrs.get("rejection_reason"):
            raise serializers.ValidationError(
                {"rejection_reason": "Reden voor afwijzing is verplicht."}
            )
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer voor gebruiker profiel weergave"""

    company_name = serializers.CharField(source="company.name", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    function_display = serializers.CharField(
        source="get_function_display", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "role_display",
            "function",
            "function_display",
            "employee_number",
            "company_name",
            "is_approved",
            "email_verified",
            "hire_date",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "username",
            "employee_number",
            "role",
            "is_approved",
            "email_verified",
            "created_at",
        ]


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer voor wachtwoord wijzigen"""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        """Valideer nieuw wachtwoord complexiteit"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Nieuwe wachtwoorden komen niet overeen."}
            )
        return attrs
