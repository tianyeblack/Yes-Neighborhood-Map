// Helper function to create InfoWindow for markers
// Done manually in favor of speed since it's simple enough
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

var gmap, home, searchRadius;

function initMap() {
  gmap = google.maps;
  home = new gmap.LatLng(47.64667360000001, -122.32474719999999);
  searchRadius = '3000';
  if (vm && !vm.map && vm.mapElement) createMap(vm, vm.mapElement);
}

function mapError() {
  alert("Fail to load Google Maps, refresh the page or try again later.");
}

// Create markers in the map with newly created locations and extend the bounds of map properly to have every marker visible in view
function createMarker(newLoc, vmmap, vmbounds) {
  if (newLoc.marker()) return;
  var geoLoc = new gmap.LatLng(newLoc.biz.location.coordinate.latitude, newLoc.biz.location.coordinate.longitude);
  var marker = new gmap.Marker({ map: vmmap, position: geoLoc, animation: gmap.Animation.DROP, title: newLoc.biz.name });
  newLoc.infoWindow = new gmap.InfoWindow({ content: createInfoWindowContentHelper(newLoc.loc(), newLoc.biz.snippet_text) });
  marker.addListener('click', function () {
    if (vm.infoWindow) vm.infoWindow.close();
    vm.infoWindow = newLoc.infoWindow;
    marker.setAnimation(gmap.Animation.BOUNCE);
    vm.infoWindow.open(vmmap, marker);
    setTimeout(function () { marker.setAnimation(null); }, 1500);
  });
  newLoc.marker(marker);
  vmbounds.extend(new gmap.LatLng(geoLoc.lat(), geoLoc.lng()));
  vmmap.fitBounds(vmbounds);
}

function createMap(viewModel, element) {
  var vmmap = new gmap.Map(element, { disableDefaultUI: true });
  if (!vmmap) return;
  viewModel.map = vmmap;
  var vmservice = new gmap.places.PlacesService(vmmap);
  var vmbounds = new gmap.LatLngBounds();

  // Add resizing event so when window size changes map changes accordingly
  window.addEventListener('resize', function(e) {
    vmmap.fitBounds(vmbounds);
  });
  viewModel.service = vmservice;
  viewModel.bounds = vmbounds;
  var locs = viewModel.locations();
  for (var i = 0; i < locs.length; i++) createMarker(locs[i], vmmap, vmbounds);
}

// Initialize a new Location
var Location = function (biz) {
  var self = this;
  this.loc = ko.observable(biz.name);
  this.vis = ko.observable(true);
  this.marker = ko.observable();
  this.infoWindow = null;
  this.biz = biz;
  this.searched = false;
};

ko.bindingHandlers.map = {
  init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var vm = bindingContext.$data;
    vm.mapElement = element;
  }
};

var MapViewModel = function () {
  var self = this;

  this.query = ko.observable('');
  this.locations = ko.observableArray([]);
  this.map = null;
  this.service = null;
  this.bounds = null;
  this.infoWindow = null;
  this.navOpen = ko.observable(false);
  this.mapElement = null;

  this.init = function () {
    // Variables for Yelp API OAuth and query
    var auth = {
      consumerKey : "1phcfdEMG3AxYfya-ZyUTw",
      consumerSecret : "SmnvCJ34s6R57EfDRRjxmDq0cKI",
      accessToken : "1YyHFhBoU0qX8iyKRW-8iiLY9pxnoxhJ",
      accessTokenSecret : "yNQHE3l0LgDo0H3757r_6rPy88M",
      serviceProvider : { signatureMethod : "HMAC-SHA1" }
    };

    var accessor = {
      consumerSecret : auth.consumerSecret,
      tokenSecret : auth.accessTokenSecret
    };

    var message = {
      action : 'http://api.yelp.com/v2/search',
      method: 'GET',
      parameters: [
        ['term', 'food'],
        ['location', '2840 Eastlake Ave E, Seattle, WA 98102'],
        ['radius_filter', 1500],
        ['callback', 'cb'],
        ['oauth_consumer_key', auth.consumerKey],
        ['oauth_token', auth.accessToken],
        ['oauth_signature_method', 'HMAC-SHA1']
      ]
    };

    // Sign the query with key and secret of consumer and token
    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);

    var yelpRequestTimeout = setTimeout(function () {
      alert("Requests to Yelp timed out. Please check your network and refresh the page.")
    }, 8000);

    // Send an AJAX to Yelp API to fetch the restaurants in the neighborhood
    $.ajax({
      url: message.action,
      data: OAuth.getParameterMap(message.parameters),
      dataType: 'jsonp',
      jsonpCallback: 'cb',
      cache: true
    }).done(function (data) {
      var biz = data.businesses;
      for (var i = 0; i < biz.length; i++) self.locations.push(new Location(biz[i]));
      clearTimeout(yelpRequestTimeout);
      if (!gmap) return;
      createMap(self, self.mapElement);
    }).fail(function (data) {
      alert("Neighborhood restaurants not available now. Please make sure your network connection is working and try refreshing the page");
    });
  };

  // Simple filter for locations based on prefix
  this.search = function (value) {
    var locs = self.locations();
    for (var x = 0; x < locs.length; x++) {
      var loc = locs[x];
      if (loc.loc().toLowerCase().indexOf(value.toLowerCase()) >= 0) loc.vis(true);
      else loc.vis(false);
      if (loc.marker()) loc.marker().setVisible(loc.vis());
      if (loc.vis() === false && loc.infoWindow !== null) loc.infoWindow.close();
    }
  };

  // In smaller screens, list is hidden but can be called out clicking on the hamburger button
  this.toggleNav = function (data, event) {
    self.navOpen(!self.navOpen());
  };

  // Cascade the click event on list item to open corresponding markers
  this.openInfoWindow = function (data, event) {
    if (data.marker()) gmap.event.trigger(data.marker(), 'click');
  };

  this.query.subscribe(this.search);
};

var vm = new MapViewModel();
$(document).ready(function () {
  ko.applyBindings(vm);
  vm.init();
});
