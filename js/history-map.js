/**
 * Main JS file for History Near Me app.
 */

(function($) {
$(document).ready(function() {
  // Top level vars
  var cartoRequest = 'http://zzolo.cartodb.com/api/v2/sql?q=';
  var map;
  var markers = {};
  
  // Map icons
  var iconSet = L.Icon.extend({
    iconUrl: 'img/star-1.png',
    iconSize: new L.Point(32, 37),
    shadowSize: new L.Point(47, 37),
    iconAnchor: new L.Point(16, 37),
    popupAnchor: new L.Point(2, -28)
  });
  var iconStart = new iconSet();
  var iconFinish = new iconSet('img/historicalquarter-white.png');
  var iconHistory = new iconSet('img/historicalquarter.png');
  
  // Let the user know things are loading
  function loading() {
    $('.loading-placeholder').addClass('loading');
  };
  function stopLoading() {
    $('.loading-placeholder').removeClass('loading');
  };
  
  // Display error
  function displayError(message) {
    var output = '<div class="alert">' +
      '<a class="close" data-dismiss="alert">&times;</a>' + 
      '<strong>Warning!</strong> ' + message +
      '</div>';
    $('body').append(output);
  };

  // Remove Markers
  function removeMarkers() {
    var i;
    for (i in markers) {
      map.removeLayer(markers[i]);
    }
  };
  
  // Make a table row
  function makeTableRow(label, value) {
    if (typeof value == 'string') {
      return '<tr><td>' + label + '</td><td><strong>' + value + '</strong></td></tr>';
    }
    return '';
  }
  
  // Format popup
  function formatPopup(data, closest) {
    var output = '';
    
    output += (closest) ? ' <span class="label label-info float-right">closest</span>' : '';
    output += '<h3>' + data.name + '</h3>';
    
    output += '<table class="popup-table table table-striped">';
    
    output += makeTableRow('Neighborhood', data.neighborhood);
    output += makeTableRow('Date designated', data.date_designated);
    output += makeTableRow('Year built', data.year);
    output += makeTableRow('Architectural style', data.style);
    output += makeTableRow('Address', data.address);
    
    output += '</table>';
    
    return output;
  };
  
  // Handle directions
  function handleDirections(data) {

    $('body').append('<div class="directions-container"><div class="directions closed btn"></div></div>');
  };

  // Function to handle turning a point into 
  function getHistory(lon, lat, callback) {
    loading();
    removeMarkers();
  
    // Create start location
    markers.originMarker = new L.Marker(new L.LatLng(lat, lon), { icon: iconStart });
    map.addLayer(markers.originMarker);
    markers.originMarker.bindPopup('<strong>Start here</strong>');
  
    // Create CartoDB query
    var query = "SELECT " +
      "ST_AsGeoJSON(s.wkb_geometry) AS geomjson, " +
      "*, " +
      "ST_Distance(ST_GeomFromText('POINT(" + lon + " " + lat + ")', 4326), ST_SetSRID(s.wkb_geometry, 4326)) AS distance " +
      "FROM sd_hrb_historical_sites AS s " +
      "LEFT JOIN sd_hrb_historical_sites_details_201111 AS d ON (CAST(TRIM(s.hrb_number) AS numeric) = CAST(d.hrb AS numeric))" + 
      "ORDER BY distance ASC " +
      "LIMIT 20";
    var request = cartoRequest + query;
    
    // Get nearest sites
    $.getJSON(request + '&callback=?', function(data) {
      stopLoading();
      if (typeof data.rows != 'undefined') {
        data = data.rows;
      }
      else {
        displayError('We were unable to find any historical sites.');
        return;
      }
      //console.log(data);
      
      // Aggregate and format
      var formatted = {};
      var r;
      for (r in data) {
        formatted[data[r].hrb] = formatted[data[r].hrb] || {};
        formatted[data[r].hrb].geo = $.parseJSON(data[r].geomjson);
        formatted[data[r].hrb].date_designated = data[r].date_designated || formatted[data[r].hrb].date_designated || {};
        formatted[data[r].hrb].name = data[r].name_of_historic_site_or_structure || formatted[data[r].hrb].name || {};
        formatted[data[r].hrb].neighborhood = data[r].neighborhood || formatted[data[r].hrb].neighborhood || {};
        formatted[data[r].hrb].year = data[r].year || formatted[data[r].hrb].year || {};
        formatted[data[r].hrb].comm_plan_area = data[r].comm_plan_area || formatted[data[r].hrb].comm_plan_area || {};
        formatted[data[r].hrb].address = data[r].street__ + ' ' + data[r].street_name + ', ' + data[r].city + ', ' + data[r].zip_code;
        formatted[data[r].hrb].style = data[r].architectural_style || formatted[data[r].hrb].style || {};
      }
      //console.log(formatted);
      
      // Add markers
      var f;
      markers.formatted = markers.formatted || {};
      for (f in formatted) {
        var closest = (f == data[0].hrb) ? true : false;
        var markerOptions = closest ? { icon: iconFinish } : { icon: iconHistory };
        markers.formatted[f] = markers.formatted[f] || {};
        markers.formatted[f].marker = new L.Marker(new L.LatLng(formatted[f].geo.coordinates[1], formatted[f].geo.coordinates[0]), markerOptions);
        map.addLayer(markers.formatted[f].marker);
        
        if (closest) {
          markers.formatted[f].marker.bindPopup(formatPopup(formatted[f], closest)).openPopup();
        }
        else {
          markers.formatted[f].marker.bindPopup(formatPopup(formatted[f], closest));
        }
      }
      
      // Get directions from mapquest
      loading();
      var closestPoint = $.parseJSON(data[0].geomjson);
      var directionCall = 'http://open.mapquestapi.com/directions/v0/optimizedroute?&outFormat=json&routeType=pedestrian&timeType=1&enhancedNarrative=false&shapeFormat=raw&locale=en_US&unit=m&from=' + lat + ',' + lon + '&to=' + closestPoint.coordinates[1] + ',' + closestPoint.coordinates[0] + '&callback=?';
      $.getJSON(directionCall, function(data) {
        //console.log(data);
        
        // Draw route
        if (typeof data.route.legs[0] != 'undefined' && typeof data.route.legs[0].maneuvers != 'undefined') {
          var parts = data.route.legs[0].maneuvers;
          var m;
          var path = [];
          for (m in parts) {
            path.push(new L.LatLng(parts[m].startPoint.lat, parts[m].startPoint.lng));
          }
          var routeDraw = new L.Polyline(path, {color: '#49AFCD'});
          map.fitBounds(new L.LatLngBounds(path));
          map.addLayer(routeDraw);
          
          // Create written directions
          handleDirections(data.route.legs[0]);
        }
        else {
          displayError('We were unable to find walking directions.  Try a different address or somewhere closer.');
          map.setView(new L.LatLng(closestPoint.coordinates[1], closestPoint.coordinates[0]), 15);
        }
        
        stopLoading();
        callback.apply(this, [data]);
      });
    });
  }

  // Make map
  var tiles = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/mapbox.mapbox-light/{z}/{x}/{y}.png', {
    subdomains: ["a", "b", "c", "d"],
    attribution: '',
    maxZoom: 17
  });
  
  map = new L.Map('history-map', {
    center: new L.LatLng(32.73, -117.17),
    zoom: 11,
    layers: [tiles]
  });
  
  // Geolocate user
  $('.geolocate-user').click(function(e) {
    e.preventDefault();
    loading();
    map.locate({
      setView: true,
      maxZoom: 10,
      enableHighAccuracy: true
    });
  });
  map.on('locationfound', function(e) {
    var position = e.latlng;
    getHistory(e.latlng.lng, e.latlng.lat, function(data) {
      //console.log(data);
    });
  });
  
  // Geolocate address
  $('.geocode-string').click(function(e) {
    loading();
    e.preventDefault();
    
    // Geocode with Mapquest
    $.getJSON('http://open.mapquestapi.com/nominatim/v1/search?format=json&json_callback=?&countrycodes=us&limit=1&q=' + encodeURI($('.geocode-value').val()), function(value) {
    
      //console.log(value);
      // Use first response
      value = value[0];
      
      // Check response
      if (value === undefined) {
        console.log('here');
        displayError('We were unable turn your search terms, <strong>' + $('.geocode-value').val() + '</strong>, into a geographical location.  Please be more specific, such as including zip code.');
      }
      else {
        // Adjust zoom level based on geography
        if (value.type == 'state' || 
            value.type == 'county' || 
            value.type == 'maritime'  || 
            value.type == 'country' ||
            value.type == 'administrative') {
          map.setView(new L.LatLng(value.lat, value.lon), 8);
        } else {
          map.setView(new L.LatLng(value.lat, value.lon), 10);
        }
        
        // Get history
        getHistory(value.lon, value.lat, function(data) {
          //console.log(data);
        });
      }
    });
  });

});
})(jQuery);