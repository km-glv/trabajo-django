// ui-modal.js - pequeño componente modal Promise-based
(function(global){
  function createModal(){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    const modal = document.createElement('div');
    modal.className = 'modal hidden';

    modal.innerHTML = `
      <div class="modal-header">
        <h3 id="modal-title"></h3>
        <button id="modal-close" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div id="modal-message"></div>
        <div style="margin-top:12px;text-align:right">
          <button id="modal-cancel" class="btn btn-secondary">Cancelar</button>
          <button id="modal-confirm" class="btn btn-primary">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    return {overlay, modal};
  }

  const nodes = createModal();
  const overlay = nodes.overlay;
  const modal = nodes.modal;
  const titleEl = modal.querySelector('#modal-title');
  const msgEl = modal.querySelector('#modal-message');
  const btnClose = modal.querySelector('#modal-close');
  const btnCancel = modal.querySelector('#modal-cancel');
  const btnConfirm = modal.querySelector('#modal-confirm');

  function show(options){
    return new Promise(resolve=>{
      titleEl.textContent = options.title || '';
      msgEl.innerHTML = options.message || '';
      btnConfirm.textContent = options.confirmText || 'OK';
      btnCancel.textContent = options.cancelText || 'Cancelar';

      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');

      function cleanup(){
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
        btnConfirm.removeEventListener('click', onConfirm);
        btnCancel.removeEventListener('click', onCancel);
        btnClose.removeEventListener('click', onCancel);
      }

      function onConfirm(){ cleanup(); resolve(true); }
      function onCancel(){ cleanup(); resolve(false); }

      btnConfirm.addEventListener('click', onConfirm);
      btnCancel.addEventListener('click', onCancel);
      btnClose.addEventListener('click', onCancel);

      // allow clicking overlay to cancel
      function onOverlayClick(e){ if(e.target===overlay){ onCancel(); } }
      overlay.addEventListener('click', onOverlayClick, {once:true});
    });
  }

  function alert(message, title){
    return show({title: title||'Aviso', message: String(message), confirmText: 'OK', cancelText: ''})
      .then(()=>{});
  }

  function confirm(message, title){
    return show({title: title||'Confirmar', message: String(message), confirmText: 'Sí', cancelText: 'No'});
  }

  global.UI_MODAL = { alert, confirm };
})(window);
