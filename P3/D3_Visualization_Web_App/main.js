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

const countrySelect = d3.select('#Regions_Selector');
countrySelect.selectAll('option')
  .data(countries)
  .join('option')
  .attr('value', d => d)
  .text(d => d);

console.log(countries);


test test test

tesing things
