// Assign dimensions for map container
var width = 500,
	height = 500;

var field = "ValidVotes"
var valueFormat = d3.format(",");

var template = d3.select('#template').html();
Mustache.parse(template);

// Logic to handle hover event when its firedup
var hoveron = function(d) {
	console.log('d', d, 'event', event);
	var div = document.getElementById('tooltip');
	div.style.left = event.pageX + 'px';
	div.style.top = event.pageY + 'px';

	
	d3.select(this)
		.style("fill", "white");

	d3.select("#tooltip")
		.style("opacity", 1);

	d3.select("#tooltip .name")
		.text(d.properties.dist);

	d3.select("#tooltip .value")
		.text("Total Votes: "+ valueFormat(d.properties.field));
	
}

var hoverout = function(d) {

	//Restore original choropleth fill
	d3.select(this)
		.style("fill", function(d) {
			var value = d.properties.field;
			if (value) {
				return color(value);
			} else {
				return "#ccc";
			}
		});

	d3.select("#tooltip")
		.style("opacity", 0);

}


// Create SVG inside map container and assign dimensions
var svg = d3.select("#map").append('svg')
	.attr("width", width)
	.attr("height", height);


var projection	= d3.geo.mercator()
	.scale(1);

var path = d3.geo.path()
	.projection(projection);

var dataById = d3.map();

var color = d3.scale.ordinal()
              .range(
				['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4',
				'#1d91c0','#225ea8','#253494','#081d58']);

d3.csv("data/election21.csv", function(data) {

	color.domain([
		d3.min(data, function(d) { return d.Va; }),
		d3.max(data, function(d) { return +d[field]; })

		]);

    dataById = d3.nest()
      .key(function(d) { return d.id; })
      .rollup(function(d) { return d[0]; })
      .map(data);

	d3.json('data/ug_districts2.geojson', function(error, json) {

		var scaleCenter = calculateScaleCenter(json);

		// Apply scale, center and translate parameters.
		projection.scale(scaleCenter.scale)
				.center(scaleCenter.center)
				.translate([width/2, height/2]);

		// Merge the coverage data amd GeoJSON into a single array
		// Also loop through once for each coverage score data value

		for (var i=0; i < data.length ; i++ ) {

			// Grab district name
			var dataDistrict = data[i].district;

			//Grab data value, and convert from string to float
			var dataValue = +data[i][field];

			//Find the corresponding district inside GeoJSON
			for (var j=0; j < json.features.length ; j++ ) {

				// Check the district reference in json
				var jsonDistrict = json.features[j].properties.dist;

				if (dataDistrict == jsonDistrict) {

					//Copy the data value into the GeoJSON
					json.features[j].properties.field = dataValue;

					//Stop looking through JSON
					break;
				}
			}
		}
		
		// Add a <g> element to the SVG element and give a class to style later
		svg.append('g')
			.attr('class', 'features')			
		// Bind data and create one path per GeoJSON feature
		svg.selectAll("path")
			.data(json.features)
			.enter()
			.append("path")
			.attr("d", path)
			.on("mouseover", hoveron)
			.on("mouseout", hoverout)
			.on('click', showDetails)
			.style("cursor", "pointer")
			.style("stroke", "#777")
			.style("fill", function(d) {

				// Get data value
				
				var value = d.properties.field;

				if (value) {
					// If value exists ...
					return color(value);
				} else {
					// If value is undefines ...
					return "#ccc";
				}
			});

	}); // End d3.json
}); // End d3.csv

// NEW: function to dynamically calculate the scale factror and center

function calculateScaleCenter(features) {
	// Get the bounding box of the paths (in pixels) and calculate a scale factor based on box and map size
	var bbox_path = path.bounds(features),
		scale = 0.95 / Math.max(
			(bbox_path[1][0] - bbox_path[0][0]) / width,
			(bbox_path[1][1] - bbox_path[0][1]) / height
			);

	// Get the bounding box of the features (in map units) and use it to calculate the center of the features.
	var bbox_feature = d3.geo.bounds(features),
		center = [
			(bbox_feature[1][0] + bbox_feature[0][0]) / 2,
			(bbox_feature[1][1] + bbox_feature[0][1]) / 2];

	return {
		'scale':scale,
		'center':center
	};
}

// NEW: function to show details on click
function showDetails(f) {
	var id = getIdOfFeature(f); //Get the ID of the feature
	var d = dataById[id]; // Use the ID to get the data entry
	//console.log(d) //testing
	var detailsHtml = Mustache.render(template, d); // Render the Mustace template with the data object

	//Hide the initial container.
	d3.select('#initial').classed('hidden', true);

	// Put the HTML output in the details container and show (unhide) it.
	d3.select('#details').html(detailsHtml);
	d3.select('#details').classed('hidden', false);
}

// NEW: Defining getIdOfFeature
function getIdOfFeature(f) {
  return f.properties.idug;
}