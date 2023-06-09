// Define the width and height of the map container
var mapWidth = 1040;
var mapHeight = 650;

// Define the path to your GeoJSON file
var geojsonPath = "world_map.geojson";

// Load the GeoJSON file
d3.json(geojsonPath).then(function (geojson) {

  // Load and parse the CSV data
  d3.csv("manipulated_data.csv").then(function (data) {

    // Set up the map container
    var mapContainer = d3.select("#map-container");

    // Define the projection and path generator
    var projection = d3.geoMercator()
      .fitSize([mapWidth, mapHeight], geojson);
    var pathGenerator = d3.geoPath().projection(projection);

    // Create SVG element for the map
    var svg = mapContainer.append("svg")
      .attr("width", mapWidth)
      .attr("height", mapHeight);

    // Create tooltip element
    var tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Define the current category
    var currentCategory = "Category1"; // Set the initial category

    // Update the map colors based on the data
    function updateMapColors() {
      // Data manipulation and processing here
      var filterCategory = currentCategory;

      // Filter the data based on the chosen category
      var filteredData = data.filter(function (d) {
        return d.category === filterCategory;
      });

      // Group data by country and calculate statistics (e.g., count)
      var countryData = d3.group(filteredData, function (d) { return d.bornCountryCode; });
      countryData = Array.from(countryData, function ([key, values]) {
        return {
          bornCountryCode: key,
          count: values.length,
          // Calculate other statistics as needed
        };
      });

      // Example color scale
      var colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(countryData, function (d) { return d.count; })]);

      // Draw the map
      svg.selectAll("path")
        .data(geojson.features)
        .join(
          enter => enter.append("path")
            .attr("d", pathGenerator)
            .style("fill", "gray")
            .call(enter => enter.transition()
              .duration(800)
              .style("fill", function (d) {
                var countryCode = d.properties.ISO_A3;
                var country = countryCode ? countryData.find(function (c) {
                  return c.bornCountryCode === countryCode;
                }) : null;
                var count = country ? country.count : 0;
                return count > 0 ? colorScale(count) : "gray";
              })),
          update => update
            .call(updatePath)
            .call(updateColor)
        )
        .on("mouseover", function (d) {
          var countryCode = d.properties.ISO_A3;
          var country = countryCode ? countryData.find(function (c) {
            return c.bornCountryCode === countryCode;
          }) : null;
          var count = country ? country.count : 0;
          tooltip.html("Nobel Prizes Won by " + d.properties.ADMIN + ": " + count)
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY + 10) + "px")
            .style("opacity", 1);
        })
        .on("mouseout", function (d) {
          tooltip.style("opacity", 0);
        })
        .on("click", function (d) {
          var countryCode = d.properties.ISO_A3;
          var country = countryCode ? countryData.find(function (c) {
            return c.bornCountryCode === countryCode;
          }) : null;

          // Generate pie chart for the clicked country
          if (country) {
            generatePieChart(country, filterCategory);
          }
        });

      // Path update function with transition
      function updatePath(path) {
        path.transition()
          .duration(800)
          .attr("d", pathGenerator);
      }

      // Path color update function with transition
      function updateColor(path) {
        path.transition()
          .duration(800)
          .style("fill", function (d) {
            var countryCode = d.properties.ISO_A3;
            var country = countryCode ? countryData.find(function (c) {
              return c.bornCountryCode === countryCode;
            }) : null;
            var count = country ? country.count : 0;
            return count > 0 ? colorScale(count) : "gray";
          });
      }
    }

    // Call the initial map colors update
    updateMapColors();

    // Handle category picker change event
    d3.select("#category-picker").on("change", function () {
      currentCategory = d3.select(this).property("value");
      updateMapColors();
    });

    // Handle zoom event
    var zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

    svg.call(zoom);

    // Zoom event handler function
    function zoomed() {
      mapGroup.attr("transform", d3.event.transform);
    }

    // Generate pie chart for the selected country
    function generatePieChart(country, category) {
      // Clear any existing pie chart
      d3.select("#popup-content").html("");

      // Filter the data for the selected country and category
      var filteredData = data.filter(function (d) {
        return d.bornCountryCode === country.bornCountryCode && d.category === category;
      });

      // Group data by gender and calculate statistics (e.g., count)
      var genderData = d3.group(filteredData, function (d) { return d.gender; });
      genderData = Array.from(genderData, function ([key, values]) {
        return {
          gender: key,
          count: values.length,
          // Calculate other statistics as needed
        };
      });

      // Define pie chart dimensions
      var pieWidth = 400;
      var pieHeight = 400;
      var pieRadius = Math.min(pieWidth, pieHeight) / 2;

      // Create SVG element for the pie chart
      var pieSvg = d3.select("#popup-content")
        .append("svg")
        .attr("width", pieWidth)
        .attr("height", pieHeight)
        .append("g")
        .attr("transform", "translate(" + pieWidth / 2 + "," + pieHeight / 2 + ")");

      // Define pie chart color scale
      var pieColorScale = d3.scaleOrdinal(d3.schemeCategory10);

      // Generate pie chart data
      var pieData = genderData;

      // Define pie chart layout
      var pie = d3.pie()
        .value(function (d) { return d.count; });

      // Generate pie chart arcs
      var arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);

      // Draw pie chart slices
      var slices = pieSvg.selectAll("path")
        .data(pie(pieData))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", function (d) { return pieColorScale(d.data.gender); })
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .each(function (d) { this._current = d; })
        .call(enter => enter.transition()
          .duration(800)
          .attrTween("d", function (d) {
            var interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
            return function (t) {
              return arc(interpolate(t));
            };
          }));

      // Add labels to the pie chart slices
      var labels = pieSvg.selectAll("text")
        .data(pie(pieData))
        .enter()
        .append("text")
        .attr("transform", function (d) {
          var centroid = arc.centroid(d);
          return "translate(" + centroid[0] + "," + centroid[1] + ")";
        })
        .attr("text-anchor", "middle")
        .text(function (d) { return d.data.gender + " (" + d.data.count + ")"; })
        .style("fill", "white")
        .style("font-size", "12px")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1);

      // Add a title to the pie chart
      pieSvg.append("text")
        .attr("text-anchor", "middle")
        .attr("y", -pieHeight / 2)
        .text("Gender Distribution")
        .style("font-size", "16px");
    }

  }).catch(function (error) {
    console.log("Error loading data:", error);
  });

}).catch(function (error) {
  console.log("Error loading GeoJSON:", error);
});
