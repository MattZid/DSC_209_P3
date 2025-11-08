import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

console.log(d3);

async function loadEmissionData() {
  const localPath = './Data/quarterly_greenhouse_long.json';
  const ghPagesPath = 'https://mattzidell.github.io/DSC_209_P3/P3/D3_Visualization_Web_App/Data/quarterly_greenhouse_long.json';
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '';
  // Pull from GitHub Pages when hosted there; default to the local file otherwise
  const dataUrl = (host.endsWith('github.io') && !isLocalhost) ? ghPagesPath : localPath;

  try {
    const response = await fetch(dataUrl);
    const emissionData = await response.json();
    return emissionData;
  } catch (error) {
    console.error('Error loading data:', error);
    return [];
  }
}
const emissionData = await loadEmissionData();
console.log(emissionData);


function regionSelection(data) {
  const regionsSet = new Set(data.map(d => d.Country));
  return Array.from(regionsSet);
}

const countries = regionSelection(emissionData);

function renderRegionSelector(regions) {
  const selector = d3.select('#Regions_Selector');
  const labels = selector.selectAll('label.region-option')
    .data(regions, d => d)
    .join(enter => {
      const label = enter.append('label')
        .attr('class', 'region-option');

      label.append('input')
        .attr('type', 'checkbox')
        .attr('name', 'region');

      label.append('span');

      return label;
    });

  labels.select('input')
    .attr('value', d => d);

  labels.select('span')
  .text(d => d);
  }

renderRegionSelector(countries);

console.log(countries);
