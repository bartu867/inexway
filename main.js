(function () {
  "use strict";

  /* Sticky header — subtle shadow state once the page has scrolled past the top. */
  var header = document.getElementById("site-header");
  var scrollThreshold = 8;

  function updateHeaderState() {
    if (window.scrollY > scrollThreshold) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });

  /* Mobile navigation toggle. */
  var navToggle = document.getElementById("nav-toggle");
  var primaryNav = document.getElementById("primary-nav");

  navToggle.addEventListener("click", function () {
    var isOpen = primaryNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  primaryNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      primaryNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* Nav dropdowns (e.g. Yatırım Danışmanlığı > Gayrimenkul Danışmanlığı) —
     click the parent to open its submenu, click elsewhere/Escape to close. */
  document.querySelectorAll(".nav-dropdown").forEach(function (dropdown) {
    var toggle = dropdown.querySelector(".nav-dropdown__toggle");
    var menu = dropdown.querySelector(".nav-dropdown__menu");
    if (!toggle || !menu) return;

    function closeDropdown() {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function (event) {
      event.stopPropagation();
      var isHidden = menu.hidden;
      menu.hidden = !isHidden;
      toggle.setAttribute("aria-expanded", String(isHidden));
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeDropdown);
    });

    document.addEventListener("click", function (event) {
      if (!dropdown.contains(event.target)) closeDropdown();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDropdown();
    });
  });

  /* Profile tabs ("Kimler için uygun") — click or arrow-key between example
     personas; only one panel is shown at a time. Works for any number of
     [data-profile-tabs] widgets on a page. */
  document.querySelectorAll("[data-profile-tabs]").forEach(function (widget) {
    var tabs = Array.prototype.slice.call(widget.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(widget.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || !panels.length) return;

    function selectTab(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.id !== tab.getAttribute("aria-controls");
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { selectTab(tab); });
      tab.addEventListener("keydown", function (event) {
        var newIndex = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") newIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") newIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") newIndex = 0;
        if (event.key === "End") newIndex = tabs.length - 1;
        if (newIndex !== null) {
          event.preventDefault();
          tabs[newIndex].focus();
          selectTab(tabs[newIndex]);
        }
      });
    });
  });

  /* Parallax — decorative visuals ([data-parallax]) drift a fraction of the
     scroll speed while they're in view. Off for reduced-motion users and on
     narrow viewports, where the effect reads as jitter rather than depth. */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (parallaxEls.length && !prefersReducedMotion && window.innerWidth >= 700 && "IntersectionObserver" in window) {
    var elsInView = [];
    var frameQueued = false;

    function applyParallax() {
      elsInView.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax-speed")) || 0.15;
        var rect = el.getBoundingClientRect();
        var viewportCenter = window.innerHeight / 2;
        var elCenter = rect.top + rect.height / 2;
        var offset = (viewportCenter - elCenter) * speed;
        el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
      frameQueued = false;
    }

    function queueParallax() {
      if (!frameQueued) {
        frameQueued = true;
        window.requestAnimationFrame(applyParallax);
      }
    }

    var parallaxObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var idx = elsInView.indexOf(entry.target);
        if (entry.isIntersecting && idx === -1) {
          elsInView.push(entry.target);
        } else if (!entry.isIntersecting && idx !== -1) {
          elsInView.splice(idx, 1);
          entry.target.style.transform = "";
        }
      });
      queueParallax();
    }, { rootMargin: "20% 0px" });

    parallaxEls.forEach(function (el) { parallaxObserver.observe(el); });
    window.addEventListener("scroll", queueParallax, { passive: true });
    window.addEventListener("resize", queueParallax, { passive: true });
  }

  /* Language switch — translates every [data-i18n] element on the page and
     persists the choice, so it carries over to the next page navigated to. */
  var dictionaries = window.INEXWAY_I18N || { tr: {} };
  var currentLang = localStorage.getItem("inexway-lang") || "tr";
  if (!dictionaries[currentLang]) currentLang = "tr";

  function t(key) {
    var dict = dictionaries[currentLang] || dictionaries.tr;
    return dict && dict[key] !== undefined ? dict[key] : key;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    var titleKey = document.documentElement.getAttribute("data-i18n-title");
    if (titleKey) document.title = t(titleKey);
  }

  applyTranslations();

  /* Hero headline rotator (home page only) — cycles through headline
     variants every 7s with a crossfade. Paused for reduced-motion users. */
  var headlineItems = Array.prototype.slice.call(document.querySelectorAll(".hero__headline-item"));
  if (headlineItems.length > 1 && !prefersReducedMotion) {
    var activeHeadlineIndex = Math.max(0, headlineItems.findIndex(function (el) {
      return el.classList.contains("is-active");
    }));
    setInterval(function () {
      headlineItems[activeHeadlineIndex].classList.remove("is-active");
      activeHeadlineIndex = (activeHeadlineIndex + 1) % headlineItems.length;
      headlineItems[activeHeadlineIndex].classList.add("is-active");
    }, 7000);
  }

  var langSwitch = document.getElementById("lang-switch");
  if (langSwitch) {
    var langToggle = document.getElementById("lang-switch-toggle");
    var langMenu = document.getElementById("lang-switch-menu");
    var langFlag = document.getElementById("lang-switch-flag");

    var languages = {
      tr: { flag: "🇹🇷", label: "Türkçe" },
      en: { flag: "🇬🇧", label: "English" },
      ru: { flag: "🇷🇺", label: "Русский" }
    };

    function renderLangMenu(currentCode) {
      langMenu.innerHTML = "";
      Object.keys(languages).forEach(function (code) {
        if (code === currentCode) return;
        var lang = languages[code];
        var item = document.createElement("li");
        item.setAttribute("role", "option");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "lang-switch__option";
        button.setAttribute("data-lang", code);
        button.innerHTML = '<span class="lang-switch__flag" aria-hidden="true">' + lang.flag + "</span>" + lang.label;
        item.appendChild(button);
        langMenu.appendChild(item);
      });
    }

    function closeLangMenu() {
      langMenu.hidden = true;
      langToggle.setAttribute("aria-expanded", "false");
    }

    function updateToggle(code) {
      var lang = languages[code];
      langFlag.textContent = lang.flag;
      langToggle.setAttribute("aria-label", t("lang.ariaLabel") + " " + lang.label);
      renderLangMenu(code);
    }

    function selectLanguage(code) {
      if (code === currentLang) {
        closeLangMenu();
        return;
      }
      currentLang = code;
      localStorage.setItem("inexway-lang", code);
      applyTranslations();
      updateToggle(code);
      closeLangMenu();
    }

    updateToggle(currentLang);

    langToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      var isHidden = langMenu.hidden;
      langMenu.hidden = !isHidden;
      langToggle.setAttribute("aria-expanded", String(isHidden));
    });

    langMenu.addEventListener("click", function (event) {
      var button = event.target.closest("[data-lang]");
      if (!button) return;
      selectLanguage(button.getAttribute("data-lang"));
    });

    document.addEventListener("click", function (event) {
      if (!langSwitch.contains(event.target)) closeLangMenu();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeLangMenu();
    });
  }

  /* Cookie / local-storage consent banner — shown on first visit on every
     page until the visitor accepts or rejects. Choice is stored so the
     banner doesn't reappear; it can be reopened via the footer's
     "Çerez Tercihleri" / "Cookie Preferences" link at any time. */
  var COOKIE_CONSENT_KEY = "inexway-cookie-consent";
  var cookieBanner = null;

  function buildCookieBanner() {
    var banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Cookie consent");

    var text = document.createElement("p");
    text.className = "cookie-banner__text";
    text.setAttribute("data-i18n", "cookie.message");
    text.textContent = t("cookie.message");

    var link = document.createElement("a");
    link.className = "cookie-banner__link";
    link.href = "gizlilik-politikasi#cerezler";
    link.setAttribute("data-i18n", "cookie.policyLinkText");
    link.textContent = t("cookie.policyLinkText");
    text.appendChild(document.createTextNode(" "));
    text.appendChild(link);

    var actions = document.createElement("div");
    actions.className = "cookie-banner__actions";

    var rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "button cookie-banner__reject";
    rejectBtn.setAttribute("data-i18n", "cookie.reject");
    rejectBtn.textContent = t("cookie.reject");

    var acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "button button--primary cookie-banner__accept";
    acceptBtn.setAttribute("data-i18n", "cookie.accept");
    acceptBtn.textContent = t("cookie.accept");

    actions.appendChild(rejectBtn);
    actions.appendChild(acceptBtn);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    function hideBanner(choice) {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ status: choice, ts: Date.now() }));
      banner.classList.remove("is-visible");
    }

    acceptBtn.addEventListener("click", function () { hideBanner("accepted"); });
    rejectBtn.addEventListener("click", function () { hideBanner("rejected"); });

    return banner;
  }

  function showCookieBanner() {
    if (!cookieBanner) cookieBanner = buildCookieBanner();
    requestAnimationFrame(function () { cookieBanner.classList.add("is-visible"); });
  }

  var storedConsent = null;
  try { storedConsent = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)); } catch (e) { storedConsent = null; }
  if (!storedConsent || !storedConsent.status) {
    showCookieBanner();
  }

  document.querySelectorAll("[data-cookie-settings]").forEach(function (btn) {
    btn.addEventListener("click", function () { showCookieBanner(); });
  });

  /* Contact form validation — only present on iletisim.html. */
  var form = document.getElementById("contact-form");
  if (!form) return;

  var successMessage = document.getElementById("form-success");

  /* TODO: paste your Web3Forms access key here — get one free, instantly, at
     https://web3forms.com/ (enter inexwayhr@gmail.com, no account needed).
     Until this is set, email delivery is skipped but WhatsApp still opens. */
  var WEB3FORMS_ACCESS_KEY = "6a69346a-a853-43d4-9180-a5e150b582f5";
  var WHATSAPP_NUMBER = "48578640306";

  var validators = {
    name: function (value) {
      return value.trim().length > 0 ? "" : t("form.errorName");
    },
    email: function (value) {
      var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value.trim().length === 0) return t("form.errorEmailRequired");
      return pattern.test(value.trim()) ? "" : t("form.errorEmailInvalid");
    },
    phone: function (value) {
      var digits = value.replace(/[^0-9]/g, "");
      if (digits.length === 0) return t("form.errorPhoneRequired");
      return digits.length >= 10 ? "" : t("form.errorPhoneInvalid");
    },
    service: function (value) {
      return value ? "" : t("form.errorService");
    },
    message: function (value) {
      return value.trim().length > 0 ? "" : t("form.errorMessage");
    },
    consent: function (value) {
      return value ? "" : t("form.errorConsent");
    }
  };

  function fieldFor(name) {
    return form.elements[name];
  }

  function showError(name, message) {
    var field = fieldFor(name);
    var errorEl = document.getElementById("error-" + name);
    var wrapper = field.closest(".form-field");
    errorEl.textContent = message;
    wrapper.classList.toggle("has-error", Boolean(message));
  }

  function validateField(name) {
    var field = fieldFor(name);
    var value = field.type === "checkbox" ? field.checked : field.value;
    var message = validators[name](value);
    showError(name, message);
    return message === "";
  }

  Object.keys(validators).forEach(function (name) {
    var field = fieldFor(name);
    field.addEventListener("blur", function () {
      validateField(name);
    });
  });

  /* Builds a wa.me link with the form contents pre-filled, so the visitor
     only has to hit "send" inside WhatsApp — no backend required. */
  function buildWhatsAppUrl(formData) {
    var lines = [
      "Yeni görüşme talebi (inexway.com):",
      "Ad soyad: " + formData.name,
      "E-posta: " + formData.email,
      "Telefon: " + formData.phone,
      "Hizmet: " + formData.serviceLabel,
      "Mesaj: " + formData.message
    ];
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  /* Emails the form via Web3Forms (free, no backend). Fails silently if
     WEB3FORMS_ACCESS_KEY hasn't been set yet — WhatsApp still goes out. */
  function submitContactForm(formData) {
    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "Inexway web sitesi - yeni görüşme talebi",
        from_name: formData.name,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        service: formData.serviceLabel,
        message: formData.message
      })
    })
      .then(function (response) { return response.json(); })
      .then(function (result) { return { ok: Boolean(result && result.success) }; })
      .catch(function () { return { ok: false }; });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    successMessage.hidden = true;

    var fieldNames = Object.keys(validators);
    var results = fieldNames.map(validateField);
    var isValid = results.every(Boolean);

    if (!isValid) {
      var firstInvalid = fieldNames[results.indexOf(false)];
      fieldFor(firstInvalid).focus();
      return;
    }

    var serviceField = fieldFor("service");
    var formData = {
      name: fieldFor("name").value.trim(),
      email: fieldFor("email").value.trim(),
      phone: fieldFor("phone").value.trim(),
      service: serviceField.value,
      serviceLabel: serviceField.options[serviceField.selectedIndex].text,
      message: fieldFor("message").value.trim()
    };

    submitContactForm(formData).then(function () {
      form.reset();
      successMessage.hidden = false;
      window.open(buildWhatsAppUrl(formData), "_blank", "noopener");
    });
  });
})();
