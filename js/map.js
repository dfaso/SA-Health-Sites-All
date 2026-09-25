// ============================================================
// CONFIGURATION
// ============================================================

const INITIAL_CENTER = [135.5, -31.5];
const INITIAL_ZOOM = 5;

const SITE_DATA_URL = "./data/combined-sites.geojson";
const LHN_DATA_URL = "./data/LHN.geojson";


// ============================================================
// GLOBAL STATE
// ============================================================

let allSiteData = null;
let currentFilteredData = null;

let currentSortColumn = null;
let currentSortDirection = "asc";


// ============================================================
// MAP SETUP
// ============================================================

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: INITIAL_CENTER,
  zoom: INITIAL_ZOOM
});

map.addControl(
  new maplibregl.NavigationControl(),
  "top-left"
);


// ============================================================
// MAP LOAD
// ============================================================

map.on("load", async () => {

  try {

    await loadLhnBoundaries();
    await loadSiteData();

    populateDropdown(
      "governing-body-filter",
      "Governing Body"
    );

    populateDropdown(
      "geographical-lhn-filter",
      "Geographical LHN"
    );

    attachUiEvents();
    attachMapEvents();

    buildSitesTable(allSiteData);
    updateSiteCount();

  }

  catch (error) {

    console.error(
      "Error loading map data:",
      error
    );

    alert(
      "The map data could not be loaded. Check the browser console for details."
    );

  }

});


// ============================================================
// LOAD LHN BOUNDARIES
// ============================================================

async function loadLhnBoundaries() {

  const response =
    await fetch(LHN_DATA_URL);

  if (!response.ok) {
    throw new Error(
      `Could not load ${LHN_DATA_URL}: ${response.status}`
    );
  }

  const lhnData =
    await response.json();


  map.addSource(
    "lhn-boundaries",
    {
      type: "geojson",
      data: lhnData
    }
  );


  map.addLayer({
    id: "lhn-fill",
    type: "fill",
    source: "lhn-boundaries",

    paint: {

      "fill-color": [
        "match",
        ["get", "lhn_code"],

        "CALHN",  "#2E86AB",
        "SALHN",  "#F18F01",
        "NALHN",  "#D1495B",
        "BHFLHN", "#6A4C93",
        "LCLHN",  "#00A896",
        "RMCLHN", "#F4D35E",
        "EFNLHN", "#577590",
        "YNLHN",  "#43AA8B",
        "FUNLHN", "#F3722C",
        "WCHN",   "#9B5DE5",

        "#999999"
      ],

      "fill-opacity": 0.25
    }
  });


  map.addLayer({
    id: "lhn-outline",
    type: "line",
    source: "lhn-boundaries",

    paint: {
      "line-color": "#000000",
      "line-width": 1
    }
  });

}


// ============================================================
// LOAD SITE DATA
// ============================================================

async function loadSiteData() {

  const response =
    await fetch(SITE_DATA_URL);

  if (!response.ok) {
    throw new Error(
      `Could not load ${SITE_DATA_URL}: ${response.status}`
    );
  }

  allSiteData =
    await response.json();


  currentFilteredData = {
    type: "FeatureCollection",
    features: [...allSiteData.features]
  };


  map.addSource(
    "combined-sites",
    {
      type: "geojson",
      data: currentFilteredData
    }
  );


  map.addLayer({
    id: "combined-sites",
    type: "circle",
    source: "combined-sites",

    paint: {
      "circle-radius": 6,
      "circle-color": "#FF4A4A",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1
    }
  });

}


// ============================================================
// UI EVENTS
// ============================================================

function attachUiEvents() {

  document
    .getElementById(
      "type-filter"
    )
    .addEventListener(
      "change",
      applyFilters
    );
  
  
  document
    .getElementById(
      "governing-body-filter"
    )
    .addEventListener(
      "change",
      applyFilters
    );


  document
    .getElementById(
      "geographical-lhn-filter"
    )
    .addEventListener(
      "change",
      applyFilters
    );


  document
    .getElementById(
      "site-search"
    )
    .addEventListener(
      "input",
      applyFilters
    );


  document
    .getElementById(
      "reset-button"
    )
    .addEventListener(
      "click",
      resetMap
    );


  document
    .getElementById(
      "export-button"
    )
    .addEventListener(
      "click",
      exportCurrentSites
    );

}


// ============================================================
// MAP EVENTS
// ============================================================

function attachMapEvents() {

  const hoverPopup =
    new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10
    });


  // ----------------------------------------------------------
  // SITE HOVER
  // ----------------------------------------------------------

  map.on(
    "mouseenter",
    "combined-sites",
    event => {

      map.getCanvas().style.cursor =
        "pointer";


      if (!event.features.length) {
        return;
      }


      const feature =
        event.features[0];

      const properties =
        feature.properties;

      const coordinates =
        feature.geometry.coordinates.slice();


      const popupHtml = `
        <div style="min-width: 230px">

          <div style="
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
          ">
            ${escapeHtml(properties["Name"])}
          </div>

          <div style="
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
          ">
            ${escapeHtml(properties["Type"])}
          </div>

          <div style="font-size: 12px;">
            ${escapeHtml(properties["Address"])}
          </div>

          <div style="
            font-size: 12px;
            margin-bottom: 8px;
          ">
            ${escapeHtml(properties["Suburb"])}
            ${properties["Postcode"]
              ? " " + escapeHtml(properties["Postcode"])
              : ""}
          </div>

          <div style="font-size: 11px;">
            <strong>LHN:</strong>
            ${escapeHtml(properties["LHN"])}
          </div>

          <div style="font-size: 11px;">
            <strong>Geographical LHN:</strong>
            ${escapeHtml(properties["Geographical LHN"])}
          </div>

          <div style="font-size: 11px;">
            <strong>Governing Body:</strong>
            ${escapeHtml(properties["Governing Body"])}
          </div>

        </div>
      `;


      hoverPopup
        .setLngLat(coordinates)
        .setHTML(popupHtml)
        .addTo(map);

    }
  );


  map.on(
    "mouseleave",
    "combined-sites",
    () => {

      map.getCanvas().style.cursor =
        "";

      hoverPopup.remove();

    }
  );


  // ----------------------------------------------------------
  // SITE CLICK
  // ----------------------------------------------------------

  map.on(
    "click",
    "combined-sites",
    event => {

      if (!event.features.length) {
        return;
      }


      const clickedFeature =
        event.features[0];

      const coordinates =
        clickedFeature
          .geometry
          .coordinates
          .slice();


      currentFilteredData = {
        type: "FeatureCollection",
        features: [clickedFeature]
      };


      map
        .getSource("combined-sites")
        .setData(currentFilteredData);


      map.flyTo({
        center: coordinates,
        zoom: 15,
        essential: true
      });


      buildSitesTable(
        currentFilteredData
      );

      updateSiteCount();

    }
  );


  // ----------------------------------------------------------
  // LHN CLICK
  // ----------------------------------------------------------

  map.on(
    "click",
    "lhn-fill",
    event => {

      const siteFeatures =
        map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "combined-sites"
            ]
          }
        );


      if (siteFeatures.length) {
        return;
      }


      if (!event.features.length) {
        return;
      }


      const clickedLhn =
        event.features[0]
          .properties
          .lhn_code;


      const lhnDropdown =
        document.getElementById(
          "geographical-lhn-filter"
        );


      const matchingOption =
        [...lhnDropdown.options]
          .some(
            option =>
              option.value === clickedLhn
          );


      if (matchingOption) {

        lhnDropdown.value =
          clickedLhn;

        applyFilters();

      }

    }
  );


  map.on(
    "mouseenter",
    "lhn-fill",
    () => {

      map.getCanvas().style.cursor =
        "pointer";

    }
  );


  map.on(
    "mouseleave",
    "lhn-fill",
    () => {

      map.getCanvas().style.cursor =
        "";

    }
  );

}


// ============================================================
// POPULATE DROPDOWN
// ============================================================

function populateDropdown(
  elementId,
  propertyName
) {

  const select =
    document.getElementById(
      elementId
    );


  const values = [
    ...new Set(

      allSiteData.features
        .map(
          feature =>
            feature.properties[
              propertyName
            ]
        )
        .filter(
          value =>
            value !== null &&
            value !== undefined &&
            value !== ""
        )

    )
  ];


  values.sort(
    (a, b) =>
      String(a).localeCompare(
        String(b)
      )
  );


  values.forEach(
    value => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        value;

      option.textContent =
        value;

      select.appendChild(
        option
      );

    }
  );

}


// ============================================================
// APPLY FILTERS
// ============================================================

function applyFilters() {

  const type =
    document
      .getElementById(
        "type-filter"
      )
      .value;
  
  const governingBody =
    document
      .getElementById(
        "governing-body-filter"
      )
      .value;


  const geographicalLhn =
    document
      .getElementById(
        "geographical-lhn-filter"
      )
      .value;


  const searchText =
    document
      .getElementById(
        "site-search"
      )
      .value
      .trim()
      .toLowerCase();


  const filteredFeatures =
    allSiteData.features.filter(
      feature => {

        const properties =
          feature.properties;

        if (
          type &&
          properties["Type"] !==
            type
        ) {
          return false;
        }

        if (
          governingBody &&
          properties["Governing Body"] !==
            governingBody
        ) {
          return false;
        }


        if (
          geographicalLhn &&
          properties["Geographical LHN"] !==
            geographicalLhn
        ) {
          return false;
        }


        if (searchText) {

          const searchableText = [

            properties["Name"],
            properties["Type"],
            properties["Address"],
            properties["Suburb"],
            properties["Postcode"],
            properties["State"],
            properties["LHN"],
            properties["Geographical LHN"],
            properties["Governing Body"]

          ]
            .map(
              value =>
                value ?? ""
            )
            .join(" ")
            .toLowerCase();


          if (
            !searchableText.includes(
              searchText
            )
          ) {
            return false;
          }

        }


        return true;

      }
    );


  currentFilteredData = {
    type: "FeatureCollection",
    features: filteredFeatures
  };


  map
    .getSource("combined-sites")
    .setData(
      currentFilteredData
    );


  buildSitesTable(
    currentFilteredData
  );

  updateSiteCount();

  updateLhnHighlight(
    geographicalLhn
  );

}


// ============================================================
// LHN HIGHLIGHT
// ============================================================

function updateLhnHighlight(
  lhnCode
) {

  if (!lhnCode) {

    map.setPaintProperty(
      "lhn-fill",
      "fill-opacity",
      0.25
    );


    map.setPaintProperty(
      "lhn-outline",
      "line-opacity",
      1
    );


    return;

  }


  map.setPaintProperty(
    "lhn-fill",
    "fill-opacity",
    [
      "case",

      [
        "==",
        ["get", "lhn_code"],
        lhnCode
      ],

      0.35,
      0.05
    ]
  );


  map.setPaintProperty(
    "lhn-outline",
    "line-opacity",
    [
      "case",

      [
        "==",
        ["get", "lhn_code"],
        lhnCode
      ],

      1,
      0.15
    ]
  );

}


// ============================================================
// RESET MAP
// ============================================================

function resetMap() {

  document
    .getElementById(
      "governing-body-filter"
    )
    .value =
      "";


  document
    .getElementById(
      "geographical-lhn-filter"
    )
    .value =
      "";


  document
    .getElementById(
      "site-search"
    )
    .value =
      "";


  currentFilteredData = {
    type: "FeatureCollection",
    features: [...allSiteData.features]
  };


  map
    .getSource("combined-sites")
    .setData(
      currentFilteredData
    );


  updateLhnHighlight("");


  buildSitesTable(
    currentFilteredData
  );


  updateSiteCount();


  map.flyTo({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    essential: true
  });

}


// ============================================================
// SITE COUNT
// ============================================================

function updateSiteCount() {

  const count =
    currentFilteredData
      .features
      .length;


  document
    .getElementById(
      "site-count"
    )
    .textContent =
      count.toLocaleString();

}


// ============================================================
// BUILD TABLE
// ============================================================

function buildSitesTable(
  siteData
) {

  const table =
    document.getElementById(
      "sites-table"
    );


  table.innerHTML =
    "";


  const columns = [
    "Name",
    "Type",
    "Address",
    "Suburb",
    "Postcode",
    "State",
    "LHN",
    "Geographical LHN",
    "Governing Body"
  ];


  if (
    !siteData.features.length
  ) {

    table.innerHTML = `
      <tbody>
        <tr>
          <td colspan="${columns.length}">
            No sites found.
          </td>
        </tr>
      </tbody>
    `;

    return;

  }


  const features =
    [...siteData.features];


  if (currentSortColumn) {

    features.sort(
      (a, b) => {

        const valueA =
          a.properties[
            currentSortColumn
          ] ?? "";

        const valueB =
          b.properties[
            currentSortColumn
          ] ?? "";


        return compareValues(
          valueA,
          valueB,
          currentSortDirection
        );

      }
    );

  }


  const thead =
    document.createElement(
      "thead"
    );


  const headerRow =
    document.createElement(
      "tr"
    );


  columns.forEach(
    column => {

      const th =
        document.createElement(
          "th"
        );


      th.textContent =
        column;


      if (
        currentSortColumn ===
          column
      ) {

        th.textContent +=
          currentSortDirection ===
            "asc"
            ? " ▲"
            : " ▼";

      }


      th.addEventListener(
        "click",
        () => {

          if (
            currentSortColumn ===
              column
          ) {

            currentSortDirection =
              currentSortDirection ===
                "asc"
                ? "desc"
                : "asc";

          }

          else {

            currentSortColumn =
              column;

            currentSortDirection =
              "asc";

          }


          buildSitesTable(
            siteData
          );

        }
      );


      headerRow.appendChild(
        th
      );

    }
  );


  thead.appendChild(
    headerRow
  );


  table.appendChild(
    thead
  );


  const tbody =
    document.createElement(
      "tbody"
    );


  features.forEach(
    feature => {

      const row =
        document.createElement(
          "tr"
        );


      row.addEventListener(
        "click",
        () => {

          if (
            !feature.geometry ||
            !feature.geometry.coordinates
          ) {
            return;
          }


          const coordinates =
            feature.geometry.coordinates;


          map.flyTo({
            center: coordinates,
            zoom: 15,
            essential: true
          });

        }
      );


      columns.forEach(
        column => {

          const td =
            document.createElement(
              "td"
            );


          td.textContent =
            feature.properties[
              column
            ] ?? "";


          row.appendChild(
            td
          );

        }
      );


      tbody.appendChild(
        row
      );

    }
  );


  table.appendChild(
    tbody
  );

}


// ============================================================
// SORT VALUE COMPARISON
// ============================================================

function compareValues(
  valueA,
  valueB,
  direction
) {

  let comparison =
    0;


  const numberA =
    Number(valueA);

  const numberB =
    Number(valueB);


  const bothNumbers =
    valueA !== "" &&
    valueB !== "" &&
    Number.isFinite(numberA) &&
    Number.isFinite(numberB);


  if (bothNumbers) {

    comparison =
      numberA -
      numberB;

  }

  else {

    comparison =
      String(valueA)
        .localeCompare(
          String(valueB),
          undefined,
          {
            numeric: true,
            sensitivity: "base"
          }
        );

  }


  return direction ===
    "asc"
    ? comparison
    : -comparison;

}


// ============================================================
// EXPORT CURRENT SITES TO CSV
// ============================================================

function exportCurrentSites() {

  if (
    !currentFilteredData ||
    !currentFilteredData.features.length
  ) {
    return;
  }


  const columns = [
    "Name",
    "Type",
    "Address",
    "Suburb",
    "Postcode",
    "State",
    "LHN",
    "Geographical LHN",
    "Governing Body"
  ];


  const rows =
    [];


  rows.push(
    columns
      .map(
        escapeCsvValue
      )
      .join(",")
  );


  currentFilteredData
    .features
    .forEach(
      feature => {

        const row =
          columns.map(
            column =>
              escapeCsvValue(
                feature.properties[
                  column
                ] ?? ""
              )
          );


        rows.push(
          row.join(",")
        );

      }
    );


  const csv =
    rows.join(
      "\r\n"
    );


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    "combined-sites-export.csv";


  document.body.appendChild(
    link
  );


  link.click();


  document.body.removeChild(
    link
  );


  URL.revokeObjectURL(
    url
  );

}


// ============================================================
// CSV ESCAPING
// ============================================================

function escapeCsvValue(
  value
) {

  const text =
    String(value);


  return (
    '"' +
    text.replace(
      /"/g,
      '""'
    ) +
    '"'
  );

}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}
