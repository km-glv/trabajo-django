from django.db import models
from django.contrib.auth.models import User

class Profesional(models.Model):
    nombre = models.CharField(max_length=100)
    especialidad = models.CharField(max_length=100)
    disponible = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.nombre} - {self.especialidad}"

class Reserva(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    profesional = models.ForeignKey(Profesional, on_delete=models.CASCADE)
    fecha = models.DateTimeField()
    estado = models.CharField(max_length=20, default='activa')
    
    def __str__(self):
        return f"Reserva de {self.usuario.username} con {self.profesional.nombre}"
