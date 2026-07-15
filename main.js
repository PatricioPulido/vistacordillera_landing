// Vista Cordillera — main.js
// Aquí va la lógica dinámica del landing (ej: Distance Matrix API de Google Maps
// para reemplazar los tiempos hardcodeados del tablero "Desde tu puerta").

document.addEventListener('DOMContentLoaded', () => {
  console.log('Vista Cordillera landing cargado.');

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }
});
