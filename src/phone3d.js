import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const PHONE_MODEL_URL = '/assets/models/phone.glb';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = new GLTFLoader();
const phoneReady = new Promise((resolve, reject) => {
  loader.load(PHONE_MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
});

function createPhoneViewer(canvas, opts){
  opts = opts || {};
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(1.4, 1.8, 2.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7ad8f0, 1.6);
  rim.position.set(-1.6, -0.6, -1.8);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(-1.2, 1.4, -1);
  scene.add(fill);

  const group = new THREE.Group();
  scene.add(group);

  let screenCanvas, screenCtx, screenTexture;
  let currentSrc = null;
  let ready = false;
  let rotY = opts.startAngle != null ? opts.startAngle : 0.3;

  let agentImgObj = null, agentLogoObj = null;
  if (opts.agentMode){
    agentImgObj = new Image(); agentImgObj.src = opts.agentImg;
    agentLogoObj = new Image(); agentLogoObj.src = opts.agentLogo;
  }

  function wrapText(ctx, text, cx, y, maxWidth, lineHeight){
    const words = text.split(' ');
    let line = '', lines = [];
    for (let i = 0; i < words.length; i++){
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line){
        lines.push(line); line = words[i];
      } else { line = test; }
    }
    if (line) lines.push(line);
    const startY = y - (lines.length - 1) * lineHeight * 0.5;
    lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
  }

  phoneReady.then((template) => {
    const model = template.clone(true);
    model.traverse((n) => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = false; } });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    group.add(model);

    const dims = [
      { axis: 'x', v: size.x },
      { axis: 'y', v: size.y },
      { axis: 'z', v: size.z }
    ].sort((a, b) => a.v - b.v);
    const depth = dims[0], width = dims[1], height = dims[2];

    const axisVec = (a) => a === 'x' ? new THREE.Vector3(1, 0, 0) : a === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const xAxis = axisVec(width.axis);
    const yAxis = axisVec(height.axis);
    const zAxis = axisVec(depth.axis);

    screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256; screenCanvas.height = 512;
    screenCtx = screenCanvas.getContext('2d');
    screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;

    const screenGeo = new THREE.PlaneGeometry(width.v * 0.86, height.v * 0.9);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    screenMesh.quaternion.setFromRotationMatrix(basis);
    screenMesh.position.copy(zAxis.clone().multiplyScalar(depth.v * 0.5 * 1.05 + 0.0006));
    group.add(screenMesh);

    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.copy(zAxis.clone().multiplyScalar(maxDim * 2.7));
    camera.up.copy(yAxis);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    ready = true;
  }).catch((e) => console.warn('phone3d: model load failed', e));

  const SPIN_MS = opts.spinMs || 480;
  const SPIN_TURNS = opts.spinTurns || 1;
  const FADE_MS = opts.fadeMs || 650;
  let spinPending = true;
  let spinStart = null;
  let pendingSrc = null;
  let pendingImg = null;
  let currentImgObj = null;
  let fadeStart = null;
  let activeVideoEl = null;

  function easeOutBack(x){
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function drawRounded(img, w, h){
    screenCtx.save();
    const r = 16;
    screenCtx.beginPath();
    screenCtx.moveTo(r, 0);
    screenCtx.arcTo(w, 0, w, h, r);
    screenCtx.arcTo(w, h, 0, h, r);
    screenCtx.arcTo(0, h, 0, 0, r);
    screenCtx.arcTo(0, 0, w, 0, r);
    screenCtx.closePath();
    screenCtx.clip();
    screenCtx.drawImage(img, 0, 0, w, h);
    screenCtx.restore();
  }

  function setFrame(src){
    if (!ready || !src) return;
    if (opts.fadeMode){
      if (src === currentSrc || src === pendingSrc) return;
      pendingSrc = src;
      const img = new Image();
      img.onload = () => { pendingImg = img; fadeStart = null; };
      img.src = src;
      return;
    }
    if (src === currentSrc) return;
    currentSrc = src;
    spinPending = true;
    if (activeVideoEl){
      activeVideoEl.pause();
      activeVideoEl.removeAttribute('src');
      activeVideoEl.load();
      activeVideoEl = null;
    }
    if (/\.mp4(\?|$)/i.test(src)){
      const vid = document.createElement('video');
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;
      vid.loop = false;
      vid.src = src;
      vid.play().catch(() => {});
      activeVideoEl = vid;
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = screenCanvas.width, h = screenCanvas.height;
      screenCtx.clearRect(0, 0, w, h);
      drawRounded(img, w, h);
      screenTexture.needsUpdate = true;
    };
    img.src = src;
  }

  function render(globalMs){
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)){
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (ready){
      if (prefersReduced || opts.fadeMode){
        group.rotation.y = opts.startAngle || 0;
        group.position.y = 0;
      } else {
        if (spinPending){ spinStart = globalMs; spinPending = false; }
        if (spinStart != null){
          const p = Math.min(1, (globalMs - spinStart) / SPIN_MS);
          rotY = easeOutBack(p) * Math.PI * 2 * SPIN_TURNS;
          if (p >= 1){ spinStart = null; rotY = 0; }
          group.rotation.y = rotY;
          group.position.y = 0;
        } else {
          const idleT = globalMs / 1000;
          group.rotation.y = Math.sin(idleT * 0.9) * 0.05;
          group.position.y = Math.sin(idleT * 1.3) * 0.0025;
        }
      }

      if (opts.agentMode){
        const w = screenCanvas.width, h = screenCanvas.height;
        screenCtx.save();
        const r = 16;
        screenCtx.beginPath();
        screenCtx.moveTo(r, 0);
        screenCtx.arcTo(w, 0, w, h, r);
        screenCtx.arcTo(w, h, 0, h, r);
        screenCtx.arcTo(0, h, 0, 0, r);
        screenCtx.arcTo(0, 0, w, 0, r);
        screenCtx.closePath();
        screenCtx.clip();

        screenCtx.fillStyle = '#ffffff';
        screenCtx.fillRect(0, 0, w, h);

        if (agentLogoObj && agentLogoObj.complete && agentLogoObj.naturalWidth){
          const lw = w * 0.46, lh = lw * (agentLogoObj.naturalHeight / agentLogoObj.naturalWidth);
          screenCtx.drawImage(agentLogoObj, (w - lw) / 2, h * 0.08, lw, lh);
        }

        if (agentImgObj && agentImgObj.complete && agentImgObj.naturalWidth){
          const t = globalMs / 1000;
          const bounce = Math.sin(t * 2.4) * (h * 0.035);
          const iw = w * 0.46, ih = iw * (agentImgObj.naturalHeight / agentImgObj.naturalWidth);
          screenCtx.drawImage(agentImgObj, (w - iw) / 2, h * 0.36 + bounce, iw, ih);
        }

        screenCtx.fillStyle = '#B30F2E';
        screenCtx.textAlign = 'center';
        screenCtx.font = '700 14px system-ui, sans-serif';
        wrapText(screenCtx, opts.agentText || '', w / 2, h * 0.82, w * 0.84, 17);

        screenCtx.restore();
        screenTexture.needsUpdate = true;
      }

      if (opts.fadeMode && pendingImg){
        if (fadeStart == null) fadeStart = globalMs;
        const t = Math.min(1, (globalMs - fadeStart) / FADE_MS);
        const w = screenCanvas.width, h = screenCanvas.height;
        screenCtx.clearRect(0, 0, w, h);
        if (currentImgObj){
          screenCtx.globalAlpha = 1;
          drawRounded(currentImgObj, w, h);
        }
        screenCtx.globalAlpha = t;
        drawRounded(pendingImg, w, h);
        screenCtx.globalAlpha = 1;
        screenTexture.needsUpdate = true;
        if (t >= 1){
          currentImgObj = pendingImg;
          currentSrc = pendingSrc;
          pendingImg = null;
          pendingSrc = null;
          fadeStart = null;
        }
      }

      if (activeVideoEl && activeVideoEl.readyState >= 2){
        const w = screenCanvas.width, h = screenCanvas.height;
        screenCtx.clearRect(0, 0, w, h);
        drawRounded(activeVideoEl, w, h);
        screenTexture.needsUpdate = true;
      }
    }
    renderer.render(scene, camera);
  }

  function resetFade(){
    if (!opts.fadeMode) return;
    currentSrc = null;
    currentImgObj = null;
    pendingSrc = null;
    pendingImg = null;
    fadeStart = null;
    const w = screenCanvas.width, h = screenCanvas.height;
    screenCtx.clearRect(0, 0, w, h);
    screenTexture.needsUpdate = true;
  }

  return { setFrame, render, resetFade };
}

function pickBeat(beats, localMs){
  let acc = 0, idx = 0;
  for (let i = 0; i < beats.length; i++){
    if (localMs >= acc && localMs < acc + beats[i].ms){ idx = i; break; }
    acc += beats[i].ms;
    if (i === beats.length - 1) idx = i;
  }
  return idx;
}

function boot(){
  const registry = {};

  function register(key, canvasId, images, beats, tagId, opts){
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const viewer = createPhoneViewer(canvas, opts);
    registry[key] = { viewer, images, beats, tagId, lastIdx: -1 };
  }

  register('sira', 'canvasSira',
    ['/assets/images/sira_01.jpg', '/assets/images/sira_tipo.jpg', '/assets/images/sira_ubic.jpg', '/assets/images/sira_ia.jpg', '/assets/images/sira_enviado.jpg'],
    [
      { ms: 2200, tag: 'Mapa principal' },
      { ms: 2200, tag: 'Tipo de incidente' },
      { ms: 2200, tag: 'Ubicación GPS' },
      { ms: 3000, tag: 'IA describe el reporte' },
      { ms: 2200, tag: 'Reporte enviado' }
    ], 'tagSira', { startAngle: -0.25 });

  register('agent', 'canvasAgent', [], [], null, {
    startAngle: -0.22,
    agentMode: true,
    agentImg: '/assets/images/sira.png',
    agentLogo: '/assets/images/sira_logo.png',
    agentText: 'Llamado por IA · Usa SIRA para tu reporte'
  });

  register('sirad', 'canvasSirad',
    ['/assets/images/sirad_list.jpg', '/assets/images/sirad_map.jpg', '/assets/images/sirad_info.jpg', '/assets/images/sirad_chat.jpg', '/assets/images/sirad_asig.jpg'],
    [
      { ms: 2900, tag: 'Bandeja de emergencias' },
      { ms: 2900, tag: 'Mapa institucional' },
      { ms: 2600, tag: 'Detalle · Info' },
      { ms: 2500, tag: 'Detalle · Sala / Chat' },
      { ms: 2100, tag: 'Detalle · Asignaciones' }
    ], 'tagSirad', { startAngle: 0.3 });

  register('asig', 'canvasAsig',
    ['/assets/images/asignar.jpg', '/assets/images/asignar1.jpg', '/assets/images/asignado.jpg', '/assets/images/asginado2.jpg', '/assets/images/asignado3.jpg'],
    [
      { ms: 2400, tag: 'Asignar unidad' },
      { ms: 2800, tag: 'Elegir institución' },
      { ms: 2600, tag: 'Unidad asignada' },
      { ms: 2600, tag: 'Confirmación' },
      { ms: 2600, tag: 'En camino' }
    ], 'tagAsig', { startAngle: -0.3 });

  register('cierre', 'canvasCierre',
    ['/assets/images/sirad_chat.jpg', '/assets/images/sira_reportes.jpg'],
    [
      { ms: 2900, tag: 'Sala / Chat' },
      { ms: 2900, tag: 'Mis reportes · seguimiento' }
    ], 'tagCierre', { startAngle: 0.25 });

  register('splitSirad', 'canvasSplitSirad',
    ['/assets/images/log1.jpg', '/assets/images/sirad_map.jpg'],
    [
      { ms: 2400, tag: '' },
      { ms: 4200, tag: '' }
    ], null, { startAngle: 0.06, fadeMode: true, fadeMs: 700 });

  register('splitSira', 'canvasSplitSira',
    ['/assets/images/log.jpg', '/assets/images/sira_reportes.jpg'],
    [
      { ms: 2400, tag: '' },
      { ms: 4200, tag: '' }
    ], null, { startAngle: -0.06, fadeMode: true, fadeMs: 700 });

  function tick(sceneIdx, localMs, globalMs){
    Object.keys(registry).forEach((key) => {
      registry[key].viewer.render(globalMs);
    });

    const applyActive = (key, localT) => {
      const entry = registry[key];
      if (!entry) return;
      const idx = pickBeat(entry.beats, localT);
      if (idx !== entry.lastIdx){
        if (idx === 0 && entry.lastIdx > 0 && entry.viewer.resetFade) entry.viewer.resetFade();
        entry.lastIdx = idx;
        entry.viewer.setFrame(entry.images[idx]);
        if (entry.tagId){
          const tagEl = document.getElementById(entry.tagId);
          if (tagEl && entry.beats[idx].tag) tagEl.textContent = entry.beats[idx].tag;
        }
      }
      return idx;
    };

    if (sceneIdx === 2) applyActive('sira', localMs);
    if (sceneIdx === 5) applyActive('sirad', localMs);
    if (sceneIdx === 6) applyActive('asig', localMs);
    if (sceneIdx === 8) applyActive('cierre', localMs);
    if (sceneIdx === 7){
      applyActive('splitSirad', localMs);
      applyActive('splitSira', localMs);
    }
  }

  window.PhoneViewers = { tick };
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
