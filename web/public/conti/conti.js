/* Conti, la mascota de HealthByte.
 *
 * Uso:
 *   <script src="conti/conti.js"></script>
 *   <hb-conti state="listening" style="width:160px"></hb-conti>
 *
 * Estados: idle · listening · processing · verified · error · paused
 * Cambiar de estado en vivo: el.setAttribute('state', 'verified')
 *
 * El cuerpo son las piezas del render original; la cara se dibuja encima en SVG
 * para que ojos y boca puedan cambiar.
 */
(() => {
  const BASE = new URL('.', document.currentScript.src).href;

  // Coordenadas de cada pieza en el render original (1254 × 1254 px)
  const P = {
    byte:   [792, 93, 175, 174],
    'hand-l': [90, 520, 317, 318],
    'hand-r': [845, 521, 319, 318],
    foot:   [457, 880, 343, 296],
    cap:    [447, 181, 361, 301],
    body:   [406, 479, 442, 408],
  };
  const img = (name, file = name) => {
    const [x, y, w, h] = P[name];
    return `<image href="${BASE}${file}.webp" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  };

  const CSS = `
  hb-conti{display:inline-block;width:200px;aspect-ratio:1114/1174;line-height:0;vertical-align:middle}
  hb-conti svg{width:100%;height:100%;overflow:visible}
  hb-conti g{transform-box:view-box}

  /* --- se levanta un poquito --- */
  hb-conti .fig{animation:hbc-float 3.6s ease-in-out infinite}
  @keyframes hbc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-26px)}}
  hb-conti .cap,hb-conti .hl,hb-conti .hr,hb-conti .ft{animation:hbc-drift 3.6s ease-in-out infinite}
  hb-conti .cap{animation-delay:-.25s}
  hb-conti .hl{animation-delay:-.6s}
  hb-conti .hr{animation-delay:-.95s}
  hb-conti .ft{animation-delay:-1.4s}
  @keyframes hbc-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}

  /* --- el byte flota a su ritmo --- */
  hb-conti .byte{animation:hbc-byte 2.8s ease-in-out infinite;transform-origin:880px 180px}
  @keyframes hbc-byte{0%,100%{transform:translate(0,0) rotate(0)}30%{transform:translate(6px,-38px) rotate(7deg)}62%{transform:translate(-4px,-14px) rotate(-4deg)}}
  hb-conti .b-red,hb-conti .b-grey{opacity:0;transition:opacity .35s}
  hb-conti .b-mint{transition:opacity .35s}

  /* --- cara --- */
  hb-conti .e,hb-conti .m{opacity:0;transition:opacity .18s}
  hb-conti .eyes{animation:hbc-blink 5.2s infinite;transform-origin:625px 680px}
  @keyframes hbc-blink{0%,94%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.08)}}

  hb-conti .wave rect{transform-box:fill-box;transform-origin:center;animation:hbc-wave .8s ease-in-out infinite}
  hb-conti .wave rect:nth-child(2){animation-delay:.1s}
  hb-conti .wave rect:nth-child(3){animation-delay:.2s}
  hb-conti .wave rect:nth-child(4){animation-delay:.3s}
  hb-conti .wave rect:nth-child(5){animation-delay:.4s}
  @keyframes hbc-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}

  hb-conti .dots circle{transform-box:fill-box;transform-origin:center;animation:hbc-dot 1.1s ease-in-out infinite}
  hb-conti .dots circle:nth-child(2){animation-delay:.15s}
  hb-conti .dots circle:nth-child(3){animation-delay:.3s}
  @keyframes hbc-dot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-9px);opacity:1}}

  /* --- estados: ojos --- */
  hb-conti:not([state]) .e-open,
  hb-conti[state="idle"] .e-open,
  hb-conti[state="listening"] .e-open{opacity:1}
  hb-conti[state="processing"] .e-up{opacity:1}
  hb-conti[state="verified"] .e-happy{opacity:1}
  hb-conti[state="error"] .e-x,hb-conti[state="alert"] .e-x{opacity:1}
  hb-conti[state="paused"] .e-closed{opacity:1}

  /* --- estados: boca --- */
  hb-conti:not([state]) .m-smile,
  hb-conti[state="idle"] .m-smile{opacity:1}
  hb-conti[state="listening"] .m-wave{opacity:1}
  hb-conti[state="processing"] .m-dots{opacity:1}
  hb-conti[state="verified"] .m-open{opacity:1}
  hb-conti[state="error"] .m-frown,hb-conti[state="alert"] .m-frown{opacity:1}
  hb-conti[state="paused"] .m-flat{opacity:1}

  /* --- estados: cuerpo y byte --- */
  hb-conti[state="listening"] .byte-in{animation:hbc-glow 1.6s ease-in-out infinite;transform-origin:880px 180px}
  @keyframes hbc-glow{0%,100%{transform:scale(1);filter:drop-shadow(0 0 0 rgba(47,181,150,0))}50%{transform:scale(1.07);filter:drop-shadow(0 0 22px rgba(47,181,150,.75))}}

  hb-conti[state="verified"] .hl{animation:hbc-cheer-l 1.8s ease-in-out infinite}
  hb-conti[state="verified"] .hr{animation:hbc-cheer-r 1.8s ease-in-out infinite}
  @keyframes hbc-cheer-l{0%,100%{transform:translate(0,0) rotate(0)}40%{transform:translate(-6px,-70px) rotate(-8deg)}}
  @keyframes hbc-cheer-r{0%,100%{transform:translate(0,0) rotate(0)}40%{transform:translate(6px,-70px) rotate(8deg)}}
  hb-conti[state="verified"] .hl{transform-origin:250px 680px}
  hb-conti[state="verified"] .hr{transform-origin:1005px 680px}

  hb-conti[state="error"] .b-mint,hb-conti[state="alert"] .b-mint{opacity:0}
  hb-conti[state="error"] .b-red,hb-conti[state="alert"] .b-red{opacity:1}
  hb-conti[state="error"] .shake,hb-conti[state="alert"] .shake{animation:hbc-shake 2.4s ease-in-out infinite}
  @keyframes hbc-shake{0%,62%,100%{transform:translateX(0)}66%{transform:translateX(-14px)}72%{transform:translateX(12px)}78%{transform:translateX(-8px)}84%{transform:translateX(4px)}}

  hb-conti[state="paused"] .b-mint{opacity:0}
  hb-conti[state="paused"] .b-grey{opacity:1}
  hb-conti[state="paused"] .fig,hb-conti[state="paused"] .cap,hb-conti[state="paused"] .hl,
  hb-conti[state="paused"] .hr,hb-conti[state="paused"] .ft,hb-conti[state="paused"] .byte{animation-duration:6.5s}
  hb-conti[state="asking"] .e-ask,hb-conti[state="confused"] .e-flat,
  hb-conti[state="celebrate"] .e-happy,hb-conti[state="greeting"] .e-happy{opacity:1}
  hb-conti[state="asking"] .m-o,hb-conti[state="confused"] .m-wavy,
  hb-conti[state="celebrate"] .m-open,hb-conti[state="greeting"] .m-smile{opacity:1}
  hb-conti[state="asking"] .hr{animation:none;transform:translate(10px,-90px) rotate(12deg);transform-origin:1005px 680px}
  hb-conti[state="confused"] .shake{transform:rotate(-6deg);transform-origin:627px 640px}
  hb-conti[state="confused"] .b-mint{opacity:0}
  hb-conti[state="confused"] .b-grey{opacity:1}
  hb-conti[state="celebrate"] .hl{animation:hbc-cheer-l 1.8s ease-in-out infinite;transform-origin:250px 680px}
  hb-conti[state="celebrate"] .hr{animation:hbc-cheer-r 1.8s ease-in-out infinite;transform-origin:1005px 680px}
  hb-conti[state="celebrate"] .byte-in{transform:scale(1.18);transform-origin:880px 180px}
  hb-conti[state="greeting"] .hl{animation:hbc-saludo 1.6s ease-in-out infinite;transform-origin:250px 680px}
  @keyframes hbc-saludo{0%,100%{transform:rotate(0)}25%{transform:translateY(-60px) rotate(-14deg)}75%{transform:translateY(-60px) rotate(8deg)}}
  hb-conti[calma] .fig{animation-name:hbc-float-calma}
  @keyframes hbc-float-calma{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}

  @media (prefers-reduced-motion:reduce){hb-conti *{animation:none!important}}
  `;

  let uid = 0;
  const svg = (id) => `
<svg viewBox="70 30 1114 1174" role="img" aria-label="Conti">
  <defs>
    <linearGradient id="ink${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000814"/><stop offset=".14" stop-color="#022642"/>
      <stop offset=".7" stop-color="#02233B"/><stop offset="1" stop-color="#22486A"/>
    </linearGradient>
    <linearGradient id="inkv${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B2E4A"/><stop offset=".5" stop-color="#02233B"/><stop offset="1" stop-color="#011A2E"/>
    </linearGradient>
    <filter id="sh${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/>
      <feOffset dx="-2" dy="2" result="b"/>
      <feFlood flood-color="#7FA9C2" flood-opacity=".55"/>
      <feComposite in2="b" operator="in" result="s"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="rim"/>
      <feFlood flood-color="#FFFFFF" flood-opacity=".85"/>
      <feComposite in2="rim" operator="in" result="r"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g class="shake">
    <g class="fig">
      <g class="ft">${img('foot')}</g>
      <g class="cap">${img('cap')}</g>
      <g class="hl">${img('hand-l')}</g>
      <g class="hr">${img('hand-r')}</g>
      <g class="bd">
        ${img('body')}
        <g filter="url(#sh${id})" fill="url(#ink${id})" stroke-linecap="round" stroke-linejoin="round">
          <g class="eyes">
            <g class="e e-open">
              <rect x="530" y="635" width="38" height="87" rx="19"/>
              <rect x="685" y="635" width="38" height="87" rx="19"/>
            </g>
            <g class="e e-up">
              <rect x="530" y="622" width="38" height="74" rx="19"/>
              <rect x="685" y="622" width="38" height="74" rx="19"/>
            </g>
            <g class="e e-ask">
              <rect x="530" y="635" width="38" height="87" rx="19"/>
              <rect x="687" y="648" width="34" height="66" rx="17"/>
            </g>
            <g class="e e-flat">
              <rect x="526" y="668" width="46" height="16" rx="8"/>
              <rect x="681" y="668" width="46" height="16" rx="8"/>
            </g>
          </g>
          <g class="e e-happy" fill="none" stroke="url(#inkv${id})" stroke-width="15">
            <path d="M528 694 Q549 648 570 694"/>
            <path d="M683 694 Q704 648 725 694"/>
          </g>
          <g class="e e-closed" fill="none" stroke="url(#inkv${id})" stroke-width="14">
            <path d="M531 672 Q549 700 567 672"/>
            <path d="M686 672 Q704 700 722 672"/>
          </g>
          <g class="e e-x" fill="none" stroke="url(#inkv${id})" stroke-width="16">
            <path d="M526 656 L572 706 M572 656 L526 706"/>
            <path d="M681 656 L727 706 M727 656 L681 706"/>
          </g>

          <path class="m m-smile" d="M604 723 Q626 733 648 723" fill="none" stroke="url(#inkv${id})" stroke-width="12"/>
          <path class="m m-open" d="M594 714 Q627 712 660 714 Q654 758 627 759 Q600 758 594 714 Z" fill="url(#inkv${id})"/>
          <path class="m m-frown" d="M602 737 Q627 715 652 737" fill="none" stroke="url(#inkv${id})" stroke-width="12"/>
          <path class="m m-flat" d="M612 728 L640 728" fill="none" stroke="url(#inkv${id})" stroke-width="11"/>
          <circle class="m m-o" cx="627" cy="735" r="15" fill="url(#inkv${id})"/>
          <path class="m m-wavy" d="M596 734 q10 -12 20 0 t20 0 t20 0" fill="none" stroke="url(#inkv${id})" stroke-width="11"/>
          <g class="m m-wave wave" fill="url(#inkv${id})">
            <rect x="589" y="717" width="12" height="22" rx="6"/>
            <rect x="606" y="707" width="12" height="42" rx="6"/>
            <rect x="623" y="699" width="12" height="58" rx="6"/>
            <rect x="640" y="707" width="12" height="42" rx="6"/>
            <rect x="657" y="717" width="12" height="22" rx="6"/>
          </g>
          <g class="m m-dots dots" fill="url(#inkv${id})">
            <circle cx="603" cy="730" r="9"/><circle cx="628" cy="730" r="9"/><circle cx="653" cy="730" r="9"/>
          </g>
        </g>
      </g>
    </g>
  </g>
  <g class="byte"><g class="byte-in">
    <g class="b-mint">${img('byte')}</g>
    <g class="b-red">${img('byte', 'byte-red')}</g>
    <g class="b-grey">${img('byte', 'byte-grey')}</g>
  </g></g>
</svg>`;

  if (!document.getElementById('hb-conti-css')) {
    const st = document.createElement('style');
    st.id = 'hb-conti-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  customElements.define('hb-conti', class extends HTMLElement {
    static observedAttributes = ['state'];
    attributeChangedCallback() { this._etiqueta(); }
    _etiqueta() {
      const nombres = { idle: 'atento', listening: 'escuchando', processing: 'procesando', asking: 'pregunta',
        verified: 'registrado', confused: 'no entendió', alert: 'alerta', error: 'alerta', paused: 'en pausa',
        celebrate: 'cierre seguro', greeting: 'saludando' };
      this.querySelector('svg')?.setAttribute('aria-label', `Conti: ${nombres[this.getAttribute('state')] ?? 'atento'}`);
    }
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this.innerHTML = svg(++uid);
      this._etiqueta();
    }
  });
})();
