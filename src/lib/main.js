/* ============================================================
   Da.Signa — interactions
   Vanilla JS, no dependencies. Progressive enhancement:
   everything degrades to readable static content without JS.
   ============================================================ */
(function () {
  "use strict";

  const mq = (q) => window.matchMedia(q);
  const isMobile = mq("(max-width: 860px)");
  const prefersReduced = mq("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lenis smooth scroll ---------- */
  // Self-hosted Lenis (assets/vendor/lenis.min.js) exposes a global `Lenis`.
  // Disabled when the user prefers reduced motion — native scroll takes over.
  let lenis = null;
  if (typeof Lenis !== "undefined" && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /* ---------- Smooth in-page anchor navigation ---------- */
  const headerEl = document.querySelector("[data-header]");
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      if (!hash || hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const offset = headerEl ? headerEl.offsetHeight + 12 : 0;
      if (lenis) {
        lenis.scrollTo(target, { offset: -offset });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
      }
    });
  });

  /* ---------- Header: shadow on scroll ---------- */
  const header = document.querySelector("[data-header]");
  if (header) {
    const onScroll = () =>
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile drawer menu ---------- */
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    let menuOpen = false;
    const setOpen = (open) => {
      menuOpen = open;
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    toggle.addEventListener("click", () => setOpen(!menuOpen));
    // in-drawer close button(s)
    document.querySelectorAll("[data-menu-close]").forEach((btn) =>
      btn.addEventListener("click", () => setOpen(false))
    );
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ---------- Services: tabs (desktop) / accordion (mobile) ---------- */
  const serviceTabs = Array.from(document.querySelectorAll("[data-service-tab]"));
  const servicePanels = Array.from(
    document.querySelectorAll("[data-service-panel]")
  );

  // Single shared "выбрать" badge — moved into the active panel's body so it
  // sits in flow below the text (centred), matching the Figma layout.
  const serviceBadge = document.querySelector(".services__badge");

  function selectService(id) {
    serviceTabs.forEach((tab) => {
      const active = tab.dataset.serviceTab === id;
      tab.setAttribute("aria-selected", String(active));
    });
    servicePanels.forEach((panel) => {
      const active = panel.dataset.servicePanel === id;
      panel.hidden = !active;
      if (active) {
        const body = panel.querySelector(".services__panel-body");
        if (serviceBadge && body) body.appendChild(serviceBadge);
        panel.classList.remove("is-entering");
        // force reflow to restart the animation
        void panel.offsetWidth;
        panel.classList.add("is-entering");
      }
    });
  }

  // Populate mobile accordion panels by cloning desktop panel content (DRY)
  function buildAccordion(tab) {
    const id = tab.dataset.serviceTab;
    const target = document.querySelector(
      `[data-accordion-panel="${id}"] .services__accordion-content`
    );
    const source = document.querySelector(`[data-service-panel="${id}"]`);
    if (!target || !source || target.childElementCount) return;
    const img = source.querySelector("img");
    const title = source.querySelector(".services__panel-title");
    const text = source.querySelector(".services__panel-text");
    if (img) {
      const c = img.cloneNode(true);
      c.removeAttribute("style");
      target.appendChild(c);
    }
    if (title) target.appendChild(title.cloneNode(true));
    if (text) target.appendChild(text.cloneNode(true));
  }

  function toggleAccordion(tab) {
    buildAccordion(tab);
    const id = tab.dataset.serviceTab;
    const panel = document.querySelector(`[data-accordion-panel="${id}"]`);
    const open = tab.getAttribute("aria-expanded") === "true";
    tab.setAttribute("aria-expanded", String(!open));
    if (panel) panel.classList.toggle("is-open", !open);
  }

  serviceTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (isMobile.matches) toggleAccordion(tab);
      else selectService(tab.dataset.serviceTab);
    });
  });

  if (serviceTabs[0] && !isMobile.matches) {
    selectService(serviceTabs[0].dataset.serviceTab);
  }

  /* ---------- Appointment form ---------- */
  const form = document.querySelector("[data-appointment-form]");
  const modal = document.querySelector("[data-modal]");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    if (lenis) lenis.stop();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    if (lenis) lenis.start();
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest("[data-modal-close]"))
        closeModal();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* phone mask: +7 (XXX) XXX-XX-XX */
  const phone = document.querySelector("[data-phone]");
  if (phone) {
    const format = (digits) => {
      let d = digits.replace(/\D/g, "");
      if (d.startsWith("8")) d = "7" + d.slice(1);
      if (!d.startsWith("7")) d = "7" + d;
      d = d.slice(0, 11);
      const p = d.slice(1);
      let out = "+7";
      if (p.length) out += " (" + p.slice(0, 3);
      if (p.length >= 3) out += ") " + p.slice(3, 6);
      if (p.length >= 6) out += "-" + p.slice(6, 8);
      if (p.length >= 8) out += "-" + p.slice(8, 10);
      return out;
    };
    phone.addEventListener("input", () => {
      phone.value = format(phone.value);
    });
    phone.addEventListener("focus", () => {
      if (!phone.value) phone.value = "+7 (";
    });
  }

  function setError(field, msg) {
    const control = field.querySelector(".field__control");
    const error = field.querySelector(".field__error");
    if (control) control.setAttribute("aria-invalid", msg ? "true" : "false");
    if (error) error.textContent = msg || "";
  }

  if (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;

      const nameField = form.querySelector('[data-field="name"]');
      const name = nameField.querySelector("input");
      if (!name.value.trim()) {
        setError(nameField, "Введите имя");
        ok = false;
      } else setError(nameField, "");

      const phoneField = form.querySelector('[data-field="phone"]');
      const digits = (phone ? phone.value : "").replace(/\D/g, "");
      if (digits.length < 11) {
        setError(phoneField, "Введите корректный номер");
        ok = false;
      } else setError(phoneField, "");

      const serviceField = form.querySelector('[data-field="service"]');
      const service = serviceField.querySelector("select");
      if (!service.value) {
        setError(serviceField, "Выберите услугу");
        ok = false;
      } else setError(serviceField, "");

      if (!ok) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }

      // In production: POST to the booking endpoint / WordPress REST here.
      form.reset();
      if (phone) phone.value = "";
      openModal();
    });
  }

  /* ---------- Branches slider: drag up/down to scroll ---------- */
  const branchesCol = document.querySelector("[data-drag-scroll]");
  if (branchesCol) {
    let dragging = false;
    let startY = 0;
    let startScroll = 0;

    const onDown = (e) => {
      dragging = true;
      startY = e.clientY;
      startScroll = branchesCol.scrollTop;
      branchesCol.classList.add("is-grabbing");
      branchesCol.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging) return;
      branchesCol.scrollTop = startScroll - (e.clientY - startY);
    };
    const onUp = () => {
      dragging = false;
      branchesCol.classList.remove("is-grabbing");
    };

    branchesCol.addEventListener("pointerdown", onDown);
    branchesCol.addEventListener("pointermove", onMove);
    branchesCol.addEventListener("pointerup", onUp);
    branchesCol.addEventListener("pointercancel", onUp);
    branchesCol.addEventListener("pointerleave", onUp);
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Current year ---------- */
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
