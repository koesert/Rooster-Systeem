from django.core.management.base import BaseCommand, CommandParser
from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.models import Company
from typing import Any

User = get_user_model()

class Command(BaseCommand):
    help = 'Maak test company en gebruikers aan voor development'

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Verwijder bestaande test data eerst',
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if options['reset']:
            self.stdout.write('Verwijder bestaande test data...')
            Company.objects.filter(name__icontains='Jill Sushi').delete()
            User.objects.filter(username__in=['admin', 'manager.jill', 'test.werknemer']).delete()

        # Maak test company aan
        company, created = Company.objects.get_or_create(
            company_code='JILL01',
            defaults={
                'name': 'Jill Sushi Wok & Grill',
                'address': 'Hoofdstraat 123, 1234 AB Amsterdam',
                'phone': '020-1234567',
                'email': 'info@jillsushi.nl',
                'cuisine_type': 'Aziatisch',
                'max_employees': 30,
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Company aangemaakt: {company.name} ({company.company_code})')
            )
        else:
            self.stdout.write(f'• Company bestaat al: {company.name}')

        # Maak superuser aan
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@jillsushi.nl',
                password='admin123',
                first_name='Admin',
                last_name='User',
                company=company,
                role='owner',
                function='manager',
                phone='+31612345678',
                is_approved=True,
                email_verified=True
            )
            self.stdout.write(
                self.style.SUCCESS('✓ Superuser aangemaakt: admin / admin123')
            )
        else:
            self.stdout.write('• Superuser bestaat al')

        # Maak test manager aan
        if not User.objects.filter(username='manager.jill').exists():
            manager_user = User.objects.create_user(
                username='manager.jill',
                email='manager@jillsushi.nl',
                password='manager123',
                first_name='Jill',
                last_name='Manager',
                company=company,
                role='manager',
                function='manager',
                phone='+31612345679',
                is_approved=True,
                email_verified=True
            )
            self.stdout.write(
                self.style.SUCCESS('✓ Manager aangemaakt: manager.jill / manager123')
            )
        else:
            self.stdout.write('• Manager bestaat al')

        # Maak test werknemer aan
        if not User.objects.filter(username='test.werknemer').exists():
            employee_user = User.objects.create_user(
                username='test.werknemer',
                email='werknemer@jillsushi.nl',
                password='werknemer123',
                first_name='Test',
                last_name='Werknemer',
                company=company,
                role='employee',
                function='server',
                phone='+31612345680',
                is_approved=True,
                email_verified=True
            )
            self.stdout.write(
                self.style.SUCCESS('✓ Werknemer aangemaakt: test.werknemer / werknemer123')
            )
        else:
            self.stdout.write('• Test werknemer bestaat al')

        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('TEST DATA KLAAR!'))
        self.stdout.write('='*50)
        self.stdout.write('🏢 Bedrijf: Jill Sushi Wok & Grill')
        self.stdout.write('🔑 Bedrijfscode: JILL01')
        self.stdout.write('')
        self.stdout.write('👤 Login gegevens:')
        self.stdout.write('   Admin:    admin / admin123')
        self.stdout.write('   Manager:  manager.jill / manager123') 
        self.stdout.write('   Werknemer: test.werknemer / werknemer123')
        self.stdout.write('')
        self.stdout.write('🌐 Django Admin: http://127.0.0.1:8000/admin/')
        self.stdout.write('🔗 API Base:     http://127.0.0.1:8000/api/')
        self.stdout.write('')
        self.stdout.write('📝 Test registratie:')
        self.stdout.write('   1. Ga naar API endpoint: /api/auth/lookup-company/')
        self.stdout.write('   2. Gebruik bedrijfscode: JILL01')
        self.stdout.write('   3. Doorloop registratie workflow')
        self.stdout.write('='*50)