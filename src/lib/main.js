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

  const header = document.querySelector("[data-header]");

  /* ---------- Smooth in-page anchor navigation ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      if (!hash || hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const offset = header ? header.offsetHeight + 12 : 0;
      if (lenis) {
        lenis.scrollTo(target, { offset: -offset });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
      }
    });
  });

  /* ---------- Header: shadow on scroll ---------- */
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

  // Mobile accordion reuses the desktop panel content instead of duplicating
  // it in markup; panels are populated lazily on first open.
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

  /* ---------- Modals (shared overlay: success + doctor) ---------- */
  const form = document.querySelector("[data-appointment-form]");
  const modal = document.querySelector("[data-modal]");

  const FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let modalReturnFocus = null;

  const openModalEl = (el) => {
    if (!el) return;
    modalReturnFocus = document.activeElement;
    el.classList.add("is-open");
    if (lenis) lenis.stop();
    // Defer focus until the dialog is rendered (it animates from visibility:hidden).
    const focusTarget =
      el.querySelector("[data-modal-close]") || el.querySelector(FOCUSABLE);
    if (focusTarget) requestAnimationFrame(() => focusTarget.focus());
  };
  const closeModalEl = (el) => {
    if (!el) return;
    el.classList.remove("is-open");
    if (lenis) lenis.start();
    modalReturnFocus?.focus();
    modalReturnFocus = null;
  };

  // Named helper used by the appointment form below.
  const openModal = () => openModalEl(modal);

  // Backdrop / close-button dismissal for every overlay on the page.
  document.querySelectorAll(".modal").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-modal-close]"))
        closeModalEl(overlay);
    });
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document.querySelectorAll(".modal.is-open").forEach(closeModalEl);
  });

  // Trap Tab focus inside the open modal.
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const open = document.querySelector(".modal.is-open");
    if (!open) return;
    const items = Array.from(open.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------- Doctor modal ---------- */
  const doctorModal = document.querySelector("[data-doctor-modal]");
  if (doctorModal) {
    const slots = {
      photo: doctorModal.querySelector("[data-dm-photo]"),
      tag: doctorModal.querySelector("[data-dm-tag]"),
      name: doctorModal.querySelector("[data-dm-name]"),
      exp: doctorModal.querySelector("[data-dm-exp]"),
      summary: doctorModal.querySelector("[data-dm-summary]"),
      bio: doctorModal.querySelector("[data-dm-bio]"),
    };

    const fillFromCard = (card) => {
      const img = card.querySelector(".doctor-card__img");
      slots.photo.src = img ? img.getAttribute("src") : "";
      slots.photo.alt = img ? img.getAttribute("alt") : "";
      slots.tag.textContent =
        card.querySelector(".doctor-card__tag")?.textContent.trim() || "";
      slots.name.textContent =
        card.querySelector(".doctor-card__name")?.textContent.trim() || "";
      slots.exp.textContent = card.dataset.exp || "";
      slots.summary.textContent = card.dataset.summary || "";
      slots.bio.textContent = card.dataset.bio || "";
    };

    document.querySelectorAll("[data-doctor-open]").forEach((card) => {
      const open = (e) => {
        e.preventDefault();
        fillFromCard(card);
        openModalEl(doctorModal);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") open(e);
      });
    });
  }

  /* ---------- Doctors: filter by specialty ---------- */
  const filterGroup = document.querySelector(".doctor-filters");
  if (filterGroup) {
    const buttons = Array.from(filterGroup.querySelectorAll(".doctor-filter"));
    const cards = Array.from(
      filterGroup.closest("section").querySelectorAll(".doctor-card")
    );

    filterGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".doctor-filter");
      if (!btn) return;
      const specialty = btn.textContent.trim().toLowerCase();
      const showAll = specialty.startsWith("все");

      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("doctor-filter--active", active);
        b.setAttribute("aria-pressed", String(active));
      });

      cards.forEach((card) => {
        const tag =
          card.querySelector(".doctor-card__tag")?.textContent.trim().toLowerCase() ||
          "";
        card.hidden = !(showAll || tag === specialty);
      });
    });
  }

  /* ---------- Phone mask: +7 (___) ___ ____ ---------- */
  const MATRIX = "+7 (___) ___ ____";

  const maskPhone = function (event) {
    const key = event.key;
    const pos = this.selectionStart ?? this.value.length;

    // Protect the static "+7 (" prefix from edits / deletes.
    if (pos < 3 && event.type === "keydown") {
      event.preventDefault();
      return;
    }

    const def = MATRIX.replace(/\D/g, "");
    let val = this.value.replace(/\D/g, "");
    if (def.length >= val.length) val = def;

    let i = 0;
    let next = MATRIX.replace(/[_\d]/g, (a) =>
      i < val.length ? val.charAt(i++) : a
    );

    // Trim the unfilled tail so the caret stays at the live slot.
    i = next.indexOf("_");
    if (i !== -1) {
      if (i < 5) i = 3;
      next = next.slice(0, i);
    }

    let reg = MATRIX.substring(0, this.value.length)
      .replace(/_+/g, (a) => `\\d{1,${a.length}}`)
      .replace(/[+()]/g, "\\$&");
    reg = new RegExp(`^${reg}$`);

    if (
      !reg.test(this.value) ||
      this.value.length < 5 ||
      (key && key.length === 1 && /\d/.test(key))
    ) {
      this.value = next;
    }

    if (event.type === "blur" && this.value.length < 5) this.value = "";
  };

  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach((input) => {
    input.addEventListener("input", maskPhone, false);
    input.addEventListener("focus", maskPhone, false);
    input.addEventListener("blur", maskPhone, false);
    input.addEventListener("keydown", maskPhone, false);
  });

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
      const phoneInput = phoneField.querySelector("input");
      const digits = phoneInput.value.replace(/\D/g, "");
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
      phoneInput.value = "";
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
