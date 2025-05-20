import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;
const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);


async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

let data = await loadData();

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/katrinasuherman/portfolio-lab1/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: true,
        configurable: true,
        enumerable: false,
      });

      return ret;
    });
}

let commits = processCommits(data);

function renderCommitInfo(data, commits) {
  d3.select('#stats').append('h2').text('Summary');
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const numFiles = d3.groups(data, d => d.file).length;
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  const maxLineLength = d3.max(data, d => d.length);
  dl.append('dt').text('Longest Line');
  dl.append('dd').text(maxLineLength);

  const fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  const maxLines = d3.max(fileLengths, d => d[1]);
  dl.append('dt').text('Max Lines');
  dl.append('dd').text(maxLines);

  const avgFileLength = d3.mean(fileLengths, d => d[1]);
  dl.append('dt').text('Avg File Length');
  dl.append('dd').text(Math.round(avgFileLength));
}
renderCommitInfo(data, commits);

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleDateString('en', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit'
  });

  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [x0, x1] = selection.map(d => d[0]);
  const [y0, y1] = selection.map(d => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selected = selection
    ? filteredCommits.filter(d => isCommitSelected(selection, d))
    : [];
  document.querySelector('#selection-count').textContent =
    `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection) {
  const selected = selection
    ? filteredCommits.filter(d => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selected.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selected.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
  }
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

// === Step 1.1: Filtering UI Variables ===
let commitProgress = 100;

let timeScale = d3.scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

// Display initial time
const selectedTime = d3.select('#selectedTime');
selectedTime.text(commitMaxTime.toLocaleString(undefined, {
  dateStyle: "long",
  timeStyle: "short"
}));

// === Step 1.2: Filtering Logic ===
let filteredCommits = [];

function filterCommitsByTime() {
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}

function updateScatterPlot(data, filteredCommits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  d3.select('svg').remove(); // Clear existing

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const dots = svg.append('g').attr('class', 'dots');
  const sortedCommits = d3.sort(filteredCommits, d => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// === Slider Event Listener ===
d3.select('#slider').on('input', function () {
  commitProgress = +this.value;
  commitMaxTime = timeScale.invert(commitProgress);

  selectedTime.text(commitMaxTime.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short"
  }));

  filterCommitsByTime();
  updateScatterPlot(data, filteredCommits);
  renderFilesFromCommits(filteredCommits);

});

// === Initial Render ===
filterCommitsByTime();
updateScatterPlot(data, filteredCommits);
renderFilesFromCommits(filteredCommits);


function renderFilesFromCommits(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }));

  // Step 2.3: Sort files by number of lines (descending)
  files = d3.sort(files, (d) => -d.lines.length);

  const filesContainer = d3.select('.files');
  filesContainer.selectAll('div').remove(); // Clear previous render

  const fileDivs = filesContainer.selectAll('div')
    .data(files)
    .enter()
    .append('div');

    fileDivs.append('dt')
    .style('grid-column', 1)
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  
  fileDivs.append('dd')
    .style('grid-column', 2)
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type)); // 🔥 color by type
  

}


let NUM_ITEMS = commits.length; // Ideally the length of your commit history
let ITEM_HEIGHT = 110;
let VISIBLE_COUNT = 10;
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);

const itemsContainer = d3.select('#items-container');

scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(
    0,
    Math.min(startIndex, commits.length - VISIBLE_COUNT),
  );
  renderItems(startIndex);
  
    const currentDate = commits[startIndex].datetime.toLocaleDateString("en", {
      dateStyle: "medium"
    });
    d3.select("#scroll-indicator").text(currentDate);
  
});

function renderItems(startIndex) {
  // Clear previous items
  itemsContainer.selectAll('div').remove();

  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let newCommitSlice = commits.slice(startIndex, endIndex);

  // ✅ Set global filteredCommits to the visible slice
  filteredCommits = newCommitSlice;

  // ✅ Update chart and file view using filtered slice
  updateScatterPlot(data, filteredCommits);
  displayCommitFiles();

  // ✅ Display dummy narrative for each visible commit
  itemsContainer.selectAll('div')
    .data(newCommitSlice)
    .enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, index) => {
      const fileCount = d3.rollups(commit.lines, D => D.length, d => d.file).length;
      return `
        <p>
          On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, I made
          <a href="${commit.url}" target="_blank">
            ${index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
          </a>.
          I edited ${commit.totalLines} lines across ${fileCount} files.
          Then I looked over all I had made, and I saw that it was very good.
        </p>`;
    })
    .style('position', 'absolute')
    .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);
}


renderItems(0);

function displayCommitFiles() {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });

  files = d3.sort(files, (d) => -d.lines.length);

  d3.select('.files').selectAll('div').remove();

  let filesContainer = d3
    .select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');

  filesContainer
    .append('dt')
    .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  filesContainer
    .append('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', (d) => fileTypeColors(d.type));
}
