const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const copyEmailButton = document.querySelector("[data-copy-email]");
const servicesTrack = document.querySelector("[data-services-track]");
const servicesPrevButton = document.querySelector("[data-carousel-prev]");
const servicesNextButton = document.querySelector("[data-carousel-next]");
const servicesDots = document.querySelector("[data-carousel-dots]");
const scrollTopButton = document.querySelector("[data-scroll-top]");

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
    }
  });
}

if (copyEmailButton) {
  const copyLabel = copyEmailButton.querySelector(".copy-label");
  const originalText = copyLabel?.textContent || "";

  copyEmailButton.addEventListener("click", async () => {
    const email = copyEmailButton.getAttribute("data-copy-email");

    if (!email) {
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = email;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }

    if (copyLabel) {
      copyLabel.textContent = "E-mail copiado";
      window.setTimeout(() => {
        copyLabel.textContent = originalText;
      }, 1800);
    }
  });
}

if (servicesTrack && servicesPrevButton && servicesNextButton && servicesDots) {
  const serviceCards = Array.from(servicesTrack.querySelectorAll(".service-card"));

  const getScrollAmount = () => {
    const firstCard = serviceCards[0];
    const gap = Number.parseFloat(getComputedStyle(servicesTrack).columnGap) || 18;
    return firstCard ? firstCard.getBoundingClientRect().width + gap : 320;
  };

  const getVisibleCards = () => {
    const gap = Number.parseFloat(getComputedStyle(servicesTrack).columnGap) || 18;
    return Math.max(1, Math.floor((servicesTrack.clientWidth + gap) / getScrollAmount()));
  };

  const getPageCount = () => Math.ceil(serviceCards.length / getVisibleCards());

  const getCurrentPage = () => {
    const amount = getScrollAmount() * getVisibleCards();
    return Math.min(
      getPageCount() - 1,
      Math.max(0, Math.round(servicesTrack.scrollLeft / amount))
    );
  };

  const scrollToService = (index) => {
    const targetCard = serviceCards[index];

    if (!targetCard) {
      return;
    }

    servicesTrack.scrollTo({
      left: targetCard.offsetLeft - servicesTrack.offsetLeft,
      behavior: "smooth",
    });
  };

  const scrollToPage = (page) => {
    const visibleCards = getVisibleCards();
    const safePage = Math.min(getPageCount() - 1, Math.max(0, page));
    const targetIndex = Math.min(serviceCards.length - 1, safePage * visibleCards);
    scrollToService(targetIndex);
  };

  const renderDots = () => {
    const pageCount = getPageCount();
    servicesDots.replaceChildren();

    Array.from({ length: pageCount }).forEach((_, index) => {
      const dot = document.createElement("button");
      dot.className = "carousel-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `Ir para grupo de serviços ${index + 1}`);

      dot.addEventListener("click", () => {
        scrollToPage(index);
      });

      servicesDots.appendChild(dot);
    });
  };

  serviceCards.forEach((card) => {
    card.setAttribute("aria-roledescription", "slide");
  });

  let visibleCards = getVisibleCards();
  renderDots();

  const updateCarouselControls = () => {
    const maxScrollLeft = servicesTrack.scrollWidth - servicesTrack.clientWidth - 1;
    const nextVisibleCards = getVisibleCards();

    if (nextVisibleCards !== visibleCards) {
      visibleCards = nextVisibleCards;
      renderDots();
    }

    const currentPage = getCurrentPage();
    const serviceDots = Array.from(servicesDots.querySelectorAll(".carousel-dot"));

    servicesPrevButton.disabled = servicesTrack.scrollLeft <= 1;
    servicesNextButton.disabled = servicesTrack.scrollLeft >= maxScrollLeft;

    serviceDots.forEach((dot, index) => {
      if (index === currentPage) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  };

  servicesPrevButton.addEventListener("click", () => {
    scrollToPage(getCurrentPage() - 1);
  });

  servicesNextButton.addEventListener("click", () => {
    scrollToPage(getCurrentPage() + 1);
  });

  servicesTrack.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollToPage(getCurrentPage() - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollToPage(getCurrentPage() + 1);
    }
  });

  servicesTrack.addEventListener("scroll", updateCarouselControls);
  window.addEventListener("resize", updateCarouselControls);
  updateCarouselControls();
}

if (scrollTopButton) {
  scrollTopButton.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
