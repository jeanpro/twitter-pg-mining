function initMap() {
  var newyork = {lat: 40.712598, lng: -73.989023};

  //Define map Types and add OSM option
  var mapTypeIds = [];
  for(var type in google.maps.MapTypeId) {
      mapTypeIds.push(google.maps.MapTypeId[type]);
  }
  mapTypeIds.push("OSM");

  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 9,
    center: newyork,
    mapTypeId: "OSM",
    mapTypeControl: false,
    mapTypeControlOptions: {
        mapTypeIds: mapTypeIds
    }
  });

  //Define OSM map type pointing at the OpenStreetMap tile server
  map.mapTypes.set("OSM", new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
          // "Wrap" x (logitude) at 180th meridian properly
          // NB: Don't touch coord.x because coord param is by reference, and changing its x property breakes something in Google's lib 
          var tilesPerGlobe = 1 << zoom;
          var x = coord.x % tilesPerGlobe;
          if (x < 0) {
              x = tilesPerGlobe+x;
          }
          // Wrap y (latitude) in a like manner if you want to enable vertical infinite scroll

          return "http://tile.openstreetmap.org/" + zoom + "/" + x + "/" + coord.y + ".png";
      },
      tileSize: new google.maps.Size(256, 256),
      name: "OpenStreetMap",
      maxZoom: 18
  }));


  var marker = new google.maps.Marker({
    position: newyork,
    map: map,
    draggable: true,
    animation: google.maps.Animation.DROP
  });
  var markerCircle = new google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.4,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.2,
      map: map,
      center: marker.getPosition(),
      radius: 30000
    });
  updateForm(marker);

  marker.addListener('drag', function(){
    markerCircle.setCenter(this.getPosition());
    updateForm(this);
  });

  $('#radiusSlider').on('slide', function(evt){
    var radius = evt.value*1000;
    markerCircle.setRadius(radius);
  });

  map.addListener('click', function(mouseEvent){
    var latLng = mouseEvent.latLng;
    marker.setPosition(latLng);
    markerCircle.setCenter(latLng);
    updateForm(marker);
  });

}

function updateForm(marker){
  var lat = marker.getPosition().lat();
  var lng = marker.getPosition().lng();
  $('#lat').val(lat.toFixed(6));
  $('#lng').val(lng.toFixed(6));
}