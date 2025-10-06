from django.contrib.auth import get_user_model
User = get_user_model()
username = 'admin'
email = 'admin@example.com'
password = 'adminpass123'
user, created = User.objects.get_or_create(username=username)
if created:
    user.email = email
    user.is_staff = True
    user.is_superuser = True
    user.set_password(password)
    user.save()
    print(f"Superuser '{username}' created. Password: {password}")
else:
    # update to ensure superuser/staff and set password
    changed = False
    if user.email != email:
        user.email = email
        changed = True
    if not user.is_staff:
        user.is_staff = True
        changed = True
    if not user.is_superuser:
        user.is_superuser = True
        changed = True
    user.set_password(password)
    user.save()
    print(f"Superuser '{username}' updated (password reset).")
print('DONE')

"python manage.py createsuperuser"
"python manage.py loaddata"
"python manage.py cargar_datos"
"pip install -r requirements.txt"
