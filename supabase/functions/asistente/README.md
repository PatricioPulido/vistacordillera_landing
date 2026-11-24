# Asistente con IA (Supabase Edge Function)

Responde preguntas de huéspedes con la info del depto (texto fijo en `index.ts`
más lo que se guarda en el panel /admin: anfitriones, datos del aviso y "Asistente con IA").

## Activarlo

1. Crear una API key en https://platform.claude.com (Settings > API keys).
2. En Supabase (proyecto `arriendos`) > Edge Functions > Secrets, agregar `ANTHROPIC_API_KEY`.
3. Desplegar la función con verificación JWT desactivada (la función limita origen y frecuencia por su cuenta):

```
supabase functions deploy asistente --no-verify-jwt --project-ref ijavxodziuvnoairqvfu
```

Usa Claude Opus 5.5 con esfuerzo bajo y respuestas cortas; límite de 20 preguntas cada 10 minutos por IP.
