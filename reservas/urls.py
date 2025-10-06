from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('profesionales/', views.profesionales, name='profesionales'),
    path('reservar/', views.reservar, name='reservar'),
    path('mis-reservas/', views.mis_reservas, name='mis_reservas'),
    path('reservas/map/', views.reservas_map, name='reservas_map'),
    path('reservas/delete/<int:reserva_id>/', views.delete_reserva, name='delete_reserva'),
]