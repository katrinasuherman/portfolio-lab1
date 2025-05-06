import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

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
  
        // Add hidden 'lines' property
        Object.defineProperty(ret, 'lines', {
          value: lines,
          writable: true,
          configurable: true,
          enumerable: false  // hides it from console.log
        });
  
        return ret;
      });
  }
  
  // Call it after loading the data
let commits = processCommits(data);
  
function renderCommitInfo(data, commits) {
    d3.select('#stats').append('h2').text('Summary');
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of files
    const numFiles = d3.groups(data, d => d.file).length;
    dl.append('dt').text('Files');
    dl.append('dd').text(numFiles);
  
    // Longest line length
    const maxLineLength = d3.max(data, d => d.length);
    dl.append('dt').text('Longest Line');
    dl.append('dd').text(maxLineLength);
  
    // Max lines in a file
    const fileLengths = d3.rollups(
      data,
      v => d3.max(v, d => d.line),
      d => d.file
    );
    const maxLines = d3.max(fileLengths, d => d[1]);
    dl.append('dt').text('Max Lines');
    dl.append('dd').text(maxLines);

    // Avg line of code in each file
    const avgFileLength = d3.mean(fileLengths, d => d[1]);
    dl.append('dt').text('Avg File Length');
    dl.append('dd').text(Math.round(avgFileLength));
  }
  
renderCommitInfo(data, commits);
 
function renderScatterPlot(data, commits) {
    // Define chart dimensions
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
  
    // Create SVG
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
  
    const brush = d3.brush().on('start brush end', brushed);
    svg.call(brush);
      

    // Raise dots and all elements after overlay to ensure hover works
    svg.selectAll('.dots, .overlay ~ *').raise();

    // Define scales
    xScale = d3
      .scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([usableArea.left, usableArea.right])
      .nice();
  
    yScale = d3
      .scaleLinear()
      .domain([0, 24])
      .range([usableArea.bottom, usableArea.top]);
  
    // Radius scale for dot size
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt() 
        .domain([minLines, maxLines])
        .range([2, 30]);
  
    // === GRIDLINES ===
    // Add gridlines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
  
    // === AXES ===
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
  
    svg
      .append('g')
      .attr('transform', `translate(0, ${usableArea.bottom})`)
      .call(xAxis);
  
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .call(yAxis);
  
    // === DOTS ===
    const dots = svg.append('g').attr('class', 'dots');
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    dots
    .selectAll('circle')
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
  
renderScatterPlot(data, commits);      // Renders the scatterplot

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
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }

function createBrushSelector(svg) {
    svg.call(d3.brush());
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

function isCommitSelected(selection, commit) {
    if (!selection) return false;

    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  }
  