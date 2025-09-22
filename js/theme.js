// theme.js
export function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const htmlElement = document.documentElement;
  const navbar = document.querySelector(".navbar");

  const savedTheme = localStorage.getItem("theme") || "light";

  function setTheme(theme, skipSave = false) {
    htmlElement.setAttribute("data-bs-theme", theme);

    if (navbar) {
      navbar.classList.toggle("navbar-dark", theme === "dark");
      navbar.classList.toggle("bg-dark", theme === "dark");
      navbar.classList.toggle("navbar-light", theme === "light");
      navbar.classList.toggle("bg-light", theme === "light");
    }

    if (themeToggle) {
      themeToggle.checked = theme === "dark";
    }

    if (!skipSave) {
      localStorage.setItem("theme", theme);
    }

    updateBannerOverlay();
  }

  function updateBannerOverlay() {
    const theme = htmlElement.getAttribute("data-bs-theme") || "light";
    const overlay =
      theme === "dark"
        ? "linear-gradient(to bottom, rgba(0,0,0,0.36), rgba(0,0,0,0.28))"
        : "linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0.18))";
    htmlElement.style.setProperty("--banner-overlay", overlay);
  }

  setTheme(savedTheme, true);

  if (themeToggle) {
    themeToggle.addEventListener("change", function () {
      setTheme(this.checked ? "dark" : "light");
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === "theme" && event.newValue) {
      setTheme(event.newValue, true);
    }
  });
}
