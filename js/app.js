var gmap = google.maps;
var yelpQuery = "https://api.yelp.com/v2/search/?term=restaurants&location=2840 Eastlake Ave E, Seattle, WA&limit=20&radius_filter=2500";
var home = new gmap.LatLng(47.64667360000001, -122.32474719999999);
var searchRadius = '750';

function createInfoWindowContentHelper(title, address) {
  var titleNode = document.createElement('h2');
  var titleText = document.createTextNode(title);
  var addrText = document.createTextNode(address);
  titleNode.appendChild(titleText);
  var result = document.createElement('div');
  result.appendChild(titleNode);
  result.appendChild(addrText);
  return result;
}

var Location = function (iLoc) {
  var self = this;
  this.loc = ko.observable(iLoc);
  this.vis = ko.observable(true);
  this.marker = ko.observable();
  this.infoWindow = null;
};

ko.bindingHandlers.map = {
  init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var vm = bindingContext.$data;
    vm.map = new gmap.Map(element, { disableDefaultUI: true });
    vm.service = new gmap.places.PlacesService(vm.map);
    vm.mapBounds = new gmap.LatLngBounds();

    function createMapMarkers() {
      function createMarker(newLoc, rslt) {
        var name = rslt.vicinity;
        var geoLoc = rslt.geometry.location;
        var marker = new gmap.Marker({ map: vm.map, position: geoLoc, animation: gmap.Animation.DROP, title: name });
        newLoc.infoWindow = new gmap.InfoWindow({ content: createInfoWindowContentHelper(newLoc.loc(), name) });
        marker.addListener('click', function () {
          newLoc.infoWindow.open(vm.map, marker);
          marker.setAnimation(gmap.Animation.BOUNCE);
          setTimeout(function () { marker.setAnimation(null); }, 1500);
        });
        newLoc.marker(marker);
        vm.mapBounds.extend(new gmap.LatLng(geoLoc.lat(), geoLoc.lng()));
        vm.map.fitBounds(vm.mapBounds);
      }

      var request = { location: home, radius: searchRadius, types: ['restaurant'] };
      vm.service.nearbySearch(request, function (rslts, status) {
        if (status == gmap.places.PlacesServiceStatus.OK) {
          for (var i = 0; i < rslts.length; i++) {
            var newLoc = new Location(rslts[i].name);
            vm.locations.push(newLoc);
            createMarker(newLoc, rslts[i]);
          }
        }
      });

      vm.map.setCenter(vm.mapBounds.getCenter());
    }
    createMapMarkers();

    window.addEventListener('resize', function(e) {
      vm.map.fitBounds(vm.mapBounds);
    });
  },

  update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
    var locs = bindingContext.$data.locations();
    locs.forEach(function (loc) {
      if (loc.marker() != null) loc.marker().setVisible(loc.vis());
      if (loc.vis() == false && loc.infoWindow != null) loc.infoWindow.close();
    });
  }
};

var MapViewModel = function () {
  var self = this;

  this.query = ko.observable('');
  this.locations = ko.observableArray([]);
  this.map = null;
  this.service = null;
  this.mapBounds = null;

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
