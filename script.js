(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. RUN IMMEDIATELY
     index.html loads this file in the <head>, before the page
     exists. So the only thing we do right now is add the "js"
     class to <html>. styles.css uses it to switch on the mobile
     menu and the reveal animations. Everything else waits for
     the page to finish loading (see onReady below).
     --------------------------------------------------------- */
  document.documentElement.classList.add('js');


  /* ---------------------------------------------------------
     HELPERS
     --------------------------------------------------------- */

  // Runs a function once the page's HTML is ready.
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // Runs one feature safely. If one feature has a problem, the
  // others still work and the visitor never sees an error.
  function safely(fn) {
    try {
      fn();
    } catch (error) {
      // Intentionally quiet: a small problem should not break the site.
    }
  }


  /* ---------------------------------------------------------
     2. MOBILE NAVIGATION
     Works with: .nav-toggle, .nav-toggle__label, #site-nav and
     the ".is-open" class (styles.css shows the panel with it).
     --------------------------------------------------------- */
  function setupNavigation() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');

    // If the page has no menu, there is nothing to do.
    if (!toggle || !nav) {
      return;
    }

    var label = toggle.querySelector('.nav-toggle__label');

    // Same width as the desktop breakpoint in styles.css (860px).
    var desktopQuery = window.matchMedia
      ? window.matchMedia('(min-width: 860px)')
      : null;

    function isOpen() {
      return nav.classList.contains('is-open');
    }

    // One place that opens or closes the menu and keeps
    // the button, the label and aria-expanded in step.
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) {
        label.textContent = open ? 'Close' : 'Menu';
      }
    }

    // Start closed, with the right label.
    setOpen(false);

    // Tap the Menu / Close button.
    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    // Tap any link inside the menu: close it.
    nav.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a') : null;
      if (link && isOpen()) {
        setOpen(false);
      }
    });

    // Press Escape: close the menu and return focus to the button,
    // so keyboard users do not lose their place.
    document.addEventListener('keydown', function (event) {
      var isEscape = event.key === 'Escape' || event.key === 'Esc';
      if (isEscape && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Screen becomes desktop width (for example, a phone is rotated
    // or a window is resized): reset the menu so nothing stays stuck.
    if (desktopQuery) {
      var onBreakpointChange = function (event) {
        if (event.matches) {
          setOpen(false);
        }
      };

      if (desktopQuery.addEventListener) {
        desktopQuery.addEventListener('change', onBreakpointChange);
      } else if (desktopQuery.addListener) {
        // Older browsers
        desktopQuery.addListener(onBreakpointChange);
      }
    }
  }


  /* ---------------------------------------------------------
     3. SCROLL REVEAL
     Elements with class "reveal" fade in as they scroll into
     view. We add ".is-visible" to show them.

     Content is shown straight away (no animation) when:
     - the visitor prefers reduced motion, or
     - the browser has no IntersectionObserver.
     --------------------------------------------------------- */
  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    var i;

    if (!items.length) {
      return;
    }

    function showAll() {
      for (i = 0; i < items.length; i++) {
        items[i].classList.add('is-visible');
      }
    }

    var prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    var observer;

    try {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            // Reveal elements that are on screen. Also reveal any that
            // are already above the screen, which happens if someone
            // jumps straight to a section lower down the page.
            var isAbove = entry.boundingClientRect.top < 0;

            if (entry.isIntersecting || isAbove) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target); // reveal once only
            }
          });
        },
        {
          threshold: 0,
          rootMargin: '0px 0px -8% 0px'
        }
      );
    } catch (error) {
      showAll();
      return;
    }

    for (i = 0; i < items.length; i++) {
      observer.observe(items[i]);
    }
  }


  /* ---------------------------------------------------------
     4. CURRENT YEAR
     Any element with a data-year attribute shows this year.
     --------------------------------------------------------- */
  function setupYear() {
    var spots = document.querySelectorAll('[data-year]');
    var year = String(new Date().getFullYear());

    for (var i = 0; i < spots.length; i++) {
      spots[i].textContent = year;
    }
  }


  /* ---------------------------------------------------------
     5. OPTIONAL PHOTOS INSIDE ".media"
     The gradient placeholders already look finished. When a real
     photo is added later and it fails to load, we add
     ".is-fallback" so styles.css hides the broken image and the
     gradient stays visible.
     --------------------------------------------------------- */
  function setupMediaFallbacks() {
    var images = document.querySelectorAll('.media img');

    function useFallback(image) {
      var box = image.closest ? image.closest('.media') : null;
      if (box) {
        box.classList.add('is-fallback');
      }
    }

    function watch(image) {
      // No image address at all: show the gradient.
      if (!image.getAttribute('src')) {
        useFallback(image);
        return;
      }

      // The image may have already failed before this script ran.
      if (image.complete && image.naturalWidth === 0) {
        useFallback(image);
      }

      // Or it may fail later.
      image.addEventListener('error', function () {
        useFallback(image);
      });
    }

    for (var i = 0; i < images.length; i++) {
      watch(images[i]);
    }
  }


  /* ---------------------------------------------------------
     START
     Wait for the page, then run each feature on its own.
     --------------------------------------------------------- */
  onReady(function () {
    safely(setupNavigation);
    safely(setupReveal);
    safely(setupYear);
    safely(setupMediaFallbacks);
  });
})();
