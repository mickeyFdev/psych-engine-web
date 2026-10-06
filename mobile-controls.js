/* Mobile controls for the HTML5 build.
 * Sends the same keyboard events as the desktop controls, so the compiled
 * Psych Engine input and key-remapping screens remain the single source of truth.
 */
(function () {
  'use strict';

  var isMobile = (navigator.maxTouchPoints || 0) > 0 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    new URLSearchParams(location.search).has('mobileControls');
  if (!isMobile) return;

  var KEY = {
    left: 37, up: 38, right: 39, down: 40,
    accept: 13, back: 27, pause: 13
  };
  var active = new Map();

  function keyEvent(type, code) {
    var event = new KeyboardEvent(type, {
      key: code === 13 ? 'Enter' : code === 27 ? 'Escape' :
        code === 37 ? 'ArrowLeft' : code === 38 ? 'ArrowUp' :
        code === 39 ? 'ArrowRight' : code === 40 ? 'ArrowDown' : ' ',
      code: code === 13 ? 'Enter' : code === 27 ? 'Escape' : 'Arrow',
      bubbles: true, cancelable: true
    });
    // keyCode/which are readonly in modern browsers, but the HTML5 Lime
    // backend reads these legacy values.
    try {
      Object.defineProperty(event, 'keyCode', { value: code });
      Object.defineProperty(event, 'which', { value: code });
    } catch (_) {}
    window.dispatchEvent(event);
  }

  function press(id, code, pointerId) {
    if (active.has(pointerId)) return;
    active.set(pointerId, { id: id, code: code });
    keyEvent('keydown', code);
    var button = document.querySelector('[data-mobile-key="' + id + '"]');
    if (button) button.classList.add('is-pressed');
  }

  function release(pointerId) {
    var item = active.get(pointerId);
    if (!item) return;
    active.delete(pointerId);
    keyEvent('keyup', item.code);
    var button = document.querySelector('[data-mobile-key="' + item.id + '"]');
    if (button) button.classList.remove('is-pressed');
  }

  function addButton(parent, id, label, code, extraClass) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-key ' + (extraClass || '');
    button.dataset.mobileKey = id;
    button.setAttribute('aria-label', label);
    button.textContent = label;
    button.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press(id, code, event.pointerId);
    }, { passive: false });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) {
      button.addEventListener(name, function (event) {
        event.preventDefault();
        release(event.pointerId);
      }, { passive: false });
    });
    parent.appendChild(button);
  }

  function build() {
    if (document.getElementById('mobile-controls')) return;
    var controls = document.createElement('div');
    controls.id = 'mobile-controls';
    controls.setAttribute('aria-label', 'Mobile game controls');

    var lanes = document.createElement('div');
    lanes.className = 'mobile-lanes';
    addButton(lanes, 'left', '←', KEY.left, 'lane');
    addButton(lanes, 'down', '↓', KEY.down, 'lane');
    addButton(lanes, 'up', '↑', KEY.up, 'lane');
    addButton(lanes, 'right', '→', KEY.right, 'lane');

    var actions = document.createElement('div');
    actions.className = 'mobile-actions';
    addButton(actions, 'back', '戻る', KEY.back, 'action');
    addButton(actions, 'pause', '一時停止', KEY.pause, 'action');
    addButton(actions, 'accept', '決定', KEY.accept, 'action accept');

    controls.appendChild(lanes);
    controls.appendChild(actions);
    document.body.appendChild(controls);

    var fullscreen = document.createElement('button');
    fullscreen.type = 'button';
    fullscreen.id = 'mobile-fullscreen';
    fullscreen.textContent = '全画面';
    fullscreen.setAttribute('aria-label', '全画面表示');
    fullscreen.addEventListener('click', function () {
      var target = document.documentElement;
      var request = target.requestFullscreen || target.webkitRequestFullscreen;
      if (request) request.call(target).catch(function () {});
    });
    document.body.appendChild(fullscreen);
  }

  document.addEventListener('DOMContentLoaded', build);
  window.addEventListener('blur', function () {
    Array.from(active.keys()).forEach(release);
  });
}());
