import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  titleElement.textContent = `${projects.length} Projects`;
}   

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);  // matches the radius of the viewBox

let arc = arcGenerator({
  startAngle: 0,
  endAngle: 2 * Math.PI,  // full circle in radians
});

d3.select('svg').append('path').attr('d', arc).attr('fill', 'red');


let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year,
);

let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});


let sliceGenerator = d3.pie().value((d) => d.value);
           
let arcData = sliceGenerator(data);        

let arcs = arcData.map((d) => arcGenerator(d));

let colors = d3.scaleOrdinal(d3.schemeTableau10);


arcs.forEach((arc, idx) => {
  d3.select('svg')
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(idx));
});

let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
});

let query = '';
let selectedIndex = -1;

let searchInput = document.querySelector('.searchBar');

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
  // re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // re-calculate slice generator, arc data, arc, etc.
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  // TODO: clear up paths and legends
  let newSVG = d3.select('svg');
  newSVG.selectAll('path').remove();
  d3.select('.legend').selectAll('li').remove();

  // update paths and legends, refer to steps 1.4 and 2.2
  let newColors = d3.scaleOrdinal(d3.schemeTableau10);

  newArcs.forEach((arc, idx) => {
    newSVG
      .append('path')
      .attr('d', arc)
      .attr('fill', newColors(idx))
      .attr('class', idx === selectedIndex ? 'selected' : null)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        renderPieChart(projectsGiven);
  
        // update path classes
        newSVG.selectAll('path')
          .attr('class', (_, i) => i === selectedIndex ? 'selected' : null);
  
        // update legend item classes
        d3.select('.legend')
          .selectAll('li')
          .attr('class', (_, i) => i === selectedIndex ? 'legend-item selected' : 'legend-item');
      });
  });
  

  newData.forEach((d, idx) => {
    d3.select('.legend')
      .append('li')
      .attr('style', `--color:${newColors(idx)}`)
      .attr('class', idx === selectedIndex ? 'legend-item selected' : 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
  
  if (selectedIndex === -1) {
    renderProjects(projectsGiven, projectsContainer, 'h2');
  } else {
    let selectedYear = newData[selectedIndex].label;
    let filteredByYear = projectsGiven.filter(p => p.year === selectedYear);
    renderProjects(filteredByYear, projectsContainer, 'h2');
  }
  
}

// Call this function on page load
renderPieChart(projects);

searchInput.addEventListener('change', (event) => {
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(event.target.value.toLowerCase());
  });

  // re-render legends and pie chart when event triggers
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});


