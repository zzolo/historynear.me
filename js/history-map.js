/**
 * Main JS file for History Near Me app.
 */

(function($) {

  // Make map // ""
  var tiles = new L.TileLayer('http://{s}.tiles.mapbox.com/v3/mapbox.mapbox-streets/{z}/{x}/{y}.png', {
    attribution: 'Map imagery from <a href="http://mapbox.com">Mapbox</a>', 
    subdomains: ["a", "b", "c", "d"]
  });
  
  var map = new L.Map('history-map', {
    center: new L.LatLng(46.479553, -93.98589980000002),
    zoom: 4,
    layers: [tiles]
  });

})(jQuery);