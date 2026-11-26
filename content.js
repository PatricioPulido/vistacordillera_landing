// ─────────────────────────────────────────────────────────────
//  Vista Cordillera 505 — contenido editable del sitio
//  Aquí están las fotos, la nota, las reseñas y los datos del aviso.
//  Si cambias algo, guarda el archivo y la página se actualiza sola.
// ─────────────────────────────────────────────────────────────
window.SITE_CONTENT = {
  // Banda opcional arriba del sitio (déjala vacía "" para ocultarla)
  aviso: "",

  // Portada (lo primero que se ve). Lo que pongas entre *asteriscos* sale destacado en dorado.
  titulo: "Tu casa en Santiago, con la *cordillera* de fondo.",
  bajada: "Departamento completo en el Edificio O2 de Estación Central: balcón, aire acondicionado, wifi rápido y el Metro Línea 1 a pasos de tu puerta.",
  portada: "img/habitacion.jpg",

  // Datos del aviso de Airbnb
  rating: "4,9",
  reviews: 86,
  huespedes: 3,
  dormitorios: 1,
  camas: 2,
  banos: 1,

  // WhatsApp de contacto (el de Patricio, anfitrión principal)
  whatsapp: "56963008006",
  airbnb: "https://www.airbnb.com/h/vistacordillera-santiago-chile",
  booking: "https://www.booking.com/Share-9G10Ls",

  // Anfitriones: el primero es el contacto principal (al que le llega el WhatsApp).
  // "foto" puede quedar vacía: se muestra la inicial del nombre.
  // "whatsapp" (con 56) es opcional: si lo tiene, su tarjeta muestra un botón para escribirle.
  // El del primero es siempre el WhatsApp de contacto de más abajo.
  anfitriones: [
    { nombre: "Patricio", rol: "Anfitrión", foto: "", texto: "Coordino tu reserva, la llegada y cualquier duda directo por WhatsApp, sin call center. Si necesitas algo durante la estadía, escríbeme." },
    { nombre: "Alejandra", rol: "Coanfitriona", foto: "", texto: "Me encargo de que el depto esté impecable y listo para tu llegada. Muchos huéspedes me conocen por las reseñas de Airbnb.", whatsapp: "56992366502" }
  ],

  // Asistente con IA: datos extra que el asistente puede contarle a los huéspedes
  // (horarios de check-in/out, reglas, estacionamiento, etc.). Es información PÚBLICA:
  // no pongas aquí códigos de acceso ni claves de wifi.
  asistente_info: "",

  // Galería: la primera foto es la grande. Puedes agregar, quitar o reordenar.
  fotos: [
    { src: "img/habitacion.jpg", texto: "Dormitorio con ventanal de piso a cielo" },
    { src: "img/balcon.jpeg", texto: "Balcón con vista a la ciudad" },
    { src: "img/tv.jpeg", texto: "Living con Smart TV y sofá cama" },
    { src: "img/cocina.jpeg", texto: "Cocina completamente equipada" },
    { src: "img/comedor.jpeg", texto: "Rincón para comer o trabajar" },
    { src: "img/habitacion_desde_valcon.jpeg", texto: "Dormitorio visto desde el balcón" },
    { src: "img/cocina2.jpeg", texto: "Cubierta de cuarzo y vajilla completa" },
    { src: "img/silloncama.jpeg", texto: "Sofá cama para un tercer huésped" },
    { src: "img/ducha.jpeg", texto: "Baño con agua caliente y amenities" },
    { src: "img/saladeestar.jpeg", texto: "Sala de estar del edificio" },
    { src: "img/patio.jpeg", texto: "Patio interior con jardín vertical" },
    { src: "img/entrada.jpeg", texto: "Acceso verde del Edificio O2" },
    { src: "img/edificio.jpeg", texto: "Edificio O2, conserjería 24 h" },
    { src: "img/lavanderia.jpeg", texto: "Lavandería en el edificio" },
    { src: "img/utensilios.jpeg", texto: "Ollas y sartenes" },
    { src: "img/juguera.jpeg", texto: "Juguera, hervidor y prensa francesa" }
  ],

  resenas: [
    { texto: "Todo muy bello, limpio y decorado precioso. Está ubicado cerca del metro, que es un plus, y está rodeado de negocios. Además frío no pasarás porque tienen un aire acondicionado que no traiciona.", nombre: "Sofía", lugar: "" },
    { texto: "El lugar es tal cual como se muestra en las fotos: muy limpio, cómodo y completamente equipado. Buena vista, calefacción, Smart TV y wifi funcionando sin problemas. Totalmente recomendable.", nombre: "Roberto", lugar: "" },
    { texto: "Excelente ubicación, apartamento impecable. Con champú, acondicionador, secador de pelo, plancha, tés, café y todos los utensilios de cocina. Gracias por la flexibilidad.", nombre: "Suzane", lugar: "" },
    { texto: "Apartamento sumamente cómodo y con todo lo necesario para pasar una excelente estadía en Santiago. Alejandra siempre muy amable y atenta. Recomiendo al 100 %.", nombre: "Albert", lugar: "Lima, Perú" },
    { texto: "Muy limpio, cómodo y bien equipado, tal como se muestra en las fotos. Buena ubicación y la comunicación con Alejandra fue rápida y súper amable.", nombre: "Fabiola", lugar: "Santiago, Chile" },
    { texto: "Depto hermoso y la anfitriona muy considerada y flexible con nuestro horario de salida. Con mi pareja nos volveríamos a quedar acá nuevamente 😁", nombre: "Juan Francisco", lugar: "Río de Janeiro, Brasil" }
  ]
};
