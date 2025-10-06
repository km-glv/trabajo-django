// nav.js - marca el enlace activo en la barra de navegación
(function(){
  const links = document.querySelectorAll('.topnav .nav-link');
  const current = location.pathname.split('/').pop() || 'index.html';
  links.forEach(a=>{
    // normalizar ruta
    const href = a.getAttribute('href').split('/').pop();
    if(href === current){
      a.classList.add('active');
      // mantener blanco
    }
  });
})();
