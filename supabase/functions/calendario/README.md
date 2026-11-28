# Calendario de disponibilidad (Supabase Edge Function)

Muestra en el sitio los días ocupados del Depto 505. Junta:

- los calendarios iCal de Airbnb y Booking (links pegados en /admin, tabla `calendario_fuentes`), que se releen cada 20 min cuando alguien abre la página;
- los bloqueos manuales hechos desde /admin (tabla `calendario_bloqueos`, `origen = 'manual'`).

El público solo recibe rangos de fechas (sin notas, sin links ni datos de huéspedes). Las tablas solo las puede leer y editar el correo de `landing_admins`.

## Activarlo

1. Aplicar `supabase/migrations/20261128_calendario_disponibilidad.sql` en el proyecto `arriendos`.
2. Desplegar la función sin verificación JWT (el `?forzar=1` revisa la sesión del admin por su cuenta):

```
supabase functions deploy calendario --no-verify-jwt --project-ref ijavxodziuvnoairqvfu
```

3. En /admin → "Calendario de disponibilidad", pegar el link iCal de Airbnb (y el de Booking si quieres). Apenas haya un link o un bloqueo manual, la sección "Disponibilidad" aparece en el sitio.
