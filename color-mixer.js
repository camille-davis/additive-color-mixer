(function () {
  var stage = document.getElementById('stage');
  var circleControls = document.getElementById('circle-controls');

  /* Color math helpers */

  function clamp(num, minVal, maxVal) {
    return Math.max(minVal, Math.min(maxVal, Math.round(num)));
  }

  function clampHsl(h, s, l) {
    return { h: clamp(h, 0, 360), s: clamp(s, 0, 100), l: clamp(l, 0, 100) };
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      var hue2rgb = function (t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      r = hue2rgb(h + 1 / 3);
      g = hue2rgb(h);
      b = hue2rgb(h - 1 / 3);
    }
    return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';
  }

  function parseRgb(str) {
    var m = (str || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h, s;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  /* Mixer panel (editing UI) */

  function createMixerPanelHtml() {
    circleControls.innerHTML =
      '<div id="circle-controls-panel" class="circle-controls-panel">' +
      '<h2>Selected Circle</h2>' +
      '<div id="color-preview" class="color-preview"></div>' +
      '<div class="mixer" id="mixer">' +
      '<div class="mixer-row">' +
      '<label for="hue">H</label>' +
      '<input type="range" id="hue" class="hue-slider" min="0" max="360" value="0" aria-label="Hue" />' +
      '<input type="number" id="hue-num" min="0" max="360" value="0" aria-label="Hue (degrees)" /><span class="num-suffix">°</span>' +
      '</div>' +
      '<div class="mixer-row">' +
      '<label for="saturation">S</label>' +
      '<input type="range" id="saturation" min="0" max="100" value="100" aria-label="Saturation" />' +
      '<input type="number" id="saturation-num" min="0" max="100" value="100" aria-label="Saturation (percentage)" /><span class="num-suffix" aria-hidden="true">%</span>' +
      '</div>' +
      '<div class="mixer-row">' +
      '<label for="light">L</label>' +
      '<input type="range" id="light" min="0" max="100" value="50" aria-label="Lightness" />' +
      '<input type="number" id="light-num" min="0" max="100" value="50" aria-label="Lightness (percentage)" /><span class="num-suffix" aria-hidden="true">%</span>' +
      '</div>' +
      '</div>' +
      '<button type="button" id="delete-circle" class="delete-circle">Delete Circle</button>' +
      '</div>';
  }

  function getActiveHsl(els) {
    if (!els) return { h: 0, s: 100, l: 50 };
    var h = parseInt(els.hueNum.value, 10);
    var s = parseInt(els.saturationNum.value, 10);
    var l = parseInt(els.lightNum.value, 10);
    return {
      h: isNaN(h) ? 0 : h,
      s: isNaN(s) ? 100 : s,
      l: isNaN(l) ? 50 : l
    };
  }

  function syncToHsl(h, s, l, els) {
    if (!els) return;
    var c = clampHsl(h, s, l);
    var rgb = hslToRgb(c.h, c.s, c.l);
    var circle = (stage.querySelector('.circle[data-editing="true"]'));
    if (circle) circle.style.background = rgb;
    els.preview.style.background = rgb;
    els.hue.value = els.hueNum.value = c.h;
    els.saturation.value = els.saturationNum.value = c.s;
    els.light.value = els.lightNum.value = c.l;
  }

  function bindActiveMixer(els) {
    function fromSliders() {
      syncToHsl(els.hue.value, els.saturation.value, els.light.value, els);
    }
    els.hue.addEventListener('input', fromSliders);
    els.saturation.addEventListener('input', fromSliders);
    els.light.addEventListener('input', fromSliders);

    function bindNumber(input, slider, min, max, key) {
      function apply() {
        var v = getActiveHsl(els);
        var n = parseInt(input.value, 10);
        if (isNaN(n)) return;
        n = clamp(n, min, max);
        slider.value = n;
        v[key] = n;
        syncToHsl(v.h, v.s, v.l, els);
      }
      input.addEventListener('input', apply);
      input.addEventListener('change', function () {
        var v = getActiveHsl(els);
        syncToHsl(v.h, v.s, v.l, els);
      });
    }
    bindNumber(els.hueNum, els.hue, 0, 360, 'h');
    bindNumber(els.saturationNum, els.saturation, 0, 100, 's');
    bindNumber(els.lightNum, els.light, 0, 100, 'l');
  }

  function createMixerPanel(circle) {
    createMixerPanelHtml();
    var mixerEls = {
      preview: document.getElementById('color-preview'),
      hue: document.getElementById('hue'),
      hueNum: document.getElementById('hue-num'),
      saturation: document.getElementById('saturation'),
      saturationNum: document.getElementById('saturation-num'),
      light: document.getElementById('light'),
      lightNum: document.getElementById('light-num')
    };

    var rgb = parseRgb(getComputedStyle(circle).backgroundColor);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    syncToHsl(hsl.h, hsl.s, hsl.l, mixerEls);
    bindActiveMixer(mixerEls);

    var deleteBtn = document.getElementById('delete-circle');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        circle.remove();
        stopEditing();
      });
    }
  }

  function startEditing(circle) {
    var selectedCircle = stage.querySelector('.circle[data-editing="true"]');
    if (selectedCircle) {
      selectedCircle.removeAttribute('data-editing');
    }
    circle.setAttribute('data-editing', 'true');
    createMixerPanel(circle);
  }

  function stopEditing() {
    var selectedCircle = stage.querySelector('.circle[data-editing="true"]');
    if (selectedCircle) {
      selectedCircle.removeAttribute('data-editing');
    }
    if (document.getElementById('circle-controls-panel')) {
      document.getElementById('circle-controls-panel').remove();
    }
  }

  /* Drag functionality */

  var drag = { el: null, moved: false, startX: 0, startY: 0, left: 0, top: 0 };

  function onCircleDragStart(e, circle) {
    var rect = stage.getBoundingClientRect();
    var cr = circle.getBoundingClientRect();
    drag.el = circle;
    drag.moved = false;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.left = cr.left - rect.left;
    drag.top = cr.top - rect.top;
    window.addEventListener('mousemove', onCircleDragMove);
    window.addEventListener('mouseup', onCircleDragEnd);
  }

  function onCircleDragMove(e) {
    if (!drag.el) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    const MOVE_THRESHOLD = 5;
    if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
      drag.moved = true;
      e.preventDefault();
    }
    var rect = stage.getBoundingClientRect();
    var w = drag.el.offsetWidth;
    var margin = w * 0.3;
    var maxLeft = rect.width - w + margin;
    var maxTop = rect.height - w + margin;
    drag.el.style.left = Math.max(-margin, Math.min(maxLeft, drag.left + dx)) + 'px';
    drag.el.style.top = Math.max(-margin, Math.min(maxTop, drag.top + dy)) + 'px';
  }

  function onCircleDragEnd() {
    if (drag.el) {
      if (drag.moved) {

        // Set last dragged element as last element in HTML so it's on "top".
        stage.appendChild(drag.el);
      }
      drag.el = null;
    }
    window.removeEventListener('mousemove', onCircleDragMove);
    window.removeEventListener('mouseup', onCircleDragEnd);
  }

  /* Keeps circles centered on resize. */

  var lastStageSize = { width: 0, height: 0 };

  function setCirclePositionsFromCenter() {
    var stageRect = stage.getBoundingClientRect();
    var oldCenterX = lastStageSize.width / 2;
    var oldCenterY = lastStageSize.height / 2;
    var newCenterX = stageRect.width / 2;
    var newCenterY = stageRect.height / 2;
    stage.querySelectorAll('.circle').forEach(function (circle) {
      var left = parseFloat(circle.style.left) || 0;
      var top = parseFloat(circle.style.top) || 0;
      var w = circle.offsetWidth;
      var h = circle.offsetHeight;
      var offsetX = (left + w / 2) - oldCenterX;
      var offsetY = (top + h / 2) - oldCenterY;
      circle.style.left = (newCenterX + offsetX - w / 2) + 'px';
      circle.style.top = (newCenterY + offsetY - h / 2) + 'px';
    });
    lastStageSize.width = stageRect.width;
    lastStageSize.height = stageRect.height;
  }


  /* Add circle with random color and position. */

  function addCircle() {
    var nextId = stage.children.length + 1;
    var circle = document.createElement('button');
    circle.className = 'circle circle--' + nextId;
    circle.id = 'circle-' + nextId;
    circle.setAttribute('data-channel', String(nextId));
    var hue = Math.floor(Math.random() * 361);
    circle.style.background = 'hsl(' + hue + ', 100%, 50%)';
    var stageRect = stage.getBoundingClientRect();
    var size = 210;
    var maxLeft = Math.max(0, stageRect.width - size);
    var maxTop = Math.max(0, stageRect.height - size);
    circle.style.left = Math.floor(Math.random() * (maxLeft + 1)) + 'px';
    circle.style.top = Math.floor(Math.random() * (maxTop + 1)) + 'px';
    circle.addEventListener('click', function (e) {
      startEditing(circle);
    });
    circle.addEventListener('mousedown', function (e) {
      onCircleDragStart(e, circle);
    });
    stage.appendChild(circle);
    startEditing(circle);
  }

  document.getElementById('add-circle').addEventListener('click', addCircle);

  /* Init */

  function applyInitialStyles() {
    var stageRect = stage.getBoundingClientRect();
    stage.querySelectorAll('.circle').forEach(function (circle) {
      circle.style.background = getComputedStyle(circle).backgroundColor;
      var rect = circle.getBoundingClientRect();
      circle.style.left = (rect.left - stageRect.left) + 'px';
      circle.style.top = (rect.top - stageRect.top) + 'px';
    });
  }

  function storeInitialStageSize() {
    var stageRect = stage.getBoundingClientRect();
    lastStageSize.width = stageRect.width;
    lastStageSize.height = stageRect.height;
  }

  applyInitialStyles();
  storeInitialStageSize();

  document.querySelectorAll('.circle').forEach(function (circle) {
    circle.addEventListener('click', function (e) {
      startEditing(circle);
    });

    circle.addEventListener('mousedown', function (e) {
      onCircleDragStart(e, circle);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.sidebar') || e.target.closest('.circle')) {
      return;
    }
    stopEditing();
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      stopEditing();
    }
  });

  window.addEventListener('resize', setCirclePositionsFromCenter);
})();
