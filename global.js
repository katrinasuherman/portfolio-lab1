console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                    // Local development
  : "/portfolio-lab1/";    // GitHub Pages deployment folder name

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'meta/', title: 'Meta' },
  { url: 'https://github.com/katrinasuherman', title: 'GitHub' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = !p.url.startsWith('http') ? BASE_PATH + p.url : p.url;
  
    // Create the <a> element
    let a = document.createElement('a');
    a.href = url;
    a.textContent = p.title;
  
    // Highlight the current page
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname
    );
  
    // Open external links (like GitHub) in a new tab
    if (a.host !== location.host) {
      a.target = "_blank";
      a.rel = "noopener noreferrer"; // security best practice
    }
  
    nav.append(a);
  }


const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const autoLabel = prefersDark ? "Automatic (Dark)" : "Automatic (Light)";

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">${autoLabel}</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

function setColorScheme(scheme) {
    document.documentElement.style.setProperty('color-scheme', scheme);
    localStorage.colorScheme = scheme;
    select.value = scheme;
  }

let select = document.querySelector('label.color-scheme select');

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', event => {
  setColorScheme(event.target.value);
});

const form = document.querySelector('#contact-form');

form?.addEventListener('submit', event => {
  event.preventDefault(); // prevent normal form submission

  const data = new FormData(form);
  const params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  const url = `${form.action}?${params.join('&')}`;
  location.href = url;
});

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    console.log(response); // Check the response in DevTools

    // Handle error if fetch fails
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    // Parse and return the JSON
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    return null; // Prevent the app from breaking
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // Validate container
  if (!containerElement) {
    console.error('renderProjects error: Invalid containerElement.');
    return;
  }

  // Validate heading level (only allow h1–h6)
  if (!/^h[1-6]$/.test(headingLevel)) {
    console.warn(`Invalid heading level "${headingLevel}". Defaulting to <h2>.`);
    headingLevel = 'h2';
  }

  // Clear existing content
  containerElement.innerHTML = '';

  // Validate projects input
  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = `<p>No projects to display at this time.</p>`;
    return;
  }

  // Loop through projects and render each
  for (let project of projects) {
    const article = document.createElement('article');

    // Fallbacks for missing data
    const title = project.title || 'Untitled Project';
    const image = project.image || 'https://via.placeholder.com/150';
    const description = project.description || 'No description provided.';

    article.innerHTML = `
      <${headingLevel}>${title}</${headingLevel}>
      <img src="${image}" alt="${title}">
      <div>
        <p>${description}</p>
        <p class="project-year">© ${project.year}</p>
      </div>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}