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
