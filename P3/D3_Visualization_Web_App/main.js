import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

console.log(d3);

async function loadEmissionData() {
  try {
    const response = await fetch('./Data/quarterly_greenhouse_long.json');
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
