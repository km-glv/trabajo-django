from django.contrib import admin
from .models import Profesional, Reserva

@admin.register(Profesional)
class ProfesionalAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'especialidad', 'disponible']
    list_filter = ['especialidad', 'disponible']

@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'profesional', 'fecha', 'estado']
    list_filter = ['estado', 'fecha']
