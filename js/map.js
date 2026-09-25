// ============================================================
// INITIAL MAP POSITION
// ============================================================

const INITIAL_CENTER = [135.5, -31.5];
const INITIAL_ZOOM = 5;


// ============================================================
// GLOBAL DATA / STATE
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

  // ============================================================
  // LHN BOUNDARIES
  // ============================================================

  map.addSource("lhn-boundaries", {
    type: "geojson",
    data: "./data/LHN.geojson"
  });


  // ============================================================
  // LHN COLOURED FILL
  // ============================================================

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


  // ============================================================
  // LHN OUTLINE
  // ============================================================

  map.addLayer({
    id: "lhn-outline",
    type: "line",
    source: "lhn-boundaries",

    paint: {
      "line-color": "#000000",
      "line-width": 1
    }
  });


  // ============================================================
  // LOAD SITE DATA
  // ============================================================

  const response =
    await fetch("./data/combined_sites.geojson");


  allSiteData =
    await response.json();


  currentFilteredData =
    allSiteData;


  // ============================================================
  // SITE SOURCE
  // ============================================================

  map.addSource("combined_sites", {
    type: "geojson",
    data: allSiteData
  });


  // ============================================================
  // SITE POINTS
  // ============================================================

  map.addLayer({
    id: "combined_sites",
    type: "circle",
    source: "combined_sites",

    paint: {
      "circle-radius": 6,
      "circle-color": "#FF4A4A",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1
    }
  });


  // ============================================================
  // POPULATE DROPDOWNS
  // ============================================================

  populateDropdown(
    "governing-lhn-filter",
    "Governing LHN"
  );


  populateDropdown(
    "geographical-lhn-filter",
    "Geographical LHN"
  );


  // ============================================================
  // FILTER EVENTS
  // ============================================================

  document
    .getElementById("governing-lhn-filter")
    .addEventListener(
      "change",
      applyFilters
    );


  document
    .getElementById("geographical-lhn-filter")
    .addEventListener(
      "change",
      applyFilters
    );


  document
    .getElementById("site-search")
    .addEventListener(
      "input",
      applyFilters
    );


  // ============================================================
  // RESET BUTTON
  // ============================================================

  document
    .getElementById("reset-button")
    .addEventListener(
      "click",
      resetMap
    );


  // ============================================================
  // EXPORT BUTTON
  // ============================================================

  document
    .getElementById("export-button")
    .addEventListener(
      "click",
      exportCurrentSites
    );


  // ============================================================
  // MARKER HOVER POPUP
  // ============================================================

  const hoverPopup =
    new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10
    });


  map.on(
    "mouseenter",
    "combined_sites",
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
        <div style="min-width: 220px">

          <div style="
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 6px;
          ">
            ${escapeHtml(properties["Site Name"])}
          </div>

          <div style="font-size: 12px;">
            ${escapeHtml(properties["Address"])}
          </div>

          <div style="
            font-size: 12px;
            margin-bottom: 6px;
          ">
            ${escapeHtml(properties["Suburb"])}
          </div>

          <div style="font-size: 11px;">
            <strong>Governing LHN:</strong>
            ${escapeHtml(properties["Governing LHN"])}
          </div>

          <div style="font-size: 11px;">
            <strong>Geographical LHN:</strong>
            ${escapeHtml(properties["Geographical LHN"])}
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
    "combined_sites",
    () => {

      map.getCanvas().style.cursor =
        "";


      hoverPopup.remove();

    }
  );


  // ============================================================
  // CLICK SITE
  // ============================================================

  map.on(
    "click",
    "combined_sites",
    event => {

      if (!event.features.length) {
        return;
      }


      const clickedFeature =
        event.features[0];


      const siteId =
        clickedFeature
          .properties["Site ID"];


      const coordinates =
        clickedFeature
          .geometry
          .coordinates
          .slice();


      const filteredFeatures =
        allSiteData.features.filter(
          feature => {

            return String(
              feature.properties["Site ID"]
            ) === String(siteId);

          }
        );


      currentFilteredData = {
        type: "FeatureCollection",
        features: filteredFeatures
      };


      // ========================================================
      // SHOW SELECTED SITE ONLY
      // ========================================================

      map
        .getSource("combined_sites")
        .setData(
          currentFilteredData
        );


      // ========================================================
      // ZOOM TO SELECTED SITE
      // ========================================================

      map.flyTo({
        center: coordinates,
        zoom: 15,
        essential: true
      });


      // ========================================================
      // UPDATE TABLE
      // ========================================================

      buildSitesTable(
        currentFilteredData
      );


      // ========================================================
      // UPDATE SITE COUNT
      // ========================================================

      updateSiteCount();

    }
  );


  // ============================================================
  // CLICK LHN
  // ============================================================

  map.on(
    "click",
    "lhn-fill",
    event => {

      /*
        Check whether a site marker was clicked.

        Prevents LHN filtering from also firing when
        clicking a red marker.
      */

      const siteFeatures =
        map.queryRenderedFeatures(
          event.point,
          {
            layers: [
              "combined_sites"
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
          .properties.lhn_code;


      /*
        Set geographical LHN dropdown.

        applyFilters() then updates:
        - markers
        - table
        - site count
        - LHN fading
      */

      document
        .getElementById(
          "geographical-lhn-filter"
        )
        .value =
          clickedLhn;


      applyFilters();

    }
  );


  // ============================================================
  // POINTER - LHN
  // ============================================================

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


  // ============================================================
  // INITIAL TABLE
  // ============================================================

  buildSitesTable(
    allSiteData
  );


  // ============================================================
  // INITIAL SITE COUNT
  // ============================================================

  updateSiteCount();

});



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

  const governingLhn =
    document
      .getElementById(
        "governing-lhn-filter"
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


        // ========================================================
        // GOVERNING LHN
        // ========================================================

        if (
          governingLhn &&
          properties["Governing LHN"] !==
            governingLhn
        ) {
          return false;
        }


        // ========================================================
        // GEOGRAPHICAL LHN
        // ========================================================

        if (
          geographicalLhn &&
          properties["Geographical LHN"] !==
            geographicalLhn
        ) {
          return false;
        }


        // ========================================================
        // SEARCH
        // ========================================================

        if (searchText) {

          const searchableText = [

            properties["Site ID"],
            properties["Site Name"],
            properties["Address"],
            properties["Suburb"],
            properties["Governing LHN"],
            properties["Geographical LHN"],
            properties["Notes"],
            properties["Search Address"]

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


  // ============================================================
  // UPDATE MAP MARKERS
  // ============================================================

  map
    .getSource("combined_sites")
    .setData(
      currentFilteredData
    );


  // ============================================================
  // UPDATE TABLE
  // ============================================================

  buildSitesTable(
    currentFilteredData
  );


  // ============================================================
  // UPDATE SITE COUNT
  // ============================================================

  updateSiteCount();


  // ============================================================
  // UPDATE LHN HIGHLIGHT
  // ============================================================

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

  // ============================================================
  // NOTHING SELECTED
  // ============================================================

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


  // ============================================================
  // FADE NON-SELECTED LHNs
  // ============================================================

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
// RESET / SHOW ALL
// ============================================================

function resetMap() {

  // ============================================================
  // CLEAR GOVERNING LHN
  // ============================================================

  document
    .getElementById(
      "governing-lhn-filter"
    )
    .value =
      "";


  // ============================================================
  // CLEAR GEOGRAPHICAL LHN
  // ============================================================

  document
    .getElementById(
      "geographical-lhn-filter"
    )
    .value =
      "";


  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  document
    .getElementById(
      "site-search"
    )
    .value =
      "";


  // ============================================================
  // RESTORE FULL DATASET
  // ============================================================

  currentFilteredData =
    allSiteData;


  // ============================================================
  // RESTORE ALL MARKERS
  // ============================================================

  map
    .getSource("combined_sites")
    .setData(
      allSiteData
    );


  // ============================================================
  // RESTORE LHN APPEARANCE
  // ============================================================

  updateLhnHighlight("");


  // ============================================================
  // RESTORE FULL TABLE
  // ============================================================

  buildSitesTable(
    allSiteData
  );


  // ============================================================
  // RESTORE SITE COUNT
  // ============================================================

  updateSiteCount();


  // ============================================================
  // RESET MAP CAMERA
  // ============================================================

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
// EXPORT CURRENT SITES TO CSV
// ============================================================

function exportCurrentSites() {

  if (
    !currentFilteredData ||
    !currentFilteredData.features.length
  ) {
    return;
  }


  // ============================================================
  // GET ALL PROPERTY NAMES
  // ============================================================

  const columns = [
    ...new Set(

      currentFilteredData.features.flatMap(
        feature =>
          Object.keys(
            feature.properties
          )
      )

    )
  ];


  const rows =
    [];


  // ============================================================
  // CSV HEADER
  // ============================================================

  rows.push(
    columns
      .map(
        escapeCsvValue
      )
      .join(",")
  );


  // ============================================================
  // CSV DATA ROWS
  // ============================================================

  currentFilteredData
    .features
    .forEach(
      feature => {

        const row =
          columns.map(
            column => {

              return escapeCsvValue(
                feature.properties[
                  column
                ] ?? ""
              );

            }
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


  // ============================================================
  // CREATE CSV FILE
  // ============================================================

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
    "combined_sites_export.csv";


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



// ============================================================
// BUILD SITE TABLE
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


  // ============================================================
  // NO RESULTS
  // ============================================================

  if (
    !siteData.features.length
  ) {

    const tbody =
      document.createElement(
        "tbody"
      );


    const row =
      document.createElement(
        "tr"
      );


    const td =
      document.createElement(
        "td"
      );


    td.textContent =
      "No sites found.";


    row.appendChild(
      td
    );


    tbody.appendChild(
      row
    );


    table.appendChild(
      tbody
    );


    return;

  }


  // ============================================================
  // GET ALL COLUMN NAMES
  // ============================================================

  const columns = [
    ...new Set(

      siteData.features.flatMap(
        feature =>
          Object.keys(
            feature.properties
          )
      )

    )
  ];


  // ============================================================
  // COPY FEATURES BEFORE SORTING
  // ============================================================

  const features =
    [...siteData.features];


  // ============================================================
  // SORT DATA
  // ============================================================

  if (
    currentSortColumn
  ) {

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


  // ============================================================
  // TABLE HEADER
  // ============================================================

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


      // ========================================================
      // SHOW SORT DIRECTION
      // ========================================================

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


      // ========================================================
      // CLICK HEADER TO SORT
      // ========================================================

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


  // ============================================================
  // TABLE BODY
  // ============================================================

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


      // ========================================================
      // CLICK TABLE ROW -> ZOOM TO SITE
      // ========================================================

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


      // ========================================================
      // CREATE TABLE CELLS
      // ========================================================

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


  // ============================================================
  // NUMERIC SORT
  // ============================================================

  if (
    bothNumbers
  ) {

    comparison =
      numberA -
      numberB;

  }


  // ============================================================
  // TEXT SORT
  // ============================================================

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


  return direction === "asc"
    ? comparison
    : -comparison;

}
