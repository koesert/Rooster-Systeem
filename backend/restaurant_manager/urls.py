"""restaurant_manager URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/employees/', include('employees.urls')), 
    path('api/schedules/', include('schedules.urls')),
    path('api/availability/', include('availability.urls')),
    path('api/shifts/', include('shifts.urls')),
    path('api/reports/', include('reports.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)