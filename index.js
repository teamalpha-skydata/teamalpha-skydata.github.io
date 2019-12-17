var w = 2000,
    h = 750;

var projection = d3.geo.azimuthal()
    .mode("equidistant")
    .origin([-98, 38])
    .scale(1500)
    .translate([925, 400]);

var path = d3.geo.path()
    .projection(projection);

var originDropdown = d3.select('#selectFields')
  .append('select')
  	.attr('class','form-control col-sm-1 selectOrigin')
    .on('change', changeOrigin);

var destDropdown = d3.select('#selectFields')
  .append('select')
  	.attr('class','form-control col-sm-1 selectDest')
    .on('change', changeDest);

var monthDropdown = d3.select('#selectFields')
  .append('select')
  	.attr('class','form-control col-sm-1 selectMonth')
    .on('change', changeMonth);

var dayDropdown = d3.select('#selectFields')
  .append('select')
  	.attr('class','form-control col-sm-1 selectDay')
    .on('change', changeDay);

var months = ["January","February","March","April","May","June","July",
              "August","September","October","November","December"];

var numDays = {
  "January": 31,
  "February": 28,
  "March": 31,
  "April": 30,
  "May": 31,
  "June": 30,
  "July": 31,
  "August": 31,
  "September": 30,
  "October": 31,
  "November": 30,
  "December": 31
};

monthDropdown.selectAll('option')
  .data(months)
  .enter().append("option")
    .attr("value", function (d) { return d; })
    .text(function (d) { return d; });

var weeks = weekBins(numDays["January"]);
dayDropdown.selectAll('option')
  .data(weeks)
  .enter().append("option")
    .attr("value", function (d) { return d; })
    .text(function (d) { return d; });

var svg = d3.select("#map").insert("svg:svg", "h2")
    .attr("width", w)
    .attr("height", h);

var states = svg.append("svg:g")
    .attr("id", "states");

var circles = svg.append("svg:g")
    .attr("id", "circles");

// Load the data
var occupancyJSON = null;
var delayJSON = null;
var scheduledVsActualJSON = null;
var carrierJSON = null;

getJSON(occupancyJsonCallback, 'data/occupancy_2018.json');
getJSON(delayJsonCallback, 'data/delays_2018.json');
getJSON(scheduledVsActualJsonCallback, 'data/scheduled_vs_actual2018.json');
getJSON(carrierJsonCallback, 'data/carrier_lookup.json');

d3.json("https://mbostock.github.io/d3/talk/20111116/us-states.json", function(collection) {
  states.selectAll("path")
      .data(collection.features)
    .enter().append("svg:path")
      .attr("d", path);
});

var airports = []
var filteredAirports = []
var linksByOrigin = {};
var locationByAirport = {};
var countByAirport = {};
var positions = [];
var circleCounter = 1;

d3.csv("https://mbostock.github.io/d3/talk/20111116/flights-airport.csv", function(flights) {


  flights.forEach(function(flight) {
    var origin = flight.origin,
        destination = flight.destination,
        links = linksByOrigin[origin] || (linksByOrigin[origin] = []);
    links.push({source: origin, target: destination});
    countByAirport[origin] = (countByAirport[origin] || 0) + 1;
    countByAirport[destination] = (countByAirport[destination] || 0) + 1;
  });

  d3.csv("https://mbostock.github.io/d3/talk/20111116/airports.csv", function(airports) {

    // Only consider airports with at least one flight.
    airports = airports.filter(function(airport) {
      if (countByAirport[airport.iata] && countByAirport[airport.iata] > 100) {
        var location = [+airport.longitude, +airport.latitude];
        locationByAirport[airport.iata] = location;
        positions.push(projection(location));
        return true;
      }
    });

    filteredAirports = airports;

    originDropdown.selectAll('option').data(filteredAirports).enter()
      .append('option')
        .text(function (d) { return d.iata; })
        .property("selected", function (d) { return d.iata=== "JFK" })

    changeOrigin();

    circles.selectAll("circle")
        .data(filteredAirports)
      .enter().append("svg:circle")
        .style("cursor", "pointer")
        .attr("cx", function(d, i) { return positions[i][0]; })
        .attr("cy", function(d, i) { return positions[i][1]; })
        .attr("r", function(d, i) { return Math.sqrt(countByAirport[d.iata]); })
        .sort(function(a, b) { return countByAirport[b.iata] - countByAirport[a.iata]; })
        .on("click", circleClicked)
    })


});

function scrollPressed() {
  $("html, body").animate({ scrollTop: $(document).height() }, "slow");
}

function circleClicked(d, i) {
  if (circleCounter == 0) {
    originDropdown.node().value = d.iata;
    changeOrigin();
    circleCounter = 1
  }
  else {
    destDropdown.node().value = d.iata;
    changeDest();
    circleCounter = 0
  }
}

function changeOrigin() {
	selectValue = d3.select('.selectOrigin').property('value')

  filteredDestinations = linksByOrigin[selectValue].filter(function(d) {
    return filteredAirports.some(airport => airport.iata == d.target)
  })

  destDropdown.selectAll('option').data(filteredDestinations).enter()
    .append('option')
      .text(function (d) { return d.target; })
  destDropdown.node().value = ""
  drawArc();
};

function changeDest() {
  drawArc()
  generateCharts();
};

function drawArc() {
  var origin = d3.select('.selectOrigin').property('value')
  var destination = d3.select('.selectDest').property('value')

  d3.select(".arc").remove()

  if (destination != "") {
    var arc = d3.geo.greatArc()
      .source(function(d) { return locationByAirport[d.source]; })
      .target(function(d) { return locationByAirport[d.target]; });

    svg.append("svg:path")
      .attr("class", "arc")
      .attr("d", function(d) { return path(arc({ source: origin, target: destination})); });
    }
}

function changeMonth() {
  var monthNode = monthDropdown.node();
  var month = monthNode.options[monthNode.selectedIndex].value;
  var daysInMonth = numDays[month];
  var weeks = weekBins(daysInMonth);

  dayDropdown.node().options.length = 0;
  dayDropdown.selectAll('option')
  .data(weeks)
  .enter().append("option")
    .attr("value", function (d) { return d; })
    .text(function (d) { return d; });
  generateCharts();
}

function changeDay() {
  generateCharts();
}

// BEGIN CHART SIDE

function generateCharts() {
  var originAirportNode = originDropdown.node()
  var destAirportNode = destDropdown.node();
  var monthNode = monthDropdown.node();
  var dayNode = dayDropdown.node();
  
  var originAirport = originAirportNode.options[originAirportNode.selectedIndex].value;
  var destAirport = destAirportNode.options[destAirportNode.selectedIndex].value;
  var month = monthNode.options[monthNode.selectedIndex].value;
  var week = dayNode.options[dayNode.selectedIndex].text;

  // load data for charts
  scheduled_vs_actual = getScheduledVsActualData();
  delays = getDelayData();
  occupancy = getOccupancyData();
  // if occupancy or delays data is not available, they will be null

  if (delays != null && occupancy != null) {
    d3.select('#noFlightsLabel').style("display", "none");
    d3.select('#detail').style("display", "unset");
    d3.select('#scrollButton').style("display", "unset");
  }
  else {
    d3.select('#detail').style("display", "none");
    d3.select('#scrollButton').style("display", "none");
    d3.select('#noFlightsLabel').style("display", "unset");
    return;
  }

  Object.keys(occupancy).forEach(function (k) {
    if (!Object.keys(delays).includes(k)) {
      console.log(k);
      delete occupancy[k];
    }
  });

  Object.keys(delays).forEach(function (k) {
    if (!Object.keys(occupancy).includes(k)) {
      console.log(k);
      delete delays[k];
    }
  });

  console.log('scheduled vs actual');
  console.log(scheduled_vs_actual);
  console.log('delays');
  console.log(delays);
  console.log('occupancy');
  console.log(occupancy);

  d3.select("#chartContainer").selectAll("svg").remove();
  d3.select("#chartContainer").selectAll("h5").remove();
  d3.select("#chartContainer").selectAll("p").remove();

  generateLeftChart(occupancy);
  generateRightChart(delays);

  d3.select("#airlineButtons")
  .selectAll("button")
  .remove();

  var buttonNames = Object.keys(occupancy);
  console.log('buttonNames');
  console.log(buttonNames);

  d3.select("#airlineButtons")
    .selectAll("button")
    .data(buttonNames)
    .enter()
    .append("button")
      .text(function (d) {return window.carrierJSON[d];})
      .style("margin", "1px")
      .attr("type", "button")
      .attr("class", "btn btn-primary")
      .attr("data-toggle", "modal")
      .attr("data-target", "#airlineModal")
      .attr("id", function(d) {return d;})
      .on("click", function (d) {updateModal(d);})
      .on("mouseover", function (d) {
        var selectedButton = carrierJSON[d];
        d3.select("#rightChart").selectAll("rect")
          .classed("barSelected", function(d) {
            console.log(d);
            if (selectedButton == d.Airline) {
              return true;
            }
            return false;
          });
        d3.select("#leftChart").selectAll("rect")
          .classed("barSelected", function(d) {
            if (selectedButton == d.Airline) {
              return true;
            }
            return false;
          });
      })
      .on("mouseout", function (d) {
        d3.select('#leftChart').selectAll("rect").classed("barSelected", false);
        d3.select('#rightChart').selectAll("rect").classed("barSelected", false);
      });

  d3.select("#selectedFlight")
    .text(originAirport + " -> " + destAirport + " between "  + month + " " + week);
}

function generateLeftChart(occupancy) {
  var airlines = Object.keys(occupancy)
  var chartData = []
  for (var i = 0; i < airlines.length; i++) {
    newObj=  {
      "Airline": window.carrierJSON[airlines[i]],
      "Empty": (1 - parseInt(occupancy[airlines[i]][0])/parseInt(occupancy[airlines[i]][1]))
    };
    chartData.push(newObj);
  }

    chartData.sort(function(b, a) {
      return a.Empty - b.Empty;
    });

    var margin = {top: 50, right: 100, bottom: 150, left: 110},
      width = 750 - margin.left - margin.right,
      height = 650 - margin.top - margin.bottom;

    var chart_svg = d3v4.select("#leftChart")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // X axis
    var x = d3v4.scaleBand()
      .range([ 0, width ])
      .domain(chartData.map(function(d) { return d.Airline; }))
      .padding(0.2);

      chart_svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3v4.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("font-size", "medium")
        .style("text-anchor", "end");

    // Add Y axis
    var formatPercent = d3.format(".0%");

    var y = d3v4.scaleLinear()
      .domain([0, 1])
      .range([ height, 0]);

      chart_svg.append("g")
      .style("font-size", "medium")
      .call(d3v4.axisLeft(y)
              .tickFormat(formatPercent));

    // Bars
    chart_svg.selectAll("mybar")
      .data(chartData)
      .enter()
      .append("rect")
        .attr("x", function(d) { return x(d.Airline); })
        .attr("y", function(d) { return y(d.Empty); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return height - y(d.Empty); })
        .attr("fill", "#62a2dc")
        .on("mouseover", function (d) {
          d3.select(this).classed("barSelected", true);
          var airlineForBar = d.Airline;
          d3.select("#rightChart").selectAll("rect")
            .classed("barSelected", function(d) {
              if (airlineForBar == d.Airline) {
                return true;
              }
              return false;
            });
        })
        .on("mouseout", function (d) {
          d3.select('#leftChart').selectAll("rect").classed("barSelected", false);
          d3.select('#rightChart').selectAll("rect").classed("barSelected", false);
        });

    chart_svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 35 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("font-size", "medium")
        .style("text-anchor", "middle")
        .text("Percent Seats Empty");

    d3v4.select("#leftChart").append("h5")
    .style("font-size", "x-large")
    .text("On average, " + chartData[0].Airline + " has the emptiest flights.");

    d3v4.select("#leftChart").append("p")
    .style("font-size", "x-large")
    .text("Consider flying with them if you want a little extra attention from the flight attendants!");
}

function generateRightChart(delays) {
  var airlines = Object.keys(delays)
  var chartData = []
  var maxDelay = 0;
  for (var i = 0; i < airlines.length; i++) {
    var delay = parseInt(delays[airlines[i]][0])/parseInt(delays[airlines[i]][1]);
    newObj=  {
      "Airline": window.carrierJSON[airlines[i]],
      "Empty": delay
    };
    if (delay > maxDelay) {
      maxDelay = delay;
    }
    chartData.push(newObj);
  }

    chartData.sort(function(b, a) {
      return b.Empty - a.Empty;
    });

    var margin = {top: 50, right: 100, bottom: 150, left: 100},
      width = 750 - margin.left - margin.right,
      height = 650 - margin.top - margin.bottom;

    var chart_svg = d3v4.select("#rightChart")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // X axis
    var x = d3v4.scaleBand()
      .range([ 0, width ])
      .domain(chartData.map(function(d) { return d.Airline; }))
      .padding(0.2);

      chart_svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3v4.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("font-size", "medium")
        .style("text-anchor", "end");

    // Add Y axis
    var y = d3v4.scaleLinear()
      .domain([0, maxDelay])
      .range([ height, 0]);
  
    chart_svg.append("g")
      .style("font-size", "medium")
      .call(d3v4.axisLeft(y));

    // Bars
    chart_svg.selectAll("mybar")
      .data(chartData)
      .enter()
      .append("rect")
        .attr("x", function(d) { return x(d.Airline); })
        .attr("y", function(d) { return y(d.Empty); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return height - y(d.Empty); })
        .attr("fill", "#62a2dc")
        .on("mouseover", function (d) {
          d3.select(this).classed("barSelected", true);
          var airlineForBar = d.Airline;
          d3.select("#leftChart").selectAll("rect")
            .classed("barSelected", function(d) {
              if (airlineForBar == d.Airline) {
                return true;
              }
              return false;
            });
        })
        .on("mouseout", function (d) {
          d3.select('#leftChart').selectAll("rect").classed("barSelected", false);
          d3.select('#rightChart').selectAll("rect").classed("barSelected", false);
        });

    chart_svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 35 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("font-size", "medium")
        .style("text-anchor", "middle")
        .text("Average Minutes Delayed");

        d3v4.select("#rightChart").append("h5")
        .style("font-size", "x-large")
        .text("On average, " + chartData[0].Airline + " is the least delayed on this route.");
    
        d3v4.select("#rightChart").append("p")
        .style("font-size", "x-large")
        .text("Consider flying with them if getting to your destination quickly is your first priority!");

    d3.select('#scrollButton').style("visibility", "visible");
}

// Helper methods
function weekBins(numberOfDays) {
    var weeks = [];

    for (i = 0; i < numberOfDays; i += 7) {
      if (weeks.length == 3) {
        weeks.push(i + 1 + " - " + numberOfDays);
        break;
      }
      else {
        weeks.push(i + 1 + " - " + ((i + 7) > numberOfDays ? numberOfDays : i + 7));
      }
    }
    return weeks;
}

function scrollPressed() {
    $("html, body").animate({ scrollTop: $("#detail").offset().top }, "slow");
  }

function scrollToTop() {
    $("html, body").animate({ scrollTop: 0 }, "slow");
}

function airlinePressed() {
    d3.select('#airlineDetail').style("display", "unset");
    $("html, body").animate({ scrollTop: $(document).height() }, "slow");
}

function getOccupancyData() {
  var originAirportNode = originDropdown.node()
  var destAirportNode = destDropdown.node();
  var monthNode = monthDropdown.node();

  var originAirport = originAirportNode.options[originAirportNode.selectedIndex].value;
  var destAirport = destAirportNode.options[destAirportNode.selectedIndex].value;
  var month = monthNode.options[monthNode.selectedIndex].value;
  var monthIdx = window.months.indexOf(month) + 1;

  var res;
  try {
    res = window.occupancyJSON[originAirport][destAirport][monthIdx];
  } catch (err) {
    res = null;
  }
  return res;
}

function getDelayData() {
  var originAirportNode = originDropdown.node()
  var destAirportNode = destDropdown.node();
  var monthNode = monthDropdown.node();
  var dayNode = dayDropdown.node();

  var originAirport = originAirportNode.options[originAirportNode.selectedIndex].value;
  var destAirport = destAirportNode.options[destAirportNode.selectedIndex].value;
  var month = monthNode.options[monthNode.selectedIndex].value;
  var monthIdx = window.months.indexOf(month) + 1;
  var week = dayNode.selectedIndex + 1;
  var week_to_key = {1: "first_week", 2: "second_week", 3: "third_week", 4: "fourth_week"}

  var res;
  try {
    res = window.delayJSON[originAirport][destAirport][monthIdx][week_to_key[week]];
  } catch (err) {
    res = null;
  }
  return res;
}

var airlineBlurbs = {
  "AA": "American charges $30 for your 1st checked bag and $40 for your 2nd bag. On the flight it offers 31inches of leg space for its economy seats. In flight wifi will cost $19 for the flight and a seat back tv is not guaranteed.",
  "DL": "Delta charges $30 for your 1st checked and $40 for your 2nd bag. On the flight it offers 31inches of leg space for its economy seats. In flight wifi will cost $16 for the flight, but you can send messages on iMessage, What's App, and Messenger for free.",
  "NK": "Spirit is a budget airline. Seats have only 28 inches of legroom and do not recline. In addition, you will be charged for seat selection and refreshments, as well as $30 for carry-on suitcases. Wifi costs vary, but typically start at $6.50.",
  "WN": "On Southwest Airlines your first 2 checked bags fly free. In addition, the airline offers economy class seats with 31 inches of leg space. WiFi includes a $2 messaging pack and a general wifi pack for $8.",
  "UA": "United charges $30 for your 1st checked and $40 for your 2nd bag. While economy seats have 31 inches of leg space, economy plus seats offer 34-37 inches. WiFi cost $20-$30 for the flight and passengers also have DIRECTV available to watch.",
  "AS": "Alaska charges $30 for your 1st checked and $40 for your 2nd bag. Seats will typically have 31 inches of leg space. WiFi costs $16 per a flight, and planes do not have seat-back TVs.",
  "B6": "JetBlue charges $30 for your 1st checked and $40 for your 2nd bag. Seats are a bit larger than normal and have 33 inches of leg space. Basic WiFi is free on flights, while faster WiFi is available at $9/hr. In addition, DIRECTV is offered on the flight."
};

function updateModal(id) {
  console.log('updateModal')

  d3v4.select("#flightDurations").selectAll("svg").remove();
  d3v4.select("#flightDurations").selectAll("p").remove();
  d3v4.select("#flightDurations").selectAll("br").remove();
  d3.selectAll("#prob_viz > *").remove();

  var originAirportNode = originDropdown.node()
  var destAirportNode = destDropdown.node();
  var originAirport = originAirportNode.options[originAirportNode.selectedIndex].value;
  var destAirport = destAirportNode.options[destAirportNode.selectedIndex].value;
  var flightDuration = getScheduledVsActualData()[id];
  var delays = getDelayData()[id];
  var availableFlights = delays[1];
  var expectedDuration = flightDuration[0]/(60 * availableFlights);
  var actualDuration = flightDuration[1]/(60 * availableFlights);
  var rawOcc = getOccupancyData()[id];
  var occupancy = 100 * rawOcc[0]/rawOcc[1];

  populateSeatMap(occupancy);

  d3.select('.modal-title').text(originAirport + " to " + destAirport + " on " + carrierJSON[id]);
  d3.select('#airlineDetailsTitle').text(carrierJSON[id] + " Details:")
  d3.select('#weeklyFlightsSpan1').text(parseInt(availableFlights) + " weekly flights");
  d3.select('#weeklyFlightsSpan2').text(originAirport + " to " + destAirport + " by " + carrierJSON[id]);
  d3.select('#airlineBlurb').text(airlineBlurbs[id]);

  var chartData = [{"Type": "Expected", "Duration": expectedDuration}];
  var actualData = [{"Duration": actualDuration}];

  var margin = {top: 100, right: 100, bottom: 125, left: 10},
  width = 700 - margin.left - margin.right,
  height = 300 - margin.top - margin.bottom;

  var y = d3v4.scaleBand()
        .range([height, 0])
        .padding(0.1);

  var x = d3v4.scaleLinear()
        .range([0, width]);
        
  var svg = d3v4.select("#flightDurations").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",  
        "translate(" + margin.left + "," + margin.top + ")");

  x.domain([0, d3v4.max(chartData, function(d){ return d.Duration; }) + 0.5])
  y.domain(chartData.map(function(d) { return d.Type; }));

  svg.selectAll(".bar")
    .data(chartData)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("fill", "#62a2dc")
    .attr("width", function(d) {return x(d.Duration); } )
    .attr("y", function(d) { return y(d.Type); })
    .attr("height", 0);

  svg.selectAll(".dot")
    .data(actualData)
  .enter().append("circle")
    .attr("r", 10)
    .attr("cx", function(d) { return x(d.Duration); })
    .attr("cy", function(d) { return y("Expected") + (y.bandwidth() / 2); });

  svg.selectAll(".dot")
    .data(chartData)
  .enter().append("rect")
    .attr("width", 20)
    .attr("fill", "#62a2dc")
    .attr("height", 20)
    .attr("stroke", "white")
    .attr("x", function(d) { return x(d.Duration); })
    .attr("y", function(d) { return y("Expected") + (y.bandwidth() / 2) - 10 });

  // add the x Axis
  svg.append("g")
    .style("font-size", "medium")
    .attr("transform", "translate(0," + height + ")")
    .call(d3v4.axisBottom(x));

  svg.append("text")             
    .attr("transform",
          "translate(" + (width/2) + " ," + 
                         (height + 40) + ")")
    .style("text-anchor", "middle")
    .attr("font-size", "medium")
    .text("Average Time in Air (hours)");

  svg.append("rect")
  .attr("transform",
          "translate(" + 10 + " ," + 
                         (height + 55) + ")")
    .attr("width", 20)
    .attr("fill", "#62a2dc")
    .attr("height", 20)
    .attr("stroke", "white");

  svg.append("text")             
    .attr("transform",
          "translate(" + 40 + " ," + 
                         (height + 69) + ")")
    .text("- Expected flight duration");


  svg.append("circle")
    .attr("transform",
            "translate(" + 210 + " ," + 
                 (height + 65) + ")")
    .attr("r", 12);

  svg.append("text")             
    .attr("transform",
          "translate(" + 230 + " ," + 
                         (height + 69) + ")")
    .text("- Actual flight duration");


  d3v4.select("#flightDurations").append("br")

  console.log(expectedDuration);
  console.log(actualDuration);
  d3v4.select("#flightDurations").append("p")
    .style("font-size", "large")
    .text("On average, " + carrierJSON[id] + " is " + ((expectedDuration > actualDuration) ? "ahead of" : "behind") + " schedule by " + (Math.abs(expectedDuration - actualDuration) * 60).toFixed(0) + " minutes on this route.");

  for (var i = 0; i < 7; i++) {
    d3v4.select("#flightDurations").append("br")
  }


}

function populateSeatMap(prob_filled) {
  var y_pos = 5; //TODO: UPDATE START OF SEATS

  for (var row = 0; row<20; ++row){
    var x_pos = 5; //TODO: UPDATE START OF SEATS

    for (var seat = 0; seat < 6; ++seat) {
      var x_spacing = 30;
      var y_spacing = 32;

      //Aisle seat so expand spacing
      if (seat == 2) {
          x_spacing = 50;
      }

      //Adjust for empty seats
      var prob = Math.random() * 100;
      var fill = "grey";
      if (prob>prob_filled){
          fill = "white";
      }

      d3v4.select("#prob_viz").append("rect")
          .attr("rx",5)
          .attr("ry",5)
          .attr("x", x_pos)
          .attr("y", y_pos)
          .attr("width",25)
          .attr("height",25)
          .attr("stroke", "black")
          .attr("fill", fill)

      x_pos= x_pos + x_spacing;
    }
    y_pos=y_pos+y_spacing;
  }

  d3v4.select("#prob_viz").append("rect")
  .attr("rx",5)
  .attr("ry",5)
  .attr("x", 0)
  .attr("y", y_pos + 20)
  .attr("width",25)
  .attr("height",25)
  .attr("stroke", "black")
  .attr("fill", "grey");

  d3v4.select("#prob_viz").append("text")
  .attr("x", 30)
  .attr("y", y_pos + 36)
  .text(" - Occupied")


  d3v4.select("#prob_viz").append("rect")
  .attr("rx",5)
  .attr("ry",5)
  .attr("x", 115)
  .attr("y", y_pos + 20)
  .attr("width",25)
  .attr("height",25)
  .attr("stroke", "black")
  .attr("fill", "white");

  d3v4.select("#prob_viz").append("text")
  .attr("x", 145)
  .attr("y", y_pos + 36)
  .text(" - Unoccupied")

}

function getScheduledVsActualData() {
  var originAirportNode = originDropdown.node()
  var destAirportNode = destDropdown.node();
  var monthNode = monthDropdown.node();
  var dayNode = dayDropdown.node();

  var originAirport = originAirportNode.options[originAirportNode.selectedIndex].value;
  var destAirport = destAirportNode.options[destAirportNode.selectedIndex].value;
  var month = monthNode.options[monthNode.selectedIndex].value;
  var monthIdx = window.months.indexOf(month) + 1;
  var week = dayNode.selectedIndex + 1;
  var week_to_key = {1: "first_week", 2: "second_week", 3: "third_week", 4: "fourth_week"}

  var res;
  try {
    res = window.scheduledVsActualJSON[originAirport][destAirport][monthIdx][week_to_key[week]];
  } catch (err) {
    res = null;
  }
  return res;
}

function occupancyJsonCallback(t) {
  j = JSON.parse(t);
  window.occupancyJSON = JSON.parse(t);
}

function delayJsonCallback(t) {
  j = JSON.parse(t);
  window.delayJSON = JSON.parse(t);
}

function scheduledVsActualJsonCallback(t) {
  j = JSON.parse(t);
  window.scheduledVsActualJSON = JSON.parse(t);
}

function carrierJsonCallback(t) {
  j = JSON.parse(t);
  window.carrierJSON = JSON.parse(t);
}

function getJSON(callback, path) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', path, true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}
