/**
 * Sandbox bridge script injected into the iframe's srcDoc.
 * Intercepts console methods, fetch/XHR, and enables element inspection.
 * Communicates with the parent window via postMessage.
 */

export const SANDBOX_BRIDGE_SCRIPT = `
<script>
(function() {
  'use strict';

  var PARENT_ORIGIN = window.location.origin;
  var inspectorEnabled = false;

  function postToParent(type, data) {
    try {
      window.parent.postMessage({ __joyfulSandbox: true, type: type, data: data, timestamp: Date.now() }, PARENT_ORIGIN);
    } catch (e) {}
  }

  // Console interception
  var origConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };

  function serializeArgs(args) {
    return args.map(function(arg) {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          var seen = new Set();
          return JSON.stringify(arg, function(key, value) {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) return '[Circular]';
              seen.add(value);
            }
            if (value instanceof Date) return value.toISOString();
            if (typeof value === 'function') return '[Function]';
            return value;
          }, 2);
        } catch (e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
  }

  console.log = function() { origConsole.log.apply(console, arguments); postToParent('console', { level: 'log', message: serializeArgs(Array.from(arguments)) }); };
  console.warn = function() { origConsole.warn.apply(console, arguments); postToParent('console', { level: 'warn', message: serializeArgs(Array.from(arguments)) }); };
  console.error = function() { origConsole.error.apply(console, arguments); postToParent('console', { level: 'error', message: serializeArgs(Array.from(arguments)) }); };
  console.info = function() { origConsole.info.apply(console, arguments); postToParent('console', { level: 'info', message: serializeArgs(Array.from(arguments)) }); };

  // Error tracking
  window.addEventListener('error', function(e) {
    postToParent('console', { level: 'error', message: (e.message || 'Unknown error') + (e.filename ? ' at ' + e.filename + ':' + e.lineno : '') });
  });
  window.addEventListener('unhandledrejection', function(e) {
    postToParent('console', { level: 'error', message: 'Unhandled Promise Rejection: ' + (e.reason ? (typeof e.reason === 'object' ? JSON.stringify(e.reason) : String(e.reason)) : 'unknown') });
  });

  // Fetch interception
  var origFetch = window.fetch;
  window.fetch = function() {
    var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url) || '';
    var method = (arguments[1] && arguments[1].method) || 'GET';
    var startTime = performance.now();
    var requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    postToParent('network-start', { id: requestId, url: url, method: method, type: 'fetch', startTime: startTime });

    return origFetch.apply(window, arguments).then(function(response) {
      var duration = performance.now() - startTime;
      var cloned = response.clone();
      cloned.text().then(function(body) {
        postToParent('network-end', {
          id: requestId, url: url, method: method, type: 'fetch',
          status: response.status, statusText: response.statusText,
          duration: Math.round(duration * 100) / 100,
          size: body.length,
          contentType: response.headers.get('content-type') || ''
        });
      }).catch(function() {
        postToParent('network-end', { id: requestId, url: url, method: method, type: 'fetch', status: response.status, statusText: response.statusText, duration: Math.round(duration * 100) / 100, size: 0, contentType: '' });
      });
      return response;
    }).catch(function(err) {
      var duration = performance.now() - startTime;
      postToParent('network-end', { id: requestId, url: url, method: method, type: 'fetch', status: 0, statusText: 'Failed', duration: Math.round(duration * 100) / 100, size: 0, error: err.message });
      throw err;
    });
  };

  // XHR interception
  var origXHR = window.XMLHttpRequest;
  function InterceptedXHR() {
    var xhr = new origXHR();
    var reqId = 'xhr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    var reqMethod = 'GET';
    var reqUrl = '';
    var startTime = 0;

    var origOpen = xhr.open;
    xhr.open = function(method, url) {
      reqMethod = method;
      reqUrl = url || '';
      return origOpen.apply(xhr, arguments);
    };

    var origSend = xhr.send;
    xhr.send = function() {
      startTime = performance.now();
      postToParent('network-start', { id: reqId, url: reqUrl, method: reqMethod, type: 'xhr', startTime: startTime });
      xhr.addEventListener('loadend', function() {
        var duration = performance.now() - startTime;
        var size = 0;
        try { size = (xhr.responseText || '').length; } catch (e) {}
        postToParent('network-end', {
          id: reqId, url: reqUrl, method: reqMethod, type: 'xhr',
          status: xhr.status, statusText: xhr.statusText,
          duration: Math.round(duration * 100) / 100,
          size: size,
          contentType: xhr.getResponseHeader('content-type') || ''
        });
      });
      return origSend.apply(xhr, arguments);
    };
    return xhr;
  }
  window.XMLHttpRequest = InterceptedXHR;

  // Element inspector
  var hoverOverlay = null;
  var infoTooltip = null;

  function createInspectorOverlay() {
    if (hoverOverlay) return;
    hoverOverlay = document.createElement('div');
    hoverOverlay.id = '__joyful-hover-overlay';
    hoverOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;background:rgba(99,102,241,0.15);border:2px solid rgba(99,102,241,0.8);transition:all 80ms ease-out;';
    document.body.appendChild(hoverOverlay);

    infoTooltip = document.createElement('div');
    infoTooltip.id = '__joyful-info-tooltip';
    infoTooltip.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#1e1e2e;color:#cdd6f4;font:12px/1.4 monospace;padding:6px 10px;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.4);max-width:360px;white-space:nowrap;';
    document.body.appendChild(infoTooltip);
  }

  function removeInspectorOverlay() {
    if (hoverOverlay) { hoverOverlay.remove(); hoverOverlay = null; }
    if (infoTooltip) { infoTooltip.remove(); infoTooltip = null; }
  }

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    var parts = [];
    while (el && el !== document.body && parts.length < 4) {
      var tag = el.tagName.toLowerCase();
      if (el.id) { parts.unshift('#' + el.id); break; }
      var cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
      parts.unshift(tag + cls);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }

  function handleMouseOver(e) {
    if (!inspectorEnabled) return;
    var el = e.target;
    if (el.id === '__joyful-hover-overlay' || el.id === '__joyful-info-tooltip') return;
    var rect = el.getBoundingClientRect();
    if (hoverOverlay) {
      hoverOverlay.style.left = rect.left + 'px';
      hoverOverlay.style.top = rect.top + 'px';
      hoverOverlay.style.width = rect.width + 'px';
      hoverOverlay.style.height = rect.height + 'px';
    }
    if (infoTooltip) {
      var tag = el.tagName.toLowerCase();
      var id = el.id ? '#' + el.id : '';
      var cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '';
      var w = Math.round(rect.width);
      var h = Math.round(rect.height);
      infoTooltip.textContent = tag + id + cls + '  ' + w + ' x ' + h;
      var tooltipTop = rect.top - 30;
      var tooltipLeft = rect.left;
      if (tooltipTop < 4) tooltipTop = rect.bottom + 4;
      if (tooltipLeft < 4) tooltipLeft = 4;
      infoTooltip.style.top = tooltipTop + 'px';
      infoTooltip.style.left = tooltipLeft + 'px';
    }
  }

  function handleClick(e) {
    if (!inspectorEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (el.id === '__joyful-hover-overlay' || el.id === '__joyful-info-tooltip') return;
    var rect = el.getBoundingClientRect();
    var computed = window.getComputedStyle(el);
    postToParent('inspector-select', {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: el.className && typeof el.className === 'string' ? el.className.trim().split(/\\s+/) : [],
      selector: getSelector(el),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      display: computed.display,
      position: computed.position,
      fontSize: computed.fontSize,
      color: computed.color,
      backgroundColor: computed.backgroundColor
    });
  }

  // Performance metrics
  function collectMetrics() {
    var domNodes = document.querySelectorAll('*').length;
    var heapSize = 0;
    if (performance.memory && performance.memory.usedJSHeapSize) {
      heapSize = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
    }
    var entries = performance.getEntriesByType('navigation');
    var loadTime = entries.length > 0 && entries[0].loadEventEnd > 0 ? entries[0].loadEventEnd : 0;
    postToParent('metrics', { domNodes: domNodes, heapMB: heapSize, loadMs: loadTime });
  }

  // Listen for messages from parent
  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || !msg.__joyfulSandbox) return;

    if (msg.type === 'toggle-inspector') {
      inspectorEnabled = msg.enabled;
      if (inspectorEnabled) {
        createInspectorOverlay();
        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('click', handleClick, true);
        document.body.style.cursor = 'crosshair';
      } else {
        removeInspectorOverlay();
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('click', handleClick, true);
        document.body.style.cursor = '';
        postToParent('inspector-select', null);
      }
    }

    if (msg.type === 'request-metrics') {
      collectMetrics();
    }
  });

  // Report page load
  window.addEventListener('load', function() {
    setTimeout(function() { collectMetrics(); }, 200);
  });
})();
</script>
`;
