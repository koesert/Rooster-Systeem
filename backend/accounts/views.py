from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.request import Request
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import QuerySet
from typing import Any, Dict, Optional
import logging

from .models import Company, RegistrationRequest
from .serializers import (
    CompanyLookupSerializer,
    RegistrationRequestSerializer,
    RegistrationApprovalSerializer,
    UserProfileSerializer,
    PasswordChangeSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class CompanyLookupView(APIView):
    """API endpoint voor bedrijf opzoeken met bedrijfscode"""

    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        """Zoek bedrijf op basis van bedrijfscode"""
        serializer = CompanyLookupSerializer(data=request.data)

        if serializer.is_valid():
            company_code = serializer.validated_data["company_code"]

            try:
                company = Company.objects.get(company_code=company_code, is_active=True)

                return Response(
                    {
                        "success": True,
                        "company": {
                            "name": company.name,
                            "company_code": company.company_code,
                            "address": company.address,
                            "cuisine_type": company.cuisine_type,
                        },
                        "message": f"Bedrijf gevonden: {company.name}",
                    }
                )

            except Company.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": "Bedrijfscode niet gevonden. Controleer de code bij uw manager.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class RegistrationRequestView(APIView):
    """API endpoint voor registratie verzoek indienen"""

    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        """Dien registratie verzoek in"""
        serializer = RegistrationRequestSerializer(data=request.data)

        if serializer.is_valid():
            try:
                with transaction.atomic():
                    registration_request = serializer.save()

                    # Verstuur verificatie email
                    self._send_verification_email(registration_request)

                    # Notificeer managers
                    self._notify_managers(registration_request)

                    logger.info(
                        f"Registratie verzoek aangemaakt voor {registration_request.email}"
                    )

                    return Response(
                        {
                            "success": True,
                            "message": "Registratie verzoek verzonden! Controleer uw e-mail voor verificatie.",
                            "next_step": "email_verification",
                            "registration_id": str(registration_request.id),
                        },
                        status=status.HTTP_201_CREATED,
                    )

            except Exception as e:
                logger.error(f"Fout bij registratie: {str(e)}")
                return Response(
                    {
                        "success": False,
                        "message": "Er is een fout opgetreden. Probeer opnieuw.",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def _send_verification_email(
        self, registration_request: RegistrationRequest
    ) -> None:
        """Verstuur email verificatie"""
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{registration_request.verification_token}"

        subject = f"Bevestig uw registratie bij {registration_request.company.name}"
        message = f"""
        Hallo {registration_request.first_name},
        
        Bedankt voor uw registratie bij {registration_request.company.name}!
        
        Klik op de onderstaande link om uw e-mailadres te bevestigen:
        {verification_url}
        
        Na bevestiging zal uw manager uw account goedkeuren.
        
        Met vriendelijke groet,
        Het Roster Team
        """

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[registration_request.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Email verzenden mislukt: {str(e)}")

    def _notify_managers(self, registration_request: RegistrationRequest) -> None:
        """Notificeer managers van nieuw registratie verzoek"""
        managers = User.objects.filter(
            company=registration_request.company,
            role__in=["manager", "owner"],
            is_active=True,
            is_approved=True,
        )

        if managers.exists():
            subject = f"Nieuw registratie verzoek - {registration_request.company.name}"
            message = f"""
            Er is een nieuw registratie verzoek binnengekomen:
            
            Naam: {registration_request.first_name} {registration_request.last_name}
            E-mail: {registration_request.email}
            Functie: {registration_request.get_function_display()}
            Telefoon: {registration_request.phone}
            
            Log in op het systeem om dit verzoek te bekijken en goed te keuren.
            """

            manager_emails = [manager.email for manager in managers]

            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=manager_emails,
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Manager notificatie mislukt: {str(e)}")


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def verify_email(request: Request, token: str) -> Response:
    """Verificeer email adres met token"""
    try:
        registration_request = RegistrationRequest.objects.get(
            verification_token=token, status="pending"
        )

        registration_request.email_verified = True
        registration_request.save()

        return Response(
            {
                "success": True,
                "message": "E-mail succesvol geverifieerd! Uw manager zal uw account binnenkort goedkeuren.",
                "applicant_name": f"{registration_request.first_name} {registration_request.last_name}",
                "company_name": registration_request.company.name,
            }
        )

    except RegistrationRequest.DoesNotExist:
        return Response(
            {"success": False, "message": "Ongeldige of verlopen verificatie link."},
            status=status.HTTP_404_NOT_FOUND,
        )


class PendingRegistrationsView(generics.ListAPIView):
    """API endpoint voor managers om pending registraties te bekijken"""

    serializer_class = RegistrationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[RegistrationRequest]:
        user = self.request.user

        # Type guard voor custom user attributes
        if not hasattr(user, "can_approve_users") or not user.can_approve_users:
            return RegistrationRequest.objects.none()

        if not hasattr(user, "company"):
            return RegistrationRequest.objects.none()

        return RegistrationRequest.objects.filter(
            company=user.company, status="pending", email_verified=True
        ).order_by("-created_at")


class ApproveRegistrationView(APIView):
    """API endpoint voor manager goedkeuring van registraties"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request, registration_id: str) -> Response:
        """Keur registratie goed of af"""
        # Type guard en permission check
        if (
            not hasattr(request.user, "can_approve_users")
            or not request.user.can_approve_users
        ):
            return Response(
                {
                    "success": False,
                    "message": "U heeft geen toestemming om registraties goed te keuren.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not hasattr(request.user, "company"):
            return Response(
                {
                    "success": False,
                    "message": "Gebruiker heeft geen bedrijf toegewezen.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Haal registratie op
        registration_request = get_object_or_404(
            RegistrationRequest,
            id=registration_id,
            company=request.user.company,
            status="pending",
            email_verified=True,
        )

        serializer = RegistrationApprovalSerializer(data=request.data)

        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Update registratie status
                    request_status = serializer.validated_data["status"]
                    registration_request.status = request_status
                    registration_request.reviewed_by = request.user
                    registration_request.reviewed_at = timezone.now()

                    if request_status == "rejected":
                        rejection_reason = serializer.validated_data.get(
                            "rejection_reason", ""
                        )
                        registration_request.rejection_reason = rejection_reason
                        registration_request.save()

                        # Verstuur afwijzing email
                        self._send_rejection_email(registration_request)

                        return Response(
                            {
                                "success": True,
                                "message": f"Registratie van {registration_request.first_name} {registration_request.last_name} afgewezen.",
                            }
                        )

                    elif request_status == "approved":
                        registration_request.save()

                        # Maak User account aan
                        user = self._create_user_account(
                            registration_request, request.user
                        )

                        # Verstuur welkom email
                        self._send_welcome_email(user, registration_request)

                        return Response(
                            {
                                "success": True,
                                "message": f"Registratie van {registration_request.first_name} {registration_request.last_name} goedgekeurd! Account aangemaakt.",
                                "new_user_id": user.id if hasattr(user, "id") else None,
                                "employee_number": (
                                    user.employee_number
                                    if hasattr(user, "employee_number")
                                    else None
                                ),
                            }
                        )

            except Exception as e:
                logger.error(f"Fout bij goedkeuring: {str(e)}")
                return Response(
                    {
                        "success": False,
                        "message": "Er is een fout opgetreden bij het verwerken.",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def _create_user_account(
        self, registration_request: RegistrationRequest, approver: Any
    ) -> Any:
        """Maak User account aan na goedkeuring"""
        # Automatische rol toewijzing op basis van functie
        role_mapping = {
            "server": "employee",
            "kitchen": "employee",
            "bartender": "employee",
            "host": "employee",
            "cleaner": "employee",
            "delivery": "employee",
            "manager": "manager",
        }

        role = role_mapping.get(registration_request.function, "employee")

        # Genereer username (voornaam.achternaam of variatie)
        base_username = f"{registration_request.first_name.lower()}.{registration_request.last_name.lower()}"
        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Maak user aan
        temp_password = getattr(
            registration_request, "_temp_password", "TempPassword123!"
        )

        user = User.objects.create_user(
            username=username,
            email=registration_request.email,
            first_name=registration_request.first_name,
            last_name=registration_request.last_name,
            phone=registration_request.phone,
            company=registration_request.company,
            role=role,
            function=registration_request.function,
            password=temp_password,
            is_approved=True,
            approved_by=approver,
            approved_at=timezone.now(),
            email_verified=True,
            hire_date=timezone.now().date(),
        )

        logger.info(
            f"User account aangemaakt: {user.username} ({getattr(user, 'employee_number', 'N/A')})"
        )
        return user

    def _send_rejection_email(self, registration_request: RegistrationRequest) -> None:
        """Verstuur afwijzing email"""
        subject = f"Registratie afgewezen - {registration_request.company.name}"
        message = f"""
        Hallo {registration_request.first_name},
        
        Helaas kunnen we uw registratie voor {registration_request.company.name} niet goedkeuren.
        
        Reden: {registration_request.rejection_reason}
        
        Neem contact op met uw manager voor meer informatie.
        
        Met vriendelijke groet,
        Het Roster Team
        """

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[registration_request.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Afwijzing email mislukt: {str(e)}")

    def _send_welcome_email(
        self, user: Any, registration_request: RegistrationRequest
    ) -> None:
        """Verstuur welkom email met inlog gegevens"""
        subject = f"Welkom bij {user.company.name} - Account klaar!"
        message = f"""
        Welkom {user.first_name}!
        
        Uw account voor {user.company.name} is aangemaakt en goedgekeurd.
        
        Inloggegevens:
        - Gebruikersnaam: {user.username}
        - Personeelsnummer: {getattr(user, 'employee_number', 'N/A')}
        - Functie: {user.get_function_display() if hasattr(user, 'get_function_display') else 'N/A'}
        
        U kunt nu inloggen op het rooster systeem.
        Wijzig uw wachtwoord na de eerste keer inloggen.
        
        Veel succes en welkom in het team!
        """

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Welkom email mislukt: {str(e)}")


class UserProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint voor gebruiker profiel"""

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> Any:
        return self.request.user
