/* Conti, la mascota de HealthByte.
 *
 * Uso:
 *   <script src="conti/conti.js"></script>
 *   <hb-conti state="listening" style="width:160px"></hb-conti>
 *
 * Estados: idle · listening · processing · verified · error · paused
 * Cada estado cambia cara, postura, aura de color e insignia, para leerse de lejos.
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

  hb-conti[state="verified"] .hl{animation:hbc-cheer-l 1.8s ease-in-out infinite}
  hb-conti[state="verified"] .hr{animation:hbc-cheer-r 1.8s ease-in-out infinite}
  @keyframes hbc-cheer-l{0%,100%{transform:translate(0,0) rotate(0)}40%{transform:translate(-6px,-70px) rotate(-8deg)}}
  @keyframes hbc-cheer-r{0%,100%{transform:translate(0,0) rotate(0)}40%{transform:translate(6px,-70px) rotate(8deg)}}
  hb-conti[state="verified"] .hl{transform-origin:250px 680px}
  hb-conti[state="verified"] .hr{transform-origin:1005px 680px}

  hb-conti[state="error"] .b-mint,hb-conti[state="alert"] .b-mint{opacity:0}
  hb-conti[state="error"] .b-red,hb-conti[state="alert"] .b-red{opacity:1}
  hb-conti[state="error"] .shake,hb-conti[state="alert"] .shake{animation:hbc-shake 1.6s ease-in-out infinite}
  @keyframes hbc-shake{0%,50%,100%{transform:translateX(0)}56%{transform:translateX(-34px)}63%{transform:translateX(30px)}70%{transform:translateX(-22px)}77%{transform:translateX(12px)}}

  hb-conti[state="paused"] .b-mint{opacity:0}
  hb-conti[state="paused"] .b-grey{opacity:1}
  hb-conti[state="paused"] .fig,hb-conti[state="paused"] .cap,hb-conti[state="paused"] .hl,
  hb-conti[state="paused"] .hr,hb-conti[state="paused"] .ft,hb-conti[state="paused"] .byte{animation-duration:6.5s}
  hb-conti[state="paused"] .eyes{animation:none}

  /* --- señales que se leen de lejos: aura, insignia y postura --- */
  hb-conti{--hbc-c:transparent}
  hb-conti[state="listening"]{--hbc-c:#1E75A8}
  hb-conti[state="processing"]{--hbc-c:#8FA1AE}
  hb-conti[state="verified"]{--hbc-c:#0B6B5A}
  hb-conti[state="error"],hb-conti[state="alert"]{--hbc-c:#C8372D}
  hb-conti .aura{opacity:0;transition:opacity .4s;transform-origin:627px 640px;animation:hbc-aura 2s ease-in-out infinite}
  hb-conti[state="listening"] .aura,hb-conti[state="processing"] .aura,hb-conti[state="verified"] .aura,
  hb-conti[state="error"] .aura,hb-conti[state="alert"] .aura{opacity:1}
  @keyframes hbc-aura{0%,100%{transform:scale(.94)}50%{transform:scale(1.04)}}
  hb-conti[state="error"] .aura,hb-conti[state="alert"] .aura{animation-duration:.9s}

  hb-conti .badge{transform-origin:1040px 1050px;transform:scale(0);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
  hb-conti .badge>circle{fill:var(--hbc-b)}
  hb-conti .ic{display:none}
  hb-conti[state="listening"]{--hbc-b:#0B5D8C}
  hb-conti[state="processing"]{--hbc-b:#364856}
  hb-conti[state="verified"]{--hbc-b:#0B6B5A}
  hb-conti[state="error"],hb-conti[state="alert"]{--hbc-b:#C8372D}
  hb-conti[state="paused"]{--hbc-b:#6B7E8C}
  hb-conti[state="listening"] .badge,hb-conti[state="processing"] .badge,hb-conti[state="verified"] .badge,
  hb-conti[state="error"] .badge,hb-conti[state="alert"] .badge,hb-conti[state="paused"] .badge{transform:scale(1)}
  hb-conti[state="listening"] .ic-mic,hb-conti[state="processing"] .ic-spin,hb-conti[state="verified"] .ic-ok,
  hb-conti[state="error"] .ic-err,hb-conti[state="alert"] .ic-err,hb-conti[state="paused"] .ic-pause{display:inline}
  hb-conti .ic-spin{transform-origin:1040px 1050px;animation:hbc-spin .9s linear infinite}
  @keyframes hbc-spin{to{transform:rotate(360deg)}}

  /* escuchando: manos a los lados de la cara */
  hb-conti[state="listening"] .hl{animation:hbc-ear-l 1.4s ease-in-out infinite}
  hb-conti[state="listening"] .hr{animation:hbc-ear-r 1.4s ease-in-out infinite}
  @keyframes hbc-ear-l{0%,100%{transform:translate(38px,-110px) rotate(-14deg)}50%{transform:translate(44px,-122px) rotate(-17deg)}}
  @keyframes hbc-ear-r{0%,100%{transform:translate(-38px,-110px) rotate(14deg)}50%{transform:translate(-44px,-122px) rotate(17deg)}}
  hb-conti[state="listening"] .hl{transform-origin:250px 680px}
  hb-conti[state="listening"] .hr{transform-origin:1005px 680px}

  /* procesando: manos alternan como malabares */
  hb-conti[state="processing"] .hl{animation:hbc-jug .9s ease-in-out infinite}
  hb-conti[state="processing"] .hr{animation:hbc-jug .9s ease-in-out infinite;animation-delay:-.45s}
  @keyframes hbc-jug{0%,100%{transform:translateY(20px)}50%{transform:translateY(-90px)}}

  /* verificado: salta */
  hb-conti[state="verified"] .fig{animation:hbc-hop 1.8s cubic-bezier(.3,0,.3,1) infinite}
  @keyframes hbc-hop{0%,55%,100%{transform:translateY(0)}20%{transform:translateY(-95px)}35%{transform:translateY(8px)}}

  /* error: tiembla fuerte y ladea el gorro */
  hb-conti[state="error"] .cap,hb-conti[state="alert"] .cap{animation:none;transform:rotate(-9deg) translate(-10px,6px);transform-origin:627px 330px;transition:transform .3s}

  /* pausa: se hunde y se apaga */
  hb-conti[state="paused"] .shake{transform:translateY(40px) scale(.95);transform-origin:627px 700px;filter:saturate(.3) brightness(1.05);opacity:.75;transition:transform .5s,filter .5s,opacity .5s}
  hb-conti .shake{transition:transform .5s,filter .5s,opacity .5s}

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
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="rim"/>
      <feFlood flood-color="#FFFFFF" flood-opacity=".55"/>
      <feComposite in2="rim" operator="in" result="r"/>
      <feMerge><feMergeNode in="s"/><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="au${id}">
      <stop offset=".35" style="stop-color:var(--hbc-c);stop-opacity:.42"/>
      <stop offset="1" style="stop-color:var(--hbc-c);stop-opacity:0"/>
    </radialGradient>
  </defs>
  <circle class="aura" cx="627" cy="640" r="600" fill="url(#au${id})"/>

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
  <g class="badge">
    <circle cx="1040" cy="1050" r="112" stroke="#FFFFFF" stroke-width="16"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
      <g class="ic ic-mic"><rect x="1016" y="982" width="48" height="80" rx="24" fill="#FFFFFF" stroke="none"/><path d="M990 1040 a50 50 0 0 0 100 0 M1040 1092 v22"/></g>
      <path class="ic ic-spin" d="M1040 995 a55 55 0 1 1 -55 55"/>
      <path class="ic ic-ok" d="M992 1052 l32 32 l60 -66"/>
      <g class="ic ic-err"><path d="M1040 992 v62"/><circle cx="1040" cy="1102" r="14" fill="#FFFFFF" stroke="none"/></g>
      <path class="ic ic-pause" d="M1016 1010 v80 M1064 1010 v80"/>
    </g>
  </g>
</svg>`;

  if (!document.getElementById('hb-conti-css')) {
    const st = document.createElement('style');
    st.id = 'hb-conti-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  customElements.define('hb-conti', class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this.innerHTML = svg(++uid);
    }
  });
})();
