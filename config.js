// Conexión pública a Supabase (solo lectura para visitantes; la escritura
// está protegida por login + políticas RLS). Esta llave es pública por diseño.
window.SITE_CONFIG = {
  supabaseUrl: "https://ijavxodziuvnoairqvfu.supabase.co",
  supabaseKey: "sb_publishable_aI_YdNYPBR2YKoY5kAbwXA_7Jr3_CWN",
  tabla: "landing_contenido",
  bucket: "landing-fotos"
};
