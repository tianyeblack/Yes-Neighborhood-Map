var gmap = google.maps;

function createInfoWindowContent(title, address) {
  var titleNode = document.createElement('h2');
  var titleText = document.createTextNode(title);
  var addrText = document.createTextNode(address);
  titleNode.appendChild(titleText);
  var result = document.createElement('div');
  result.appendChild(titleNode);
  result.appendChild(addrText);
  return result;
}

ko.bindingHandlers.map = {
  init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var vm = bindingContext.$data;
    var locs = vm.locations();
    vm.map = new gmap.Map(element, { disableDefaultUI: true });
    vm.service = new gmap.places.PlacesService(vm.map);
    vm.mapBounds = new gmap.LatLngBounds();
    function createMapMarker(loc) {
      if (loc.vis()) {
        vm.service.textSearch({query: loc.loc()}, function (results, status) {
          if (status == gmap.places.PlacesServiceStatus.OK) {
            var placeData = results[0];
            var name = placeData.formatted_address;                             // name of the place from the place service
            var geoLoc = placeData.geometry.location;
            var marker = new gmap.Marker({
              map: vm.map,
              position: geoLoc,
              animation: gmap.Animation.DROP,
              title: name
            });
            loc.infoWindow = new gmap.InfoWindow({
              content: createInfoWindowContent(loc.loc(), name)
            });
            marker.addListener('click', function () {
              loc.infoWindow.open(vm.map, marker);
              marker.setAnimation((marker.getAnimation() !== null ? null : google.maps.Animation.BOUNCE));
            });
            loc.marker(marker);
            vm.mapBounds.extend(new google.maps.LatLng(
              geoLoc.lat(), geoLoc.lng()));                                     // bounds.extend() takes in a map location object
            vm.map.fitBounds(vm.mapBounds);                                     // fit the map to the new marker
            vm.map.setCenter(vm.mapBounds.getCenter());                         // center the map
          }
        });
      }
    }
    for (var i = 0; i < locs.length; i++) createMapMarker(locs[i]);
    window.addEventListener('resize', function(e) {
      vm.map.fitBounds(vm.mapBounds);
    });
  },

  update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    var locs = bindingContext.$data.locations();
    locs.forEach(function (loc) {
      if (loc.marker() != null) loc.marker().setVisible(loc.vis());
    });
  }
};

var Location = function (iLoc) {
  var self = this;
  this.loc = ko.observable(iLoc);
  this.vis = ko.observable(true);
  this.marker = ko.observable();
  this.infoWindow = null;
};

var initialLocations = ["home", "work"];

var MapViewModel = function () {
  var self = this;

  this.query = ko.observable('');
  this.locations = ko.observableArray([]);
  this.map = null;
  this.service = null;
  this.mapBounds = null;

  initialLocations.forEach(function (iLoc) {
    self.locations.push(new Location(iLoc));
  });

  this.search = function (value) {
    var locs = self.locations();
    for (var x = 0; x < locs.length; x++) {
      if (locs[x].loc().toLowerCase().indexOf(value.toLowerCase()) >= 0) locs[x].vis(true);
      else locs[x].vis(false);
    }
  }

  this.toggleNav = function (data, event) {
    var placeList = document.querySelector('.nav');
    placeList.classList.toggle('open');
    event.stopPropagation();
  };

  this.openInfoWindow = function (data, event) {
    gmap.event.trigger(data.marker(), 'click');
  };

  this.query.subscribe(this.search);
};

var vm = new MapViewModel();
ko.applyBindings(vm);
// $(document).ready(function () {
//   ko.applyBindings();
// });
