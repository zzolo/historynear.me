/**
 * Main JS file for History Near Me app.
 */

(function($) {
$(document).ready(function() {
  // Top level vars
  var cartoRequest = 'http://zzolo.cartodb.com/api/v2/sql?q=';
  var map;
  
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

  // Function to handle turning a point into 
  function getHistory(lon, lat, callback) {
    // Create start location
    var originMarker = new L.Marker(new L.LatLng(lat, lon), { icon: iconStart });
    map.addLayer(originMarker);
    originMarker.bindPopup('<strong>Start here</strong>');
  
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
      if (typeof data.rows != 'undefined') {
        data = data.rows;
      }
      else {
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
      }
      //console.log(formatted);
      
      // Add markers
      var f;
      for (f in formatted) {
        formatted[f].marker = new L.Marker(new L.LatLng(formatted[f].geo.coordinates[1], formatted[f].geo.coordinates[0]), { icon: iconHistory });
        map.addLayer(formatted[f].marker);
        formatted[f].marker.bindPopup('<h3>' + formatted[f].name + '</h3>');
      }
      
      // Get directions from mapquest
      var closestPoint = $.parseJSON(data[0].geomjson);
      var closestMarker = new L.Marker(new L.LatLng(closestPoint.coordinates[1], closestPoint.coordinates[0]), { icon: iconFinish });
      map.addLayer(closestMarker);
      closestMarker.bindPopup('<strong>End here</strong>');
      
      var directionCall = 'http://open.mapquestapi.com/directions/v0/optimizedroute?&outFormat=json&routeType=pedestrian&timeType=1&enhancedNarrative=false&shapeFormat=raw&locale=en_US&unit=m&from=' + lat + ',' + lon + '&to=' + closestPoint.coordinates[1] + ',' + closestPoint.coordinates[0] + '&callback=?';
      $.getJSON(directionCall, function(data) {
        //console.log(data);
        
        // Draw route
        var parts = data.route.legs[0].maneuvers;
        var m;
        var path = [];
        for (m in parts) {
          path.push(new L.LatLng(parts[m].startPoint.lat, parts[m].startPoint.lng));
        }
        var routeDraw = new L.Polyline(path, {color: '#49AFCD'});
        map.fitBounds(new L.LatLngBounds(path));
        map.addLayer(routeDraw);
        
        callback.apply(this, [data]);
      });
    });
  }

  // Make map
  var tiles = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/mapbox.mapbox-streets/{z}/{x}/{y}.png', {
    attribution: 'Map imagery from <a href="http://mapbox.com">Mapbox</a>; Map data &copy; OpenStreetMap contributors, CC-BY-SA; Directions courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">', 
    subdomains: ["a", "b", "c", "d"]
  });
  
  map = new L.Map('history-map', {
    center: new L.LatLng(46.479553, -93.98589980000002),
    zoom: 4,
    layers: [tiles]
  });
  
  // Geolocate user
  $('.geolocate-user').click(function(e) {
    e.preventDefault();
    map.locate({
      watch: true,
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
    e.preventDefault();
    
    // Geocode with Mapquest
    $.getJSON('http://open.mapquestapi.com/nominatim/v1/search?format=json&json_callback=?&countrycodes=us&limit=1&q=' + encodeURI($('.geocode-value').val()), function(value) {
    
      //console.log(value);
      // Use first response
      value = value[0];
      
      // Check response
      if (value === undefined) {
        // handle error
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