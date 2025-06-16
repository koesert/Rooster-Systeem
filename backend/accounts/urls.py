from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# URL patterns voor accounts app
urlpatterns = [
    # ===== REGISTRATIE WORKFLOW =====
    # Stap 1: Bedrijf opzoeken met bedrijfscode
    path("lookup-company/", views.CompanyLookupView.as_view(), name="lookup-company"),
    # Stap 2: Registratie verzoek indienen
    path("register/", views.RegistrationRequestView.as_view(), name="register"),
    # Stap 3: Email verificatie
    path("verify-email/<str:token>/", views.verify_email, name="verify-email"),
    # ===== MANAGER FUNCTIONALITEIT =====
    # Pending registraties bekijken (alleen managers)
    path(
        "pending-registrations/",
        views.PendingRegistrationsView.as_view(),
        name="pending-registrations",
    ),
    # Registratie goedkeuren/afwijzen (alleen managers)
    path(
        "approve-registration/<uuid:registration_id>/",
        views.ApproveRegistrationView.as_view(),
        name="approve-registration",
    ),
    # ===== GEBRUIKER PROFIEL =====
    # Eigen profiel bekijken en wijzigen
    path("profile/", views.UserProfileView.as_view(), name="user-profile"),
    # ===== AUTHENTICATION (later uit te breiden) =====
    # path('login/', views.LoginView.as_view(), name='login'),
    # path('logout/', views.LogoutView.as_view(), name='logout'),
    # path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
]

# API documentatie patterns (voor development)
urlpatterns += [
    # Swagger/OpenAPI documentatie kunnen we later toevoegen
]
