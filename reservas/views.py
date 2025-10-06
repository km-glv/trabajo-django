from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.db import transaction
import json
from .models import Profesional, Reserva

def home(request):
    return render(request, 'home.html')

def login_view(request):
    errors = {}
    context = {}
    if request.method == 'POST':
        username_or_email = request.POST.get('username')
        password = request.POST.get('password')
        context['username'] = username_or_email

        if not username_or_email:
            errors['username'] = 'Introduce tu usuario o email'
        if not password:
            errors['password'] = 'Introduce tu contraseña'

        if not errors:
            # soportar login por username o por email
            user = authenticate(request, username=username_or_email, password=password)
            if user is None:
                # intentar buscar por email
                try:
                    user_obj = User.objects.filter(email__iexact=username_or_email).first()
                    if user_obj:
                        user = authenticate(request, username=user_obj.username, password=password)
                except Exception:
                    user = None

            if user is not None:
                login(request, user)
                return redirect('home')
            else:
                # Credenciales inválidas: mostrar un único mensaje no ligado a un campo
                errors['non_field'] = 'credenciales incorrectes'

    context['errors'] = errors
    return render(request, 'login.html', context)

def register_view(request):
    errors = {}
    context = {}
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email')
        context['username'] = username
        context['email'] = email

        # Validaciones simples: campos requeridos
        if not username:
            errors['username'] = 'Introduce un nombre de usuario'
        if not email:
            errors['email'] = 'Introduce un email'
        if not password:
            errors['password'] = 'Introduce una contraseña'

        # Validación unicidad: que no se repitan usuarios ni emails
        if username and User.objects.filter(username__iexact=username).exists():
            errors['username'] = 'El nombre de usuario ya existe'
        if email and User.objects.filter(email__iexact=email).exists():
            errors['email'] = 'El email ya está registrado'

        if not errors:
            # Aceptar cualquier contraseña (sin reglas adicionales)
            user = User.objects.create_user(username=username, password=password, email=email)
            login(request, user)
            return redirect('home')

    context['errors'] = errors
    return render(request, 'register.html', context)

def logout_view(request):
    logout(request)
    return redirect('home')

@login_required
def profesionales(request):
    profesionales = Profesional.objects.filter(disponible=True)
    return render(request, 'profesionales.html', {'profesionales': profesionales})

@login_required
def reservar(request):
    if request.method == 'POST':
        profesional_id = request.POST.get('profesional_id')
        fecha_str = request.POST.get('fecha')
        
        if profesional_id and fecha_str:
            try:
                profesional = Profesional.objects.get(id=profesional_id)
                from datetime import datetime
                # Convertir string a datetime
                fecha = datetime.fromisoformat(fecha_str)
                # Server-side check to avoid double-booking: if a Reserva exists for this profesional and exact fecha, refuse
                with transaction.atomic():
                    exists = Reserva.objects.filter(profesional=profesional, fecha=fecha).exists()
                    if exists:
                        messages.error(request, 'La franja horaria ya está ocupada para ese profesional. Por favor elige otra.')
                        return redirect('reservar')
                    Reserva.objects.create(usuario=request.user, profesional=profesional, fecha=fecha)
                    messages.success(request, 'Reserva creada correctamente.')
                    return redirect('mis_reservas')
            except (Profesional.DoesNotExist, ValueError) as e:
                print(f"Error: {e}")
    
    profesionales = Profesional.objects.filter(disponible=True)
    
    # Obtener todas las reservas para mostrar como debug
    todas_reservas = Reserva.objects.all()
    reservations_data = {}
    for reserva in todas_reservas:
        # only weekdays
        if reserva.fecha.weekday() < 5:
            hora_inicio = reserva.fecha.strftime('%H:%M')
            from datetime import timedelta
            fecha_fin = reserva.fecha + timedelta(minutes=45)
            hora_fin = fecha_fin.strftime('%H:%M')
            slot = f"{hora_inicio} - {hora_fin}"
            # use ISO date and profesional id
            date_iso = reserva.fecha.date().isoformat()
            key = f"{date_iso}|{slot}|{reserva.profesional.id}"
            reservations_data[key] = {
                'name': reserva.usuario.get_full_name() or reserva.usuario.username,
                'email': reserva.usuario.email,
                'professional': reserva.profesional.nombre,
                'professional_id': reserva.profesional.id,
                'date': date_iso,
                'slot': slot,
                'fecha': reserva.fecha.isoformat()
            }
    
    context = {
        'profesionales': profesionales,
        'reservations_json': json.dumps(reservations_data, indent=2)
    }
    return render(request, 'reservar.html', context)

@login_required
def mis_reservas(request):
    reservas = Reserva.objects.filter(usuario=request.user)
    
    # Preparar datos para el JavaScript del calendario
    reservations_data = {}
    for reserva in reservas:
        # Convertir fecha a formato día de semana (weekday() devuelve 0=Monday, 6=Sunday)
        # Only include weekdays
        if reserva.fecha.weekday() < 5:
            hora_inicio = reserva.fecha.strftime('%H:%M')
            from datetime import timedelta
            fecha_fin = reserva.fecha + timedelta(minutes=45)
            hora_fin = fecha_fin.strftime('%H:%M')
            slot = f"{hora_inicio} - {hora_fin}"
            date_iso = reserva.fecha.date().isoformat()
            key = f"{date_iso}|{slot}|{reserva.profesional.id}"
            reservations_data[key] = {
                'id': reserva.id,
                'name': request.user.get_full_name() or request.user.username,
                'email': request.user.email,
                'professional': reserva.profesional.nombre,
                'professional_id': reserva.profesional.id,
                'day': date_iso,
                'date': date_iso,
                'slot': slot,
                'notes': '',
                'createdAt': reserva.fecha.isoformat(),
                'owned': True
            }
    
    context = {
        'reservas': reservas,
        'reservations_json': json.dumps(reservations_data)
    }
    return render(request, 'mis_reservas.html', context)


@login_required
def reservas_map(request):
    """Devuelve un mapa JSON con las reservas actuales para el calendario.
    La estructura es: { 'Dia|slot|Profesional': { ... } }
    """
    todas_reservas = Reserva.objects.all()
    reservations_data = {}
    from datetime import timedelta
    dias_nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    for reserva in todas_reservas:
        if reserva.fecha.weekday() < 5:
            hora_inicio = reserva.fecha.strftime('%H:%M')
            fecha_fin = reserva.fecha + timedelta(minutes=45)
            hora_fin = fecha_fin.strftime('%H:%M')
            slot = f"{hora_inicio} - {hora_fin}"
            date_iso = reserva.fecha.date().isoformat()
            key = f"{date_iso}|{slot}|{reserva.profesional.id}"
            reservations_data[key] = {
                'id': reserva.id,
                'name': reserva.usuario.get_full_name() or reserva.usuario.username,
                'email': reserva.usuario.email,
                'professional': reserva.profesional.nombre,
                'professional_id': reserva.profesional.id,
                'date': date_iso,
                'day': date_iso,
                'slot': slot,
                'fecha': reserva.fecha.isoformat(),
                'createdAt': reserva.fecha.isoformat(),
                'owned': (request.user.is_authenticated and reserva.usuario == request.user)
            }
    return JsonResponse(reservations_data)


@login_required
def delete_reserva(request, reserva_id):
    """Eliminar una reserva por su id. Solo el propietario o staff puede eliminar.
    Endpoint espera POST y devuelve JSON { ok: true } o { ok: false, error: '...' }
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'error': 'Método no permitido'}, status=405)

    try:
        reserva = Reserva.objects.get(id=reserva_id)
    except Reserva.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Reserva no encontrada'}, status=404)

    # Permitir eliminar solo si es el propietario o un staff
    if not (reserva.usuario == request.user or request.user.is_staff):
        return JsonResponse({'ok': False, 'error': 'No tienes permiso para eliminar esta reserva'}, status=403)

    # Eliminar dentro de transacción
    from django.db import transaction
    with transaction.atomic():
        reserva.delete()

    return JsonResponse({'ok': True})
