import './phone3d.js';
import './styles.css';

(function(){
  var SCENES = [
    {ms:3200,  cap:""},
    {ms:3400,  cap:"Cuando ocurre una emergencia, cada segundo importa."},
    {ms:11800, cap:"SIRA: reporta lo que ocurre, en segundos."},
    {ms:2600,  cap:"Información lista para ser gestionada."},
    {ms:13000, cap:"SIRAD: recibe, prioriza y gestiona cada reporte en tiempo real."},
    {ms:13000, cap:"La unidad adecuada, elegida por el operador."},
    {ms:6600,  cap:"Seguimiento en tiempo real, de la central a la calle."},
    {ms:5800,  cap:"Comunicación y seguimiento durante toda la atención."},
    {ms:3400,  cap:"Del reporte a la respuesta."}
  ];
  var starts = [0]; for (var i=0;i<SCENES.length;i++) starts.push(starts[i]+SCENES[i].ms);
  var TOTAL = starts[starts.length-1];

  var stage = document.getElementById('stage');
  var scenes = Array.prototype.slice.call(stage.querySelectorAll('.scene'));
  var captionEl = document.getElementById('captionText');
  var progressFill = document.getElementById('progressFill');
  var progressEl = document.getElementById('progress');
  var playBtn = document.getElementById('playBtn');
  var playIcon = document.getElementById('playIcon');
  var dotsWrap = document.getElementById('sceneDots');
  var clockLive = document.getElementById('clockLive');

  SCENES.forEach(function(_, idx){
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Ir a escena ' + (idx+1));
    b.addEventListener('click', function(){ seekTo(starts[idx] + 10); });
    dotsWrap.appendChild(b);
  });
  var dotEls = Array.prototype.slice.call(dotsWrap.children);

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var playing = !reduced;
  var startTime = performance.now();
  var pausedAt = 0;

  document.getElementById('reducedPlay').addEventListener('click', function(){
    reduced = false; playing = true; startTime = performance.now(); this.closest('.reduced-note').style.display='none';
  });

  playBtn.addEventListener('click', function(){
    if (playing){ pausedAt = elapsedNow(); playing = false; }
    else { startTime = performance.now() - pausedAt; playing = true; }
    playIcon.innerHTML = playing
      ? '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>'
      : '<path d="M6 4l14 8-14 8V4z"/>';
  });

  progressEl.addEventListener('click', function(e){
    var r = progressEl.getBoundingClientRect();
    var pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    seekTo(pct * TOTAL);
  });

  function seekTo(ms){
    startTime = performance.now() - ms;
    if (!playing){ pausedAt = ms; }
  }

  function elapsedNow(){
    return (performance.now() - startTime) % TOTAL;
  }

  function fmtClock(t){
    var s = Math.floor(t/1000);
    var mm = String(Math.floor(s/60)).padStart(2,'0');
    var ss = String(s%60).padStart(2,'0');
    return mm+':'+ss;
  }

  var lastSceneIdx = -1;

  function render(t){
    var idx = 0;
    for (var i=0;i<SCENES.length;i++){ if (t >= starts[i] && t < starts[i+1]){ idx = i; break; } if (i===SCENES.length-1) idx = i; }

    if (idx !== lastSceneIdx){
      scenes.forEach(function(sc){ sc.classList.toggle('active', +sc.dataset.scene === idx); });
      dotEls.forEach(function(d, di){ d.classList.toggle('on', di===idx); });
      captionEl.style.opacity = 0;
      setTimeout(function(){ captionEl.textContent = SCENES[idx].cap; captionEl.style.opacity = 1; }, 180);
      lastSceneIdx = idx;
    }

    var local = t - starts[idx];
    clockLive.textContent = fmtClock(t);

    if (idx === 1){ document.getElementById('s2timer').textContent = fmtClock(local); }

    if (idx === 3){
      var card = document.getElementById('incidentCard');
      card.classList.toggle('fly', local > 1900);
    }

    if (window.PhoneViewers){ window.PhoneViewers.tick(idx, local, t); }

    progressFill.style.width = ((t/TOTAL)*100) + '%';
  }

  function loop(){
    if (playing){ render(elapsedNow()); }
    requestAnimationFrame(loop);
  }
  render(0);
  requestAnimationFrame(loop);
})();
