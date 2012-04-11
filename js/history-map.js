/**
 * Main JS file for History Near Me app.
 */

(function($) {
$(document).ready(function() {

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
    
    var directionCall = 'http://open.mapquestapi.com/directions/v0/route?&outFormat=json&routeType=pedestrian&timeType=1&enhancedNarrative=false&shapeFormat=raw&locale=en_US&unit=m&from=' + e.latlng.lat + ',' + e.latlng.lon + '&to=38.84457,-77.078222&callback=?';
  });
  
  // Geolocate address
  $('.geocode-string').click(function(e) {
    e.preventDefault();
    console.log($('.geocode-value').val());
    
    // Geocode with Mapquest
    $.getJSON('http://open.mapquestapi.com/nominatim/v1/search?format=json&json_callback=?&countrycodes=us&limit=1&q=' + $('.geocode-value').val(), function (value) {
    
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