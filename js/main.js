let currentNewsUrl = "";
let currentNewsData = null;

function updateCurrentDate() {
  const now = new Date();
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  document.getElementById("currentDate").textContent = now.toLocaleDateString(
    "en-US",
    options
  );

  updateNewsUrl(now);
}

function updateNewsUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  currentNewsUrl = `./data/news-${year}-${month}-${day}.json`;

  loadNewsContent(currentNewsUrl);
}

function initializeDatePicker() {
  const datePicker = document.getElementById("datePicker");
  const today = new Date();
  const dateString = today.toISOString().split("T")[0];
  datePicker.value = dateString;

  datePicker.addEventListener("change", function () {
    const selectedDate = new Date(this.value + "T00:00:00");
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    console.log(
      "Selected date:",
      selectedDate.toLocaleDateString("en-US", options)
    );

    updateNewsUrl(selectedDate);
  });
}

async function loadNewsContent(url) {
  const newsContent = document.getElementById("newsContent");
  const loadingSpinner = document.getElementById("loadingSpinner");

  try {
    newsContent.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading news content...</p>
                    </div>
                `;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newsData = await response.json();
    currentNewsData = newsData;

    renderNewsContent(newsData);
  } catch (error) {
    console.log("No content found for this date:", error.message);
    renderNoContent();
  }
}

function parseFormattedText(text) {
  if (!text) return "";

  const allowedTags = [
    "b",
    "i",
    "sub",
    "sup",
    "small",
    "big",
    "ins",
    "del",
    "mark",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ];

  const tagRegex = /<\/?([a-z0-9]+)>/gi;

  return text.replace(tagRegex, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : "";
  });
}

function renderNewsContent(data) {
  const newsContent = document.getElementById("newsContent");

  newsContent.innerHTML = "";

  data.news.forEach((section) => {
    const borderColor = section.borderColor || "#007bff";

    let cardHtml = `
      <div class="news-section" style="border-left: 4px solid ${borderColor}">
        <h1 class="news-heading" style="color: ${borderColor}; border-bottom: 2px solid ${borderColor};">
          ${section.heading}
        </h1>
    `;

    if (section.images) {
      cardHtml += `
        <div class="text-center">
          <img src="${section.images}" alt="News Image" 
               class="news-image" 
               onerror="this.style.display='none'">
        </div>
      `;
    }

    if (section.text) {
      Object.values(section.text).forEach((paragraph) => {
        if (paragraph && paragraph.trim() !== "") {
          const formatted = parseFormattedText(paragraph);
          cardHtml += `<p class="news-paragraph">${formatted}</p>`;
        }
      });
    }

    cardHtml += `
        <div class="mt-4">
          <small class="text-muted">Section: ${section.section}</small>
        </div>
      </div>
    `;

    newsContent.innerHTML += cardHtml;
  });
}

function renderNoContent() {
  const newsContent = document.getElementById("newsContent");
  const selectedDate = document.getElementById("datePicker").value;

  newsContent.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-newspaper"></i>
                    <h3>No Content Available</h3>
                    <p>No news content found for ${selectedDate}</p>
                    <p class="text-muted">Please select a different date or check back later.</p>
                </div>
            `;
}

function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const htmlElement = document.documentElement;
  const navbar = document.querySelector(".navbar");

  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);

  function setTheme(theme) {
    if (theme === "dark") {
      htmlElement.setAttribute("data-bs-theme", "dark");
      navbar.classList.remove("navbar-light", "bg-light");
      navbar.classList.add("navbar-dark", "bg-dark");
      themeToggle.checked = true;
    } else {
      htmlElement.setAttribute("data-bs-theme", "light");
      navbar.classList.remove("navbar-dark", "bg-dark");
      navbar.classList.add("navbar-light", "bg-light");
      themeToggle.checked = false;
    }
    localStorage.setItem("theme", theme);
  }

  themeToggle.addEventListener("change", function () {
    const newTheme = this.checked ? "dark" : "light";
    setTheme(newTheme);
  });
}

function goToNextPage() {
  if (currentNewsData && currentNewsData.nextSection) {
    const nextUrl = currentNewsData.nextSection;
    console.log("Loading next section:", nextUrl);
    loadNewsContent(nextUrl);
  } else {
    alert("No next section available for this content.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateCurrentDate();
  initializeDatePicker();
  initializeTheme();
});
