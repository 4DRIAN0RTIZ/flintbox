// FlintBox docs site — small progressive enhancements, no dependencies.
(function () {
  'use strict';

  // Footer year.
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Highlight the nav link for the section currently in view.
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var targets = links
    .map(function (a) {
      var el = document.querySelector(a.getAttribute('href'));
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          targets.forEach(function (t) {
            t.link.classList.toggle('is-active', t.el === entry.target);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    targets.forEach(function (t) {
      observer.observe(t.el);
    });
  }

  // Click-to-copy on shell/code blocks.
  Array.prototype.forEach.call(document.querySelectorAll('.code'), function (pre) {
    pre.title = 'Click to copy';
    pre.style.cursor = 'copy';
    pre.addEventListener('click', function () {
      var text = pre.innerText.replace(/^\$\s*/gm, '').trim();
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        var prev = pre.getAttribute('data-copied');
        if (prev) return;
        pre.setAttribute('data-copied', '1');
        var badge = document.createElement('span');
        badge.textContent = ' copied';
        badge.style.color = 'var(--ok)';
        pre.appendChild(badge);
        setTimeout(function () {
          badge.remove();
          pre.removeAttribute('data-copied');
        }, 1400);
      });
    });
  });
})();
