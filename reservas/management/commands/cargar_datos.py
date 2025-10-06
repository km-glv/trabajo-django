from django.core.management.base import BaseCommand
from reservas.models import Profesional

class Command(BaseCommand):
    help = 'Carga datos de prueba para profesionales'

    def handle(self, *args, **options):
        profesionales = [
            {'nombre': 'Dr. María González', 'especialidad': 'Psicología Clínica'},
            {'nombre': 'Dr. Carlos Ruiz', 'especialidad': 'Psicología Infantil'},
            {'nombre': 'Dra. Ana Martínez', 'especialidad': 'Terapia Familiar'},
            {'nombre': 'Dr. Luis Fernández', 'especialidad': 'Psicología Cognitiva'},
        ]
        
        for prof_data in profesionales:
            profesional, created = Profesional.objects.get_or_create(
                nombre=prof_data['nombre'],
                defaults={'especialidad': prof_data['especialidad'], 'disponible': True}
            )
            if created:
                self.stdout.write(f'Creado: {profesional.nombre}')
            else:
                self.stdout.write(f'Ya existe: {profesional.nombre}')
        
        self.stdout.write(self.style.SUCCESS('Datos de prueba cargados exitosamente'))