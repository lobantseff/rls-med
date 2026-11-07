/* Cross-page links. Hosted artifacts live at separate URLs; local dev uses relative files. */
(function () {
  const local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  window.CS_LINKS = local
    ? { themes: 'index.html', components: 'components.html' }
    : { themes: 'https://claude.ai/artifact/X28oUf5M5WVU9rVfk6Xgor', components: 'https://claude.ai/artifact/BEYCNDpcxb7Lm9tfVPYcSY' };
})();
