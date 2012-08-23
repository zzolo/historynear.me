/**
 * Some interface niceities for History Near Me app.
 */

(function($) {
$(document).ready(function() {
  // Ensure collapsed items are collapsed
  //$(".collapse").collapse('hide');
  $('.geocode-string, .geolocate-user').click(function(e) {
    e.preventDefault();
    if (!$.browser.msie) {
      $(".collapse").collapse('hide');
    }
  });
  
  // For now, show the about page by default
  $('.about-content').click();
  
  // Example links
  $('.example-link').click(function(e) {
    e.preventDefault();
    $('#modal-about a.close').click();
    $('.geocode-value').val($(this).attr('data-example'));
    $('.geocode-string').click();
  });

});
})(jQuery);