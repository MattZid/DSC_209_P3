import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ---------------------------
// 1. Loading data
// ---------------------------
async function loadEmissionData() {
  try {
    const response = await fetch('https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Indicator_1_1_quarterly/FeatureServer/0/query?where=1%3D1&outFields=Country,Unit,Industry,Gas_Type,Seasonal_Adjustment,Scale,F2010Q1,F2010Q2,F2010Q3,F2010Q4,F2011Q1,F2011Q2,F2011Q3,F2011Q4,F2012Q1,F2012Q2,F2012Q3,F2012Q4,F2013Q1,F2013Q2,F2013Q3,F2013Q4,F2014Q1,F2014Q2,F2014Q3,F2014Q4,F2015Q1,F2015Q2,F2015Q3,F2015Q4,F2016Q1,F2016Q2,F2016Q3,F2016Q4,F2017Q1,F2017Q2,F2017Q3,F2017Q4,F2018Q1,F2018Q2,F2018Q3,F2018Q4,F2019Q1,F2019Q2,F2019Q3,F2019Q4,F2020Q1,F2020Q2,F2020Q3,F2020Q4,F2021Q1,F2021Q2,F2021Q3,F2021Q4,F2022Q1,F2022Q2,F2022Q3,F2022Q4,F2023Q1,F2023Q2,F2023Q3,F2023Q4,F2024Q1,F2024Q2,F2024Q3,F2024Q4&outSR=4326&f=json');
    const json = await response.json();
    if (!json.features) return [];

    const raw = json.features.map(f => f.attributes);

    const tidy = raw.flatMap(r => {
      return Object.entries(r)
        .filter(([k]) => /^F\d{4}Q\d$/.test(k))
        .map(([key, value]) => {
          const year = key.slice(1, 5);
          const quarter = key.slice(5);
          return {
            Country: r.Country,
            "Gas Type": r.Gas_Type,
            Industry: r.Industry,
            "Seasonal Adjustment": r.Seasonal_Adjustment,
            date: `${year}-${quarter}`,
            emissions: value
          };
        });
    });

    console.log("Loaded tidy data:", tidy.slice(0, 10));
    return tidy;
  } catch (error) {
    console.error('Error loading data:', error);
    return [];
  }
}

const emissionData = await loadEmissionData();
console.log(emissionData.slice(0, 5));
// ---------------------------
// 2. Selectors
// ---------------------------
function getUniqueValues(data, key) {
  return Array.from(new Set(data.map(d => d[key])));
}

const countries = getUniqueValues(emissionData, "Country");
const gasTypes = getUniqueValues(emissionData, "Gas Type");
const industries = getUniqueValues(emissionData, "Industry");

// --- Country checkboxes (multi-select) ---
const countryContainer = d3.select('#Regions_Selector');
countryContainer.selectAll('label')
  .data(countries)
  .join('label')
  .html(d => `<input type="checkbox" value="${d}"> ${d}`);

// --- Gas Type dropdown (single-select) ---
const gasContainer = d3.select('#Gas_Selector');
gasContainer.append('select')
  .attr('id', 'gas_select')
  .selectAll('option')
  .data(gasTypes)
  .join('option')
  .attr('value', d => d)
  .text(d => d);

// --- Industry dropdown (single-select) ---
const industryContainer = d3.select('#Industry_Selector');
industryContainer.append('select')
  .attr('id', 'industry_select')
  .selectAll('option')
  .data(industries)
  .join('option')
  .attr('value', d => d)
  .text(d => d);

// Helper functions to get selected values
function getSelectedCountries() {
  return Array.from(countryContainer.selectAll('input:checked').nodes()).map(el => el.value);
}

function getSelectedGas() {
  return d3.select('#gas_select').property('value');
}

function getSelectedIndustry() {
  return d3.select('#industry_select').property('value');
}

// ---------------------------
// 3. SVG
// ---------------------------
const width = 928;
const height = 500;
const margin = { top: 100, right: 30, bottom: 30, left: 60 };

const svg = d3.select("#gas_plot")
  .attr("width", width)
  .attr("height", height);

  const chartGroup = svg.append("g").attr("class", "chart-content");

svg.append("text")
  .attr("x", width / 2)    
  .attr("y", 30)         
  .attr("text-anchor", "middle") 
  .style("font-size", "20px")
  .style("font-weight", "bold")
  .text("Quarterly Greenhouse Gas Emissions");

// Subtitle
svg.append("text")
  .attr("x", width / 2)
  .attr("y", 55)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "gray")
  .text("By Region, Gas Type, and Industry (Seasonally Adjusted)");

const color = d3.scaleOrdinal(d3.schemeTableau10).domain(countries);
const parseDate = d3.timeParse("%Y-Q%q");

// ---------------------------
// 4. Visualization function
// ---------------------------
function updateVisualization() {
  const selectedCountries = getSelectedCountries();
  const selectedGas = getSelectedGas();
  const selectedIndustry = getSelectedIndustry();

  updateLegend(selectedCountries);

  // Filter for selected countries, gas, industry, and seasonally adjusted
  const filtered = emissionData
    .filter(d =>
      selectedCountries.includes(d.Country) &&
      d["Gas Type"] === selectedGas &&
      d.Industry === selectedIndustry &&
      d["Seasonal Adjustment"] === "Seasonally Adjusted"
    )
    .map(d => ({
      country: d.Country,
      date: parseDate(d.date),
      emissions: +d.emissions
    }));

  // Deduplicate by country + date
  // This was from before when I was only filtering by region (graph would look weird with only vertical lines and  
  // I think it may have displayed incorrect info too without filtering by gas/industry)
  // now that we filter gas and industry it shouldn't be needed, but it still works I think so I'm leaving it for now
  const filteredUnique = Array.from(
    d3.rollup(
      filtered,
      v => v[0],
      d => d.country,
      d => d.date.getTime()
    ),
    ([country, dateMap]) => [country, Array.from(dateMap.values())]
  );

  //svg.selectAll("*").remove();
  chartGroup.selectAll("*").remove();
  if (filteredUnique.length === 0) return;

  const allPoints = filteredUnique.flatMap(([, values]) => values);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(allPoints, d => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allPoints, d => d.emissions)]).nice()
    .range([height - margin.bottom, margin.top]);

  // Axes
  chartGroup.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  chartGroup.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .clone()
      .attr("x2", width - margin.left - margin.right)
      .attr("stroke-opacity", 0.1))
    .call(g => g.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", margin.top - 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .text("↑ Emissions (Million metric tons CO₂ eq.)"));

  // Line generator
const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.emissions));

  // Draw lines
  chartGroup.append("g")
    .selectAll("path")
    .data(filteredUnique)
    .join("path")
      .attr("fill", "none")
      .attr("stroke", ([c]) => color(c))
      .attr("stroke-width", 2)
      .attr("d", ([, values]) => line(values.sort((a, b) => a.date - b.date)))
      .append("title")
      .text(([c]) => c);
}

// ---------------------------
// 5. Interactivity
// ---------------------------
countryContainer.selectAll('input').on('change', updateVisualization);
d3.select('#gas_select').on('change', updateVisualization);
d3.select('#industry_select').on('change', updateVisualization);

// Initialize
countryContainer.select("input").property("checked", true);
updateVisualization();

function updateLegend(selectedCountries) {
  const legendContainer = d3.select("#legend");

  const legendItems = legendContainer.selectAll(".legend-item")
    .data(selectedCountries, d => d);

  legendItems.exit().remove();

  const newItems = legendItems.enter()
    .append("div")
    .attr("class", "legend-item")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin", "4px 0");

  newItems.append("span")
    .style("width", "15px")
    .style("height", "15px")
    .style("border-radius", "3px")
    .style("margin-right", "8px")
    .style("background-color", d => color(d));

  newItems.append("span")
    .text(d => d);

  legendItems.select("span:first-child")
    .style("background-color", d => color(d));
}