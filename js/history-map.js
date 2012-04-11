/**
 * Main JS file for History Near Me app.
 */

(function($) {
$(document).ready(function() {
  // Top level vars
  var cartoRequest = 'http://zzolo.cartodb.com/api/v2/sql?q=';

  // Make map
  var tiles = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/mapbox.mapbox-streets/{z}/{x}/{y}.png', {
    attribution: 'Map imagery from <a href="http://mapbox.com">Mapbox</a>', 
    subdomains: ["a", "b", "c", "d"]
  });
  
  var map = new L.Map('history-map', {
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
    var query = "SELECT " +
      "ST_AsGeoJSON(s.wkb_geometry) AS geomjson, " +
      "*, " +
      "ST_Distance(ST_GeomFromText('POINT(" + e.latlng.lng + " " + e.latlng.lat + ")', 4326), ST_SetSRID(s.wkb_geometry, 4326)) AS distance " +
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
      console.log(data);
      
      // Aggregate and format
      var formatted = {};
      var r;
      for (r in data) {
        formatted[data[r].hrb] = formatted[data[r].hrb] || {};
        formatted[data[r].hrb].geo = data[r].geomjson;
        formatted[data[r].hrb].date_designated = data[r].date_designated || formatted[data[r].hrb].date_designated || {};
        formatted[data[r].hrb].name = data[r].name_of_historic_site_or_structure || formatted[data[r].hrb].name || {};
        formatted[data[r].hrb].neighborhood = data[r].neighborhood || formatted[data[r].hrb].neighborhood || {};
        formatted[data[r].hrb].year = data[r].year || formatted[data[r].hrb].year || {};
        formatted[data[r].hrb].comm_plan_area = data[r].comm_plan_area || formatted[data[r].hrb].comm_plan_area || {};
        formatted[data[r].hrb].address = data[r].street__ + ' ' + data[r].street_name + ', ' + data[r].city + ', ' + data[r].zip_code
      }
      console.log(formatted);
    });
    
    
    var directionCall = 'http://open.mapquestapi.com/directions/v0/route?&outFormat=json&routeType=pedestrian&timeType=1&enhancedNarrative=false&shapeFormat=raw&locale=en_US&unit=m&from=' + e.latlng.lat + ',' + e.latlng.lng + '&to=38.84457,-77.078222&callback=?';
  });
  
  // Geolocate address
  $('.geocode-string').click(function(e) {
    e.preventDefault();
    
    // Geocode with Mapquest
    $.getJSON('http://open.mapquestapi.com/nominatim/v1/search?format=json&json_callback=?&countrycodes=us&limit=1&q=' + encodeURI($('.geocode-value').val()), function(value) {
    
    console.log(value);
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
      }
    });
  });

});
})(jQuery);