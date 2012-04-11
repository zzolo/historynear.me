/**
 * Some interface niceities for History Near Me app.
 */

(function($) {
$(document).ready(function() {
  // Ensure collapsed items are collapsed
  $(".collapse").collapse('hide');
  $('.geocode-string, .geolocate-user').click(function(e) {
    e.preventDefault();
    $(".collapse").collapse('hide');
  });
  
  // For now, show the about page by default
  $('.about-content').click();

});
})(jQuery);