/* =========================================================
   VARDENA — script.js (V2, multipage-v2 branch)
   Plain vanilla JavaScript. No libraries, no tracking.

   What this file does
   1. Adds the "js" class to <html> straight away
   2. Mobile navigation (open, close, Escape, desktop resize)
   3. Plant finder (replaces the static checklist with a real form)
   4. Scroll reveal animation for ".reveal" elements
   5. Current year in the footer
   6. Safe fallback for optional photos inside ".media"

   Without JavaScript, the checklist in index.html stays on the
   page and keeps linking to the guides.
   ========================================================= */

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

  // True when the visitor has asked their device for less motion.
  function prefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  // Creates an element in one line: tag, optional class, optional text.
  // We always use textContent (never innerHTML), which keeps things safe.
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  // Removes everything inside an element.
  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  // "1 plant" or "3 plants".
  function plantCount(n) {
    return n + (n === 1 ? ' plant' : ' plants');
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
     3. PLANT FINDER
     Part A: the data (questions and plants)
     Part B: the matching logic
     Part C: building the form and showing results
     --------------------------------------------------------- */

  /* ----- Part A: the data ----- */

  // The four questions. Each option has:
  //   value  = the code used in the plant data below
  //   label  = the text on the button
  //   phrase = how the answer reads inside a sentence
  var FINDER_QUESTIONS = [
    {
      name: 'sun',
      legend: 'Direct sunlight',
      hint: 'How many hours of direct sun reach the spot on a clear day? Check at a few times of day if you are not sure.',
      options: [
        { value: 'low', label: 'Under 3 hours', phrase: 'under 3 hours of direct sun' },
        { value: 'medium', label: '3\u20136 hours', phrase: '3\u20136 hours of direct sun' },
        { value: 'high', label: '6+ hours', phrase: '6 or more hours of direct sun' }
      ]
    },
    {
      name: 'heat',
      legend: 'Heat',
      hint: 'Strong afternoon sun heats pots, walls and railings quickly in summer.',
      options: [
        { value: 'afternoon', label: 'Strong afternoon sun', phrase: 'strong afternoon sun' },
        { value: 'morning', label: 'Morning sun', phrase: 'morning sun' },
        { value: 'sheltered', label: 'Mostly sheltered', phrase: 'a mostly sheltered spot' }
      ]
    },
    {
      name: 'space',
      legend: 'Available space',
      hint: 'Where would the plant live? Bigger plants need bigger pots.',
      options: [
        { value: 'windowsill', label: 'Windowsill', phrase: 'a windowsill' },
        { value: 'railing', label: 'Railing', phrase: 'a railing' },
        { value: 'corner', label: 'Balcony corner', phrase: 'a balcony corner' },
        { value: 'balcony', label: 'Full balcony', phrase: 'a full balcony' }
      ]
    },
    {
      name: 'experience',
      legend: 'Experience',
      hint: 'Choosing beginner leaves out plants that need steadier, more attentive care.',
      options: [
        { value: 'beginner', label: 'Beginner', phrase: 'beginner experience' },
        { value: 'some', label: 'Some gardening experience', phrase: 'some gardening experience' }
      ]
    }
  ];

  // The most plants shown at once, so the results stay easy to read.
  var FINDER_MAX_RESULTS = 4;

  // Added to every result so nobody reads these as guarantees.
  var FINDER_CAVEAT =
    'Light, heat and rain vary from home to home, so check this against your own space and ask a local nursery before you buy.';

  // A small, hand-picked list of general-knowledge suggestions.
  //
  // How the scores work, for sun / heat / space:
  //   2 = usually a good fit
  //   1 = workable, with some care
  //   0 or missing = a poor fit, so the plant is left out
  //
  // level: "beginner" = fine for beginners
  //        "some"     = needs steadier care, so it is only shown
  //                     to people with some gardening experience
  //
  // To add a plant later, copy one block and edit it.
  var FINDER_PLANTS = [
    {
      name: 'Tulsi (holy basil)',
      level: 'beginner',
      sun: { low: 0, medium: 1, high: 2 },
      heat: { afternoon: 2, morning: 1, sheltered: 1 },
      space: { windowsill: 1, railing: 2, corner: 2, balcony: 2 },
      likes: 'plenty of direct sun, warmth and soil that stays lightly moist',
      care: 'Water when the top of the soil feels dry, and pinch off the flower spikes to encourage bushier growth.',
      check: 'Growth usually slows in cooler months, and the pot needs to drain freely during the monsoon.'
    },
    {
      name: 'Mint (pudina)',
      level: 'beginner',
      sun: { low: 1, medium: 2, high: 1 },
      heat: { afternoon: 0, morning: 2, sheltered: 2 },
      space: { windowsill: 2, railing: 2, corner: 1, balcony: 1 },
      likes: 'regular moisture and bright light that is not too harsh',
      care: 'Give it its own pot, because it spreads quickly, and keep the soil evenly moist without letting it sit in water.',
      check: 'Hot, dry spells can leave it wilted and scorched, so check the soil often in summer.'
    },
    {
      name: 'Coriander (dhania)',
      level: 'beginner',
      sun: { low: 1, medium: 2, high: 1 },
      heat: { afternoon: 0, morning: 2, sheltered: 2 },
      space: { windowsill: 2, railing: 2, corner: 1, balcony: 1 },
      likes: 'mild weather and soil that stays lightly moist',
      care: 'Sow the seeds straight into the pot, since it dislikes being moved, and pick the outer leaves as it grows.',
      check: 'It is mainly a cool-season herb. In hot weather it tends to flower quickly and the leaves become less useful, so cooler months suit it best.'
    },
    {
      name: 'Marigold (genda)',
      level: 'beginner',
      sun: { low: 0, medium: 1, high: 2 },
      heat: { afternoon: 2, morning: 1, sheltered: 1 },
      space: { windowsill: 1, railing: 2, corner: 2, balcony: 2 },
      likes: 'full sun and warmth',
      care: 'Pinch off faded flowers to encourage more blooms, and water at the base of the plant rather than over the flowers.',
      check: 'It is usually grown as a seasonal plant, so expect to replace or resow it, and heavy rain can damage the blooms. Compact types suit small pots best.'
    },
    {
      name: 'Chilli (mirch)',
      level: 'some',
      sun: { low: 0, medium: 1, high: 2 },
      heat: { afternoon: 1, morning: 2, sheltered: 1 },
      space: { windowsill: 0, railing: 1, corner: 2, balcony: 2 },
      likes: 'plenty of sun, warmth and steady watering',
      care: 'Use a deep pot with drainage holes, and check the soil often in hot weather because pots can dry out fast.',
      check: 'Flowers can drop during very hot spells or when watering is uneven, and the pot size matters because the roots need room.'
    },
    {
      name: 'Tomato (compact or cherry types)',
      level: 'some',
      sun: { low: 0, medium: 0, high: 2 },
      heat: { afternoon: 1, morning: 2, sheltered: 1 },
      space: { windowsill: 0, railing: 0, corner: 2, balcony: 2 },
      likes: 'lots of sun, deep pots and steady watering',
      care: 'Use a large, deep container, give the stems support as they grow, and water evenly rather than letting the soil swing between dry and soggy.',
      check: 'Very hot spells can make flowers drop, so many growers favour milder months, and plants usually need regular feeding as they grow.'
    },
    {
      name: 'Money plant (pothos)',
      level: 'beginner',
      sun: { low: 2, medium: 1, high: 0 },
      heat: { afternoon: 0, morning: 1, sheltered: 2 },
      space: { windowsill: 2, railing: 1, corner: 2, balcony: 2 },
      likes: 'bright light without harsh direct sun',
      care: 'Let the top few centimetres of soil dry out before watering, and let the long stems trail from a shelf or hanging pot.',
      check: 'Harsh direct sun can scorch its leaves, and the plant can irritate if chewed, so keep it away from pets and small children.'
    },
    {
      name: 'Snake plant',
      level: 'beginner',
      sun: { low: 2, medium: 2, high: 1 },
      heat: { afternoon: 1, morning: 2, sheltered: 2 },
      space: { windowsill: 1, railing: 0, corner: 2, balcony: 2 },
      likes: 'anything from fairly dim to bright light, and soil that dries out between waterings',
      care: 'Water sparingly and let the soil dry out well between waterings, using a pot with drainage holes.',
      check: 'Soggy soil is the usual problem, especially in the monsoon, and the leaves can upset pets or children if chewed.'
    },
    {
      name: 'Spider plant',
      level: 'beginner',
      sun: { low: 2, medium: 1, high: 0 },
      heat: { afternoon: 0, morning: 2, sheltered: 2 },
      space: { windowsill: 2, railing: 2, corner: 1, balcony: 1 },
      likes: 'bright, indirect light and evenly moist soil',
      care: 'Water when the top of the soil starts to dry, and give the leaves room to arch or hang over the edge of the pot.',
      check: 'Brown leaf tips are common and can come from dry air or uneven watering, and strong direct sun can scorch the leaves.'
    },
    {
      name: 'Aloe vera',
      level: 'beginner',
      sun: { low: 0, medium: 2, high: 2 },
      heat: { afternoon: 1, morning: 2, sheltered: 2 },
      space: { windowsill: 2, railing: 1, corner: 2, balcony: 2 },
      likes: 'bright light and soil that drains quickly',
      care: 'Use a gritty, free-draining mix and water only after the soil has dried out.',
      check: 'Too much water, especially in the monsoon, can rot the roots, and sudden strong sun may mark the leaves. It can also upset pets if eaten.'
    }
  ];


  /* ----- Part B: the matching logic ----- */

  // Finds a question (or one of its options) by name.
  function questionByName(name) {
    for (var i = 0; i < FINDER_QUESTIONS.length; i++) {
      if (FINDER_QUESTIONS[i].name === name) {
        return FINDER_QUESTIONS[i];
      }
    }
    return null;
  }

  function optionFor(name, value) {
    var question = questionByName(name);
    if (!question) {
      return null;
    }
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].value === value) {
        return question.options[i];
      }
    }
    return null;
  }

  function phraseFor(name, value) {
    var option = optionFor(name, value);
    return option ? option.phrase : '';
  }

  // Makes a copy of the answers with one answer changed.
  function withAnswer(answers, name, value) {
    var copy = {};
    for (var key in answers) {
      if (Object.prototype.hasOwnProperty.call(answers, key)) {
        copy[key] = answers[key];
      }
    }
    copy[name] = value;
    return copy;
  }

  // The heart of the finder. Keeps a plant only if sun, heat and
  // space are all at least "workable", then sorts the best first.
  function findMatches(answers) {
    var all = [];
    var heldBack = 0; // plants left out only because of "beginner"

    for (var i = 0; i < FINDER_PLANTS.length; i++) {
      var plant = FINDER_PLANTS[i];
      var sunScore = plant.sun[answers.sun] || 0;
      var heatScore = plant.heat[answers.heat] || 0;
      var spaceScore = plant.space[answers.space] || 0;

      // A zero anywhere means a poor fit, so the plant is left out.
      if (!sunScore || !heatScore || !spaceScore) {
        continue;
      }

      // Plants that need steadier care are not shown to beginners.
      if (plant.level === 'some' && answers.experience === 'beginner') {
        heldBack++;
        continue;
      }

      all.push({
        plant: plant,
        index: i,
        total: sunScore + heatScore + spaceScore,
        ideal: sunScore === 2 && heatScore === 2 && spaceScore === 2
      });
    }

    // Highest score first; ties keep the order of the list above.
    all.sort(function (a, b) {
      return (b.total - a.total) || (a.index - b.index);
    });

    return {
      all: all,
      shown: all.slice(0, FINDER_MAX_RESULTS),
      heldBack: heldBack
    };
  }

  // When nothing matches, work out the reason in plain words.
  function explainNoMatch(answers) {
    var sun = phraseFor('sun', answers.sun);
    var heat = phraseFor('heat', answers.heat);
    var space = phraseFor('space', answers.space);
    var withSunAndHeat = 0;
    var withSpaceToo = 0;

    for (var i = 0; i < FINDER_PLANTS.length; i++) {
      var plant = FINDER_PLANTS[i];
      if ((plant.sun[answers.sun] || 0) && (plant.heat[answers.heat] || 0)) {
        withSunAndHeat++;
        if (plant.space[answers.space] || 0) {
          withSpaceToo++;
        }
      }
    }

    if (withSunAndHeat === 0) {
      return 'None of the plants in this small list copes well with ' + sun + ' together with ' + heat + '.';
    }
    if (withSpaceToo === 0) {
      return 'A few plants can handle ' + sun + ' and ' + heat + ', but none of them suits ' + space + ' well.';
    }
    return 'The plants that fit these conditions need steadier care than a beginner may want to start with.';
  }

  // For each of sun, heat and space, finds the one other answer
  // that would give the most plants. Used for the "try this" buttons.
  function suggestChanges(answers) {
    var names = ['sun', 'heat', 'space'];
    var picks = [];

    names.forEach(function (name) {
      var question = questionByName(name);
      var best = null;

      question.options.forEach(function (option) {
        if (option.value === answers[name]) {
          return;
        }
        var count = findMatches(withAnswer(answers, name, option.value)).all.length;
        if (count > 0 && (!best || count > best.count)) {
          best = { question: question, option: option, count: count };
        }
      });

      if (best) {
        picks.push(best);
      }
    });

    picks.sort(function (a, b) {
      return b.count - a.count;
    });

    return picks;
  }


  /* ----- Part C: building the form and showing results ----- */

  // Builds one result card from a match.
  function buildResultCard(match, answers) {
    var plant = match.plant;
    var card = el('li', 'result-card');

    card.appendChild(el('h3', '', plant.name));

    // Small tags: how well it fits, and who it suits.
    var tags = el('ul', 'tag-list');
    tags.setAttribute('role', 'list');
    tags.appendChild(el('li', 'tag', match.ideal ? 'Good fit' : 'Workable fit'));
    tags.appendChild(
      el('li', 'tag', plant.level === 'beginner' ? 'Suits beginners' : 'Better with some experience')
    );
    card.appendChild(tags);

    // Why it may fit.
    var chosen =
      phraseFor('sun', answers.sun) + ', ' +
      phraseFor('heat', answers.heat) + ' and ' +
      phraseFor('space', answers.space);
    var fitText = match.ideal
      ? 'Your conditions (' + chosen + ') may be a good match.'
      : 'Your conditions (' + chosen + ') are a workable match rather than an ideal one, so watch how it responds.';
    card.appendChild(el('p', '', plant.name + ' generally likes ' + plant.likes + '. ' + fitText));

    // One practical care note, then something to check first.
    card.appendChild(labelledParagraph('Care note:', plant.care));
    card.appendChild(labelledParagraph('Check first:', plant.check + ' ' + FINDER_CAVEAT));

    return card;
  }

  // A paragraph that starts with a bold label.
  function labelledParagraph(label, text) {
    var paragraph = el('p');
    paragraph.appendChild(el('strong', '', label + ' '));
    paragraph.appendChild(document.createTextNode(text));
    return paragraph;
  }

  // A short note with a link to the sunlight guide on Guide.html.
  function buildGuideNote() {
    var note = el(
      'p',
      'finder__note',
      'These are general suggestions, not guarantees. Not sure how much sun your space gets? '
    );
    var link = el('a', 'text-link', 'Read the sunlight guide');
    link.href = 'Guide.html#sunlight';
    note.appendChild(link);
    return note;
  }

  // A "Start over" button. The click is handled in setupPlantFinder.
  function buildStartOver() {
    var wrap = el('div', 'finder__actions');
    var button = el('button', 'btn btn--secondary btn--sm', 'Start over');
    button.type = 'button';
    button.setAttribute('data-finder-reset', '');
    wrap.appendChild(button);
    return wrap;
  }

  function setupPlantFinder() {
    var oldBox = document.querySelector('.finder__form');
    if (!oldBox || !oldBox.parentNode || !oldBox.closest) {
      return;
    }

    var finder = oldBox.closest('.finder') || oldBox.parentNode;

    // --- Build everything first. The old checklist is only swapped
    // out at the very end, so if anything goes wrong above that
    // line, the visitor still sees the working checklist. ---

    // The form keeps the class "finder__form" so it keeps its styling.
    var form = el('form', 'finder__form');
    form.setAttribute('novalidate', ''); // we show our own, friendlier message
    if (document.getElementById('finder-title')) {
      form.setAttribute('aria-labelledby', 'finder-title');
    } else {
      form.setAttribute('aria-label', 'Plant finder');
    }

    // One fieldset per question, with radio buttons styled as pills.
    FINDER_QUESTIONS.forEach(function (question) {
      var fieldset = el('fieldset');
      var hintId = 'finder-hint-' + question.name;
      fieldset.setAttribute('aria-describedby', hintId);

      var legend = el('legend', 'field__label', question.legend);
      legend.appendChild(el('span', 'sr-only', ' (required)'));
      fieldset.appendChild(legend);

      var group = el('div', 'choice-group');
      question.options.forEach(function (option) {
        var label = el('label', 'choice');
        var input = el('input');
        input.type = 'radio';
        input.name = question.name;
        input.value = option.value;
        input.required = true;
        label.appendChild(input);
        label.appendChild(el('span', '', option.label));
        group.appendChild(label);
      });
      fieldset.appendChild(group);

      var hint = el('span', 'field__hint', question.hint);
      hint.id = hintId;
      fieldset.appendChild(hint);

      form.appendChild(fieldset);
    });

    // Message shown if a question was skipped.
    var errorBox = el('p', 'finder__note');
    errorBox.setAttribute('role', 'alert');
    errorBox.hidden = true;
    form.appendChild(errorBox);

    // Buttons.
    var actions = el('div', 'finder__actions');
    var submit = el('button', 'btn btn--primary', 'Show matching plants');
    submit.type = 'submit';
    var clear = el('button', 'btn btn--secondary', 'Clear answers');
    clear.type = 'button';
    actions.appendChild(submit);
    actions.appendChild(clear);
    form.appendChild(actions);

    // A hidden message that screen readers announce politely.
    var live = el('p', 'sr-only');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    form.appendChild(live);

    // The results area, under the form. Hidden until first submit.
    var results = el('div', 'finder__results');
    results.setAttribute('role', 'region');
    results.setAttribute('aria-labelledby', 'finder-status');
    results.hidden = true;

    /* --- Small helpers that need the form --- */

    function announce(message) {
      live.textContent = '';
      window.setTimeout(function () {
        live.textContent = message;
      }, 60);
    }

    function readAnswers() {
      var answers = {};
      FINDER_QUESTIONS.forEach(function (question) {
        var checked = form.querySelector('input[name="' + question.name + '"]:checked');
        answers[question.name] = checked ? checked.value : '';
      });
      return answers;
    }

    function unansweredQuestions(answers) {
      return FINDER_QUESTIONS.filter(function (question) {
        return !answers[question.name];
      });
    }

    function hideError() {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }

    function setAnswer(name, value) {
      var input = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (input) {
        input.checked = true;
      }
    }

    // Moves keyboard and screen reader focus to the results heading,
    // which makes assistive technology read the outcome out, then
    // scrolls it into view (without animation if motion is reduced).
    function showResultsToVisitor() {
      var status = document.getElementById('finder-status');
      if (!status) {
        return;
      }
      try {
        status.focus({ preventScroll: true });
      } catch (error) {
        status.focus();
      }
      try {
        results.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      } catch (error) {
        results.scrollIntoView();
      }
    }

    /* --- Showing results --- */

    function renderResults(answers) {
      var outcome = findMatches(answers);
      var count = outcome.shown.length;

      clearNode(results);

      // The heading-like line that gets focus.
      var status = el(
        'div',
        'finder__status',
        count ? plantCount(count) + ' to consider for your space' : 'No strong match for this combination'
      );
      status.id = 'finder-status';
      status.setAttribute('tabindex', '-1');
      results.appendChild(status);

      // Repeat the visitor's answers back to them.
      results.appendChild(
        el(
          'p',
          'finder__note',
          'You chose ' +
            phraseFor('sun', answers.sun) + ', ' +
            phraseFor('heat', answers.heat) + ', ' +
            phraseFor('space', answers.space) + ' and ' +
            phraseFor('experience', answers.experience) + '.'
        )
      );

      if (count) {
        // Extra context, only when it applies.
        if (outcome.all.length > count) {
          results.appendChild(
            el('p', 'finder__note', 'Showing the ' + count + ' closest matches out of ' + outcome.all.length + '.')
          );
        }
        if (!outcome.shown.some(function (match) { return match.ideal; })) {
          results.appendChild(
            el('p', 'finder__note', 'None of these is an ideal match, so treat them as options to try with care.')
          );
        }
        if (outcome.heldBack > 0) {
          results.appendChild(
            el(
              'p',
              'finder__note',
              'Plants that need steadier care are left out for beginners. Choose \u201Csome gardening experience\u201D to include them.'
            )
          );
        }

        // The result cards.
        var grid = el('ul', 'result-grid');
        grid.setAttribute('role', 'list');
        outcome.shown.forEach(function (match) {
          grid.appendChild(buildResultCard(match, answers));
        });
        results.appendChild(grid);
      } else {
        // No match: explain why and offer a one-answer change.
        results.appendChild(el('p', 'finder__note', explainNoMatch(answers)));

        var picks = suggestChanges(answers);
        if (picks.length) {
          results.appendChild(
            el(
              'p',
              'finder__note',
              'Rather than show plants that would struggle, try changing one answer. If one of yours was a close call, a neighbouring option may help:'
            )
          );
          var suggestions = el('div', 'finder__actions');
          picks.forEach(function (pick) {
            var button = el(
              'button',
              'btn btn--secondary btn--sm',
              pick.question.legend + ': ' + pick.option.label + ' (' + plantCount(pick.count) + ')'
            );
            button.type = 'button';
            button.setAttribute('data-finder-question', pick.question.name);
            button.setAttribute('data-finder-value', pick.option.value);
            suggestions.appendChild(button);
          });
          results.appendChild(suggestions);
        } else {
          results.appendChild(
            el('p', 'finder__note', 'Try changing one answer, or read the guides to check your light first.')
          );
        }
      }

      results.appendChild(buildGuideNote());
      results.appendChild(buildStartOver());

      results.hidden = false;
      showResultsToVisitor();
    }

    /* --- Resetting --- */

    function resetFinder() {
      form.reset();
      hideError();
      clearNode(results);
      results.hidden = true;
      announce('Your answers have been cleared.');

      var first = form.querySelector('input[type="radio"]');
      if (first) {
        first.focus();
      }
    }

    /* --- Events --- */

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var answers = readAnswers();
      var missing = unansweredQuestions(answers);

      if (missing.length) {
        var names = missing.map(function (question) {
          return question.legend;
        });
        errorBox.textContent = 'Please choose an answer for: ' + names.join(', ') + '.';
        errorBox.hidden = false;

        var firstMissing = form.querySelector('input[name="' + missing[0].name + '"]');
        if (firstMissing) {
          firstMissing.focus();
        }
        return;
      }

      hideError();
      renderResults(answers);
    });

    // Once everything is answered, the reminder is no longer needed.
    form.addEventListener('change', function () {
      if (!errorBox.hidden && unansweredQuestions(readAnswers()).length === 0) {
        hideError();
      }
    });

    clear.addEventListener('click', resetFinder);

    // One listener handles every button inside the results
    // ("Start over" and the "try changing one answer" buttons).
    results.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button') : null;
      if (!button) {
        return;
      }

      if (button.hasAttribute('data-finder-reset')) {
        resetFinder();
        return;
      }

      var name = button.getAttribute('data-finder-question');
      var value = button.getAttribute('data-finder-value');
      if (name && value) {
        setAnswer(name, value);
        renderResults(readAnswers());
      }
    });

    // --- Swap in the new form. This is the last step. ---
    oldBox.parentNode.replaceChild(form, oldBox);
    finder.appendChild(results);
  }


  /* ---------------------------------------------------------
     4. SCROLL REVEAL
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

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
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
     5. CURRENT YEAR
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
     6. OPTIONAL PHOTOS INSIDE ".media"
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
    safely(setupPlantFinder);
    safely(setupReveal);
    safely(setupYear);
    safely(setupMediaFallbacks);
  });
})();
