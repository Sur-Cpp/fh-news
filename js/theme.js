export function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const htmlElement = document.documentElement;
  const navbar = document.querySelector(".navbar");
  const savedTheme = localStorage.getItem("theme") || "light";

  function setTheme(theme) {
    if (theme === "dark") {
      htmlElement.setAttribute("data-bs-theme", "dark");
      if (navbar) {
        navbar.classList.remove("navbar-light", "bg-light");
        navbar.classList.add("navbar-dark", "bg-dark");
      }
      if (themeToggle) themeToggle.checked = true;
    } else {
      htmlElement.setAttribute("data-bs-theme", "light");
      if (navbar) {
        navbar.classList.remove("navbar-dark", "bg-dark");
        navbar.classList.add("navbar-light", "bg-light");
      }
      if (themeToggle) themeToggle.checked = false;
    }
    localStorage.setItem("theme", theme);
  }

  setTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("change", function () {
      setTheme(this.checked ? "dark" : "light");
    });
  }
}
