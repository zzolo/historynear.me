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
    var $output = $('<div class="alert">' +
      '<a class="close" data-dismiss="alert">&times;</a>' + 
      '<strong><i class="icon-exclamation-sign"></i> Warning!</strong> ' + message +
      '</div>').hide();
    $('body').append($output);
    $output.fadeIn().delay(3000).fadeOut('slow', function() {
      $(this).remove();
    });
  };

  // Remove Markers
  function removeMarkers() {
    var i;
    for (i in markers) {
      map.removeLayer(markers[i]);
    }
    if (typeof markers.formatted != 'undefined') {
      var f;
      for (f in markers.formatted) {
        if (markers.formatted[f].marker) {
          map.removeLayer(markers.formatted[f].marker);
        }
      }
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
    /* TODO: add direction links
    var $dLink = $('<span class="label label-success float-right">directions</span>').click(function(e) {
      map.removeLayer(markers.routeDraw);
      console.log(data);
    });
    */
    
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
  
  // Remove directions
  function removeDirections() {
    $('.directions-container').remove();
  };
  
  // Handle directions
  function handleDirections(data) {
    removeDirections();
    
    var i;
    var header = '<a class="close">&times;</a><h3>Driving Directions</h3>';
    var footer = '<p>Directions courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"></p>';
    var table = '<table class="table table-striped">';
    table += '<thead><tr><th>Distance</th><th>' + data.distance + ' miles</th></tr>';
    table += '<tr><th>Time</th><th>' + data.formattedTime + ' hours</th></tr></thead>';
    table += '<tbody>';
    
    for (i in data.maneuvers) {
      table += makeTableRow('<img src="' + data.maneuvers[i].iconUrl + '">', data.maneuvers[i].narrative);
    }
    
    table += '</tbody></table>';
    
    var $dirContainer = $('<div class="directions-container"><div class="directions closed btn">' + header + table + footer + '</div></div>');
    $dirContainer.find('.directions').click(function(e) {
      e.preventDefault();
      if ($(this).hasClass('closed')) {
        $(this).addClass('opened').removeClass('closed').removeClass('btn');
        if (!$(this).hasClass('has-opened')) {
          map.panBy(new L.Point(200, 0));
        }
        $(this).addClass('has-opened');
      }
    });
    $dirContainer.find('a.close').click(function(e) {
      e.preventDefault();
      $dirContainer.find('.directions').removeClass('opened').addClass('closed').addClass('btn');
      e.stopPropagation();
    });
    $('body').append($dirContainer);
  };
  
  // Get directions
  function getDirections(sLon, sLat, eLon, eLat, callback) {
    // Get directions from mapquest
    loading();
    var directionCall = 'http://open.mapquestapi.com/directions/v0/optimizedroute?&outFormat=json&routeType=pedestrian&timeType=1&enhancedNarrative=false&shapeFormat=raw&locale=en_US&unit=m&from=' + sLat + ',' + sLon + '&to=' + eLat + ',' + eLon + '&callback=?';
    $.getJSON(directionCall, function(data) {
      // Draw route
      if (typeof data.route.legs[0] != 'undefined' && typeof data.route.legs[0].maneuvers != 'undefined') {
        var parts = data.route.legs[0].maneuvers;
        var m;
        var path = [];
        for (m in parts) {
          path.push(new L.LatLng(parts[m].startPoint.lat, parts[m].startPoint.lng));
        }
        markers.routeDraw = new L.Polyline(path, {color: '#49AFCD'});
        map.fitBounds(new L.LatLngBounds(path));
        map.addLayer(markers.routeDraw);
        
        // Create written directions
        handleDirections(data.route.legs[0]);
      }
      else {
        displayError('We were unable to find walking directions.  Try a different address or somewhere closer.');
        map.setView(new L.LatLng(eLat, eLon), 15);
      }
      
      stopLoading();
      callback.apply(this, [data]);
    });
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
      var closestPoint = $.parseJSON(data[0].geomjson);
      getDirections(lon, lat, closestPoint.coordinates[0], closestPoint.coordinates[1], callback);
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
    removeDirections();
    
    map.locate({
      setView: true,
      maxZoom: 10,
      enableHighAccuracy: true
    });
  });
  map.on('locationfound', function(e) {
    var position = e.latlng;
    getHistory(e.latlng.lng, e.latlng.lat, function(data) {
    });
  });
  
  // Geolocate address
  $('.geocode-string').click(function(e) {
    loading();
    removeDirections();
    e.preventDefault();
    
    // Geocode with Mapquest
    $.getJSON('http://open.mapquestapi.com/nominatim/v1/search?format=json&json_callback=?&countrycodes=us&limit=1&q=' + encodeURI($('.geocode-value').val()), function(value) {
      // Use first response
      value = value[0];
      
      // Check response
      if (value === undefined) {
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
        });
      }
    });
  });

});
})(jQuery);