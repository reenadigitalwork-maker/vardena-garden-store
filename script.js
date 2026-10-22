(() => {
  const cards = [...document.querySelectorAll(".product")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const search = document.getElementById("search");
  const noResults = document.getElementById("no-results");
  const countEl = document.getElementById("bag-count");
  const toast = document.getElementById("toast");
  let active = "all", count = 0, timer;
  function notify(message) {
    toast.textContent = message; toast.classList.add("show");
    clearTimeout(timer); timer = setTimeout(() => toast.classList.remove("show"), 3000);
  }
  function update() {
    const q = search.value.trim().toLowerCase(); let shown = 0;
    cards.forEach(card => {
      const ok = (active === "all" || card.dataset.category === active) &&
        (!q || (card.dataset.search + " " + card.textContent).toLowerCase().includes(q));
      card.hidden = !ok; if (ok) shown++;
    });
    noResults.hidden = shown !== 0;
  }
  filters.forEach(btn => btn.addEventListener("click", () => {
    active = btn.dataset.filter;
    filters.forEach(f => { const selected = f === btn; f.classList.toggle("active", selected); f.setAttribute("aria-pressed", String(selected)); });
    update();
  }));
  search.addEventListener("input", update);
  document.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => {
    count++; countEl.textContent = count;
    notify(btn.dataset.add + " added to your demo bag. No checkout or payments are connected.");
  }));
  document.querySelector(".bag").addEventListener("click", e => {
    e.preventDefault(); notify(count ? "Your demo bag has " + count + " sample item(s). No checkout is connected." : "Your demo bag is empty. Add an item to try the interaction.");
  });
  document.getElementById("newsletter").addEventListener("submit", e => {
    e.preventDefault(); if (!e.currentTarget.reportValidity()) return;
    document.getElementById("form-note").textContent = "Thanks for trying the demo. Your email has not been sent or stored.";
    e.currentTarget.reset();
  });
})();