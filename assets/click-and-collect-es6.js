class ClickAndCollect {
  constructor(settings) {
    this.settings = settings;
    this.element = document.getElementById('cnc-container');
    this.resultsContainer = document.getElementById('cnc-results-container');
    this.mapContainer = document.getElementById('cnc-map-container');
    this.messages = {};
    this.mapFocus = null;
    if (this.settings.enableMap && window.mapIsReady) {
      this.mapReady();
    }
  }
  addMessage(name, value, isError) {
    if (!this.messages[name]) {
      var message = new Message(value, isError);
      this.messages[name] = message;
      this.resultsContainer.appendChild(message.getElement());
    }
  }
  removeMessage(name) {
    if (this.messages[name]) {
      this.messages[name].getElement().outerHTML = '';
      delete this.messages[name];
    }
  }
  clearErrors() {
    for (let [name, message] of Object.entries(this.messages)) {
      if (message.isError) {
        this.removeMessage(name);
      }
    }
  }
  addAddressSearch() {
    this.search = new AddressSearch(this);
    this.mapContainer.appendChild(this.search.getElement());
  }
  addMap() {
    this.gmap = new GMap(this);
    this.mapContainer.appendChild(this.gmap.getElement());
    this.gmap.initMap();
  }
  mapReady() {
    this.addAddressSearch();
    this.addMap();
  }
  searchAddress(address) {
    var geocoder = new google.maps.Geocoder();
    var parent = this;
    geocoder.geocode({address: address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        parent.removeMessage('addressNotFound');
        parent.mapFocus = results[0].geometry.location;
        parent.results.setLocation(parent.mapFocus.lat(), parent.mapFocus.lng());
        parent.results.update();
        parent.gmap.show();
      } else {
        parent.results.setLocation(null, null);
        parent.addMessage('addressNotFound', address + ' not found.', true);
      }
    });
  }
  updateMap() {
    this.gmap.searchLocationsNear(this.mapFocus, this.results.getAllOutlets());
  }
}

class ClickAndCollectCart extends ClickAndCollect {
  constructor(settings) {
    super(settings);
    this.mode = null;
    this.modeButtons = {};
    this.outletContactFields = {};
    this.addModeButtons(['home', 'store']);
    this.addOutletContactFields(['address1', 'address2', 'address3', 'suburb', 'state', 'postcode', 'phone', 'email']);
    this.addOutletNameField();
    this.addOutletNumberField();
    this.addResults();
    this.addCartUpdateListener();
    this.setMode('home');
    this.updateCollectionAbility();
    if (!this.settings.enableMap) {
      this.results.update();
    }
  }
  addModeButtons(values) {
    for (var value of values) {
      var button = new ModeButton(this, value);
      this.modeButtons[value] = button;
      this.element.appendChild(button.getElement());
      this.element.appendChild(button.getLabel());
    }
    var modeInput = document.createElement('input');
    modeInput.id = `cnc-mode-input`;
    modeInput.type = 'hidden';
    modeInput.name = 'attributes[cnc-fulfilment-method]';
    modeInput.value = 'home';
    this.element.appendChild(modeInput);
    this.modeInput = modeInput;
  }
  addOutletContactFields(fieldNames) {
    for (var fieldName of fieldNames) {
      var field = new OutletContactField(fieldName);
      this.outletContactFields[fieldName] = field;
      this.element.appendChild(field.getElement());
    }
  }
  addOutletNumberField() {
    var field = new OutletContactField('number', 'cnc-outlet', 'attributes[cnc-outlet]');
    this.outletNumberField = field;
    this.element.appendChild(field.getElement());
  }
  addOutletNameField() {
    var field = new OutletContactField('name', 'cnc-store-name', 'attributes[cnc-store-name]');
    this.outletNameField = field;
    this.element.appendChild(field.getElement());
  }
  addResults() {
    this.results = new CartResults(this, this.settings.apiPrefix, this.settings.subdomain);
    this.resultsContainer.appendChild(this.results.getElement());
  }
  getMode() {
    return this.mode;
  }
  setMode(mode) {
    if (mode === this.mode) {
      return;
    }
    this.clearErrors();
    this.mode = mode;
    this.modeInput.value = mode;
    for (let [key, modeButton] of Object.entries(this.modeButtons)) {
      if (modeButton.getValue() === mode) {
        modeButton.select();
      }
      modeButton.updateDisplay();
    }
    if (this.mode === 'home') {
      if (this.mapContainer) {
        this.mapContainer.style.display = 'none';
      }
      this.results.hide();
      this.results.selectNone();
      for (let [key, contactField] of Object.entries(this.outletContactFields)) {
        contactField.clear();
      }
      this.outletNameField.clear();
      this.addMessage('home', '<p class="cnc-message">You will be able to select a home delivery method in the checkout. To avoid delays to your delivery, make sure you select standard or express shipping during checkout and not click & collect.</p>', false);
    } else if (this.mode === 'store') {
      if (this.mapContainer) {
        this.mapContainer.style.display = '';
      }
      this.results.show();
      this.removeMessage('home');
      this.results.selectFirst();
      this.updateContactFields();
    }
    this.updateCheckoutButton();
  }
  updateCollectionAbility() {
    if (this.results.doOutletsExist() || this.settings.enableMap) {
      this.modeButtons['store'].show();
      this.removeMessage('noLocations');
    } else {
      this.setMode('home');
      this.modeButtons['store'].hide();
      this.addMessage('noLocations', '<p class="cnc-error">No locations available for store pickup.<p/>', true);
    }
  }
  updateContactFields() {
    var selectedOutlet = this.results.getSelectedOutlet();
    if (selectedOutlet) {
      for (let [key, contactField] of Object.entries(this.outletContactFields)) {
        contactField.setValue(selectedOutlet.getContact()[key]);
      }
      this.outletNameField.setValue(selectedOutlet.getName());
      this.outletNumberField.setValue(selectedOutlet.getExternalId());
    }
  }
  updateCheckoutButton() {
    var checkoutButton = document.querySelector('button[name="checkout"]') || document.querySelector('input[name="checkout"]');
    if (checkoutButton) {
      this.checkoutButton = checkoutButton;
      if (this.mode === 'store' && !this.results.areOutletsAvailable()) {
        checkoutButton.disabled = true;
        if (this.results.isLoaded()) {
          if (this.settings.enableMap && this.results.count() < 1) {
            this.removeMessage('pleaseUpdateCart');
            this.addMessage('pleaseSearchAgain', '<p class="cnc-error">Sorry, no pickup locations are available in this area. Please search again or choose Home Delivery.</p>', true);
          } else {
            this.removeMessage('pleaseSearchAgain');
            this.addMessage('pleaseUpdateCart', '<p class="cnc-error">Sorry, no pickup locations are available for all items in your cart. Please remove items from your cart or choose Home Delivery.</p>', true);
          }
        }
      } else {
        checkoutButton.disabled = false;
        this.removeMessage('pleaseUpdateCart');
        this.removeMessage('pleaseSearchAgain');
      }
    }
  }
  addCartUpdateListener() {
    var parent = this;
    var cartTable = document.getElementById('CartProducts');
    if (cartTable) {
      cartTable.addEventListener('DOMSubtreeModified', (event) => {
        if (parent.results.isLoaded()) {
          parent.results.update();
        }
      });
    }
  }
}

class ClickAndCollectProduct extends ClickAndCollect {
  constructor(settings, initialVariantId) {
    super(settings);
    this.initialVariantId = initialVariantId;
    this.addCheckStockButton();
    this.addResults();
    this.addVariantEventListener();
    if (this.mapContainer) {
      this.mapContainer.style.display = 'none';
    }
  }
  addCheckStockButton() {
    var checkStockButton = new CheckStockButton(this);
    this.element.appendChild(checkStockButton.getElement());
  }
  addResults() {
    var results = new ProductResults(this, this.settings.apiPrefix, this.settings.subdomain, this.initialVariantId);
    this.results = results;
    this.resultsContainer.appendChild(this.results.getElement());
  }
  addVariantEventListener() {
    var form = document.querySelector('form[action="/cart/add"]');
    if (form) {
      form.addEventListener('click', (event) => {
        if (this.results.isLoaded()) {
          this.results.unload();
          this.clearErrors();
          if (this.settings.enableMap) {
            this.mapContainer.style.display = 'none';
            this.gmap.hide();
          }
        }
      });
    }
  }
  reveal() {
    if (this.settings.enableMap) {
      this.mapContainer.style.display = '';
    } else {
      this.results.fetch();
    }
  }
  resultsLoaded() {
    if (this.settings.enableMap && this.results.count() < 1) {
      this.addMessage('pleaseSearchAgain', 'Sorry, no pickup locations are available in this area.', true);
    } else {
      this.removeMessage('pleaseSearchAgain');
    }
  }
}

class Renderable {
  getElement() {
    return this.element;
  }
  show() {
    this.element.style.display = '';
    if (this.label) {
      this.label.style.display = '';
    }
  }
  hide() {
    this.element.style.display = 'none';
    if (this.label) {
      this.label.style.display = 'none';
    }
  }
}

class AddressSearch extends Renderable {
  constructor(cnc) {
    super();
    this.cnc = cnc;
    this.createElement();
  }
  createElement() {
    this.element = document.createElement('div');
    this.element.classList.add('cnc-address-search');
    this.element.id = 'cnc-address-search';
    this.label = document.createElement('p');
    this.label.innerHTML = 'Search for a location to pick up your order:';
    this.element.appendChild(this.label);
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.classList.add('cnc-address-search-input');
    this.input.placeholder = 'Enter your postcode...';
    this.element.appendChild(this.input);
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('cnc-address-search-button');
    this.button.innerHTML = '<i class="fas fa-search"></i><span class="cnc-address-search-label">Search</span>';
    this.element.appendChild(this.button);
    this.button.addEventListener('click', (event) => {
      this.cnc.searchAddress(this.input.value);
    });
    var parent = this;
    this.input.addEventListener('keyup', function(event) {
      if (event.keyCode === 13) {
        event.preventDefault();
        parent.button.click();
        return false;
      }
    });
    this.input.addEventListener('keydown', function(event) {
      if (event.keyCode === 13) {
        event.preventDefault();
        return false;
      }
    });
  }
}

class GMap extends Renderable {
  constructor(cnc) {
    super();
    this.cnc = cnc;
    this.gmap;
    this.markers = [];
    this.infoWindow;
    this.locationSelect;
    this.mapInitialised = false;
    this.createElement();
  }
  createElement() {
    this.element = document.createElement('div');
    this.element.id = 'cnc-map';
    this.hide();
  }
  initMap() {
    var sydney = {lat: -33.863276, lng: 151.107977};
    this.gmap = new google.maps.Map(this.element, {
      center: sydney,
      zoom: 11,
      zoomControl: true,
      mapTypeId: 'roadmap'
    });
    this.infoWindow = new google.maps.InfoWindow();
    this.mapInitialised = true;
  }
  clearLocations() {
    this.infoWindow.close();
    for (var i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers.length = 0;
  }
  searchLocationsNear(center, outlets) {
    this.clearLocations();
    var bounds = new google.maps.LatLngBounds();
    for (let [name, outlet] of Object.entries(outlets)) {
      var bounds = new google.maps.LatLngBounds();
      var address = outlet.getAddressHtml();
      var distance = 0;
      var latlng = new google.maps.LatLng(
        parseFloat(outlet.getContact().latitude),
        parseFloat(outlet.getContact().longitude)
      );
      this.createMarker(latlng, name, address, outlet.data.distance);
      bounds.extend(latlng);
    }
    if (outlets.length >= 1) {
      this.gmap.fitBounds(bounds);
      var zoom = this.gmap.getZoom();
      this.gmap.setZoom(zoom > 10 ? 10 : zoom);
    } else {
      this.gmap.setCenter(center);
    }
  }
  createMarker(latlng, name, address, distance) {
    var html = `<b>${name}</b><br>`;
    if (distance) {
      html += distance + 'km<br>';
    }
    html += address;
    var marker = new google.maps.Marker({
      map: this.gmap,
      position: latlng
    });
    var parent = this;
    google.maps.event.addListener(marker, 'click', function() {
      parent.infoWindow.setContent(html);
      parent.infoWindow.open(parent.gmap, marker);
    });
    this.markers.push(marker);
  }
}

class ModeButton extends Renderable {
  constructor(cnc, value) {
    super();
    this.cnc = cnc;
    this.value = value;
    this.createElement();
    this.createLabel();
    this.element.addEventListener('change', (event) => {
      this.cnc.setMode(this.element.value);
    });
    this.updateDisplay();
  }
  select() {
    if (!this.element.checked) {
      this.element.checked = true;
    }
  }
  updateDisplay() {
    if (this.element.checked) {
      this.label.classList.add('btn-cnc');
    } else {
      this.label.classList.remove('btn--secondary');
    }
  }
  createElement() {
    this.element = document.createElement('input');
    this.element.id = `cnc-${this.value}-radio`;
    this.element.type = 'radio';
    this.element.value = this.value;
    this.element.name = 'cnc-mode-radio';
  }
  createLabel() {
    this.label = document.createElement('label');
    this.label.setAttribute('for', `cnc-${this.value}-radio`);
    this.label.classList.add('btn-cnc');
    if (this.value === 'home') {
      this.label.innerHTML = '<i class="fas fa-globe-americas"></i><br><p class="cnc-option"> Home Delivery</p>';
    } else if (this.value === 'store') {
      this.label.style.display = 'none';
      this.label.innerHTML = '<i class="fas fa-store"></i><br><p class="cnc-option"> Store Pickup</p>';
    }
  }
  getLabel() {
    return this.label;
  }
  getValue() {
    return this.element.value;
  }
}

class CheckStockButton extends Renderable {
  constructor(cncProduct) {
    super();
    this.cncProduct = cncProduct;
    this.createElement();
    this.element.addEventListener('click', (event) => {
      var addToCartButton = document.querySelector('form[action="/cart/add"] button[type="submit"]');
      if (addToCartButton && addToCartButton.disabled) {
        this.cncProduct.addMessage('productUnavailable', 'Product variant is unavailable.', true);
      } else {
        this.cncProduct.removeMessage('productUnavailable');
      	this.cncProduct.reveal();
      }
    });
  }
  createElement() {
    this.element = document.createElement('button');
    this.element.innerHTML = 'Check stock in store';
    this.element.classList.add('btn');
  }
}

class Outlet extends Renderable {
  constructor(cnc, data, cartItems) {
    super();
    this.cnc = cnc;
    this.data = data;
    this.createAvailabilityTable(cartItems);
    this.createElement();
    this.createLabel();
    this.element.addEventListener('change', (event) => {
      cnc.updateContactFields();
    });
  }
  getAvailability() {
    return this.availabilityTable && this.availabilityTable.isOutletAvailable();
  }
  getAvailabilityTable() {
    return this.availabilityTable;
  }
  createAvailabilityTable(cartItems) {
    this.availabilityTable = new AvailabilityTable(
      cartItems,
      this.data.stock,
      true,
      this.cnc.settings.showQuantity
    );
  }
  isSelected() {
    return this.element.checked;
  }
  select() {
    this.element.checked = true;
  }
  deselect() {
    this.element.checked = false;
  }
  getContact() {
    return this.data.contact;
  }
  getName() {
    return this.data.name;
  }
  getExternalId() {
    return this.data.external_id;
  }
  createElement() {
    this.element = document.createElement('input');
    this.element.id = `cnc-outlet-${this.data.external_id}`;
    this.element.type = 'radio';
    this.element.name = 'cnc-outlet-element';
    this.element.value = this.data.external_id;
    this.element.disabled = !this.getAvailability();
    this.element.classList.add('cnc-outlet');
  }
  createLabel() {
    this.label = document.createElement('label');
    this.label.setAttribute('for', `cnc-outlet-${this.data.external_id}`);
    this.label.classList.add('cnc-outlet-label');
    var storeDetails = document.createElement('div');
    storeDetails.classList.add('cnc-store-details');
    storeDetails.insertAdjacentHTML('beforeend', `<strong>${this.data.name}</strong><br>`);
    if (this.data.distance) {
      storeDetails.insertAdjacentHTML('beforeend', this.data.distance + 'km<br>');
    }
    storeDetails.insertAdjacentHTML('beforeend', this.getAddressHtml());
    this.label.appendChild(storeDetails);
    this.label.appendChild(this.getAvailabilityTable().getElement());
  }
  getAddressHtml() {
    var address = document.createElement('span');
    address.id = `cnc-outlet-${this.data.external_id}-address`;
    var innerHtml = '';
    if (this.data.contact.address1) {
      innerHtml += this.data.contact.address1 + '<br>';
    }
    if (this.data.contact.address2) {
      innerHtml += this.data.contact.address2 + '<br>';
    }
    if (this.data.contact.address3) {
      innerHtml += this.data.contact.address3 + '<br>';
    }
    if (this.data.contact.suburb) {
      innerHtml += this.data.contact.suburb + ' ';
    }
    if (this.data.contact.state) {
      innerHtml += this.data.contact.state + ' ';
    }
    if (this.data.contact.postcode) {
      innerHtml += this.data.contact.postcode;
    }
    innerHtml += '<br>';
    if (this.data.contact.phone) {
      innerHtml += `Phone: <a href="tel:${this.data.contact.phone}">${this.data.contact.phone}</a><br>`;
    }
    if (this.data.contact.email) {
      innerHtml += `Email: <a href="mailto:${this.data.contact.email}">${this.data.contact.email}</a>`;
    }
    return innerHtml;
  }
  getLabel() {
    return this.label;
  }
}

class ProductOutlet extends Outlet {
  constructor(cnc, data, cartItems) {
    super(cnc, data, cartItems);
  }
  createAvailabilityTable(cartItems) {
    this.availabilityTable = new AvailabilityTable(
      cartItems,
      this.data.stock,
      false,
      this.cnc.settings.showQuantity
    );
  }
  createElement() {
    this.element = document.createElement('div');
    this.element.classList.add('cnc-outlet');
  }
  createLabel() {
    this.label = document.createElement('div');
    this.label.classList.add('cnc-outlet-label');
    this.label.classList.add('cnc-product-outlet-label');
    var storeDetails = document.createElement('div');
    storeDetails.classList.add('cnc-store-details');
    storeDetails.insertAdjacentHTML('beforeend', `<strong>${this.data.name}</strong><br>`);
    storeDetails.insertAdjacentHTML('beforeend', this.getAddressHtml());
    this.label.appendChild(storeDetails);
    this.label.appendChild(this.getAvailabilityTable().getElement());
  }
}

class AvailabilityTable extends Renderable {
  constructor(cartItems, stockLevels, showTable, showQuantity) {
    super();
    this.products = [];
    this.showTable = showTable;
    this.showQuantity = showQuantity;
    this.updateProducts(cartItems, stockLevels);
    this.createElement();
  }
  updateProducts(cartItems, stockLevels) {
    if (cartItems && cartItems.length) {
      for (let cartItem of cartItems) {
        var product = Object.assign({}, cartItem);
        product.outletStock = stockLevels[cartItem.variant_id];
        this.products.push(product);
      }
    } else {
      for (let [variantId, stockLevel] of Object.entries(stockLevels)) {
        var product = {
          variant_id: variantId,
          outletStock: stockLevel,
          quantity: 1
        };
        this.products.push(product);
      }
    }
  }
  isOutletAvailable() {
    for (let product of this.products) {
      if (!this.isProductAvailable(product)) {
        return false;
      }
    }
    return true;
  }
  isProductAvailable(product) {
    return product.outletStock >= product.quantity;
  }
  createElement() {
    if (this.showTable) {
      this.createTableElement();
    } else {
      this.createTextElement();
    }
  }
  createTableElement() {
    this.element = document.createElement('table');
    this.element.classList.add('cnc-availability-table');
    if (this.isOutletAvailable()) {
      var headingHtml = `<tr><th colspan="3" class="cnc-heading-available">All items available</th></tr>`;
    } else {
      var headingHtml = `<tr><th colspan="3" class="cnc-heading-unavailable">Some items are not available</th></tr>`;
    }
    var head = document.createElement('thead');
    head.insertAdjacentHTML('beforeend', headingHtml);
    head.insertAdjacentHTML('beforeend', '<tr><th>Product</th><th>Qty</th><th>Available</th></tr>');
    this.element.appendChild(head);
    var body = document.createElement('tbody');
    for (let product of this.products) {
      if (this.isProductAvailable(product)) {
        var productTitle = product.title;
      } else if (product.outletStock > 0) {
        var productTitle = `<span class="strike">${product.title}</span> <span class="cnc-negative-text">(Insufficient stock)</span>`;
      } else {
        var productTitle = `<span class="strike">${product.title}</span> <span class="cnc-negative-text">(Out of stock)</span>`;
      }
      if (this.showQuantity) {
        var productAvailable = this.isProductAvailable(product)
          ? `<span class="cnc-positive-text"><strong>${product.outletStock}</strong></span>`
          : `<span class="cnc-negative-text"><strong>${product.outletStock}</strong></span>`;
      } else {
        var productAvailable = this.isProductAvailable(product)
          ? '<i class="fas fa-check-circle cnc-positive-text"></i>'
          : '<i class="fas fa-times-circle cnc-negative-text"></i>';
      }
      body.insertAdjacentHTML('beforeend', `<tr><td>${productTitle}</td><td>${product.quantity}</td><td>${productAvailable}</td></tr>`);
    }
    this.element.appendChild(body);
  }
  createTextElement() {
    this.element = document.createElement('p');
    this.element.classList.add('cnc-heading-availability');
    if (this.isOutletAvailable()) {
      if (this.showQuantity && this.products.length === 1) {
        this.element.innerHTML = `${this.products[0].outletStock} available`;
      } else {
        this.element.innerHTML = 'In stock';
      }
      this.element.classList.add('cnc-heading-available');
    } else {
      this.element.innerHTML = 'Out of stock';
      this.element.classList.add('cnc-heading-unavailable');
    }
  }
}

class OutletContactField extends Renderable {
  constructor(name, id, elementName) {
    super();
    this.name = name;
    this.createElement(id, elementName);
  }
  createElement(id, elementName) {
    this.element = document.createElement('input');
    this.element.type = 'hidden';
    this.element.classList.add('cnc-contact');
    this.element.id = id || `cnc-contact-${this.name}`;
    this.element.name = elementName || `attributes[cnc-store-${this.name}]`;
    this.element.value = '';
  }
  getElement() {
    return this.element;
  }
  clear() {
    this.element.value = '';
  }
  setValue(value) {
    this.element.value = value;
  }
}

class Message extends Renderable {
  constructor(value, isError) {
    super();
    this.createElement();
    this.setValue(value);
    this.setIsError(isError);
  }
  createElement() {
    this.element = document.createElement('div');
    this.element.id = 'cnc-message';
    this.paragraph = document.createElement('p');
    this.element.appendChild(this.paragraph);
  }
  getValue() {
    return this.value;
  }
  setValue(value) {
    this.value = value;
    this.paragraph.innerHTML = value;
  }
  clear() {
    this.setValue('');
  }
  setIsError(bool) {
    this.isError = bool;
    if (this.isError) {
      this.element.classList.add('cnc-negative-text');
    } else {
      this.element.classList.remove('cnc-negative-text');
    }
  }
}

class Results extends Renderable {
  constructor(cnc, apiPrefix, subdomain) {
    super();
    this.cnc = cnc;
    this.apiPrefix = apiPrefix;
    this.subdomain = subdomain;
    this.outlets = {};
    this.loaded = false;
    this.lastUpdate = 0;
  }
  update() { }
  fetch() { }
  createElement() {
    this.element = document.createElement('div');
    this.element.id = 'cnc-results';
    this.element.style.display = 'none';
  }
  createList() {
    this.list = document.createElement('ul');
    this.list.id = 'cnc-outlets';
    this.list.classList.add('cart-attribute__field');
    this.element.appendChild(this.list);
  }
  setLocation(latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
  }
  getAllOutlets() {
    return this.outlets;
  }
  count() {
    return Object.keys(this.outlets).length;
  }
  unload() {
    this.outlets = [];
    while (this.list.firstChild) {
      this.list.removeChild(this.list.firstChild);
    }
  }
  renderOutlet(outlet) {
    var listItem = document.createElement('li');
    listItem.appendChild(outlet.getElement());
    listItem.appendChild(outlet.getLabel());
    this.list.appendChild(listItem);
  }
  isLoaded() {
    return this.loaded;
  }
  doOutletsExist() {
    return Object.keys(this.outlets).length > 0;
  }
  areOutletsAvailable() {
    for (let [key, outlet] of Object.entries(this.outlets)) {
      if (outlet.getAvailability()) {
        return true;
      }
    }
  }
}

class CartResults extends Results {
  constructor(cnc, apiPrefix, subdomain) {
    super(cnc, apiPrefix, subdomain);
    this.createElement();
    this.createInfo();
    this.createList();
    this.variantIds = [];
    this.cartItems = {};
  }
  createInfo() {
    this.info = document.createElement('p');
    this.info.id = 'cnc-info';
    this.info.classList.add('cnc-info');
    this.element.appendChild(this.info);
  }
  setInfo(value) {
    this.info.innerHTML = value;
  }
  selectNone() {
    for (let [key, outlet] of Object.entries(this.outlets)) {
      outlet.deselect();
      this.cnc.updateContactFields();
    }
  }
  selectFirst() {
    for (let [key, outlet] of Object.entries(this.outlets)) {
      if (outlet.getAvailability()) {
        outlet.select();
        this.cnc.updateContactFields();
        return;
      }
    }
  }
  getSelectedOutlet() {
    for (let [key, outlet] of Object.entries(this.outlets)) {
      if (outlet.isSelected()) {
        return outlet;
      }
    }
  }
  update() {
    if (Date.now() - this.lastUpdate < 1000) {
      return;
    }
    this.lastUpdate = Date.now();
    var parent = this;
    Shopify.getCart(function(cart) {
      var variantIds = [];
      cart.items.forEach(function(item) {
        variantIds.push(item.variant_id);
      });
      parent.cartItems = cart.items;
      parent.variantIds = variantIds;
      parent.fetch();
    });
  }
  fetch() {
    this.unload();
    var parent = this;
    var url = `https://${this.apiPrefix}/api/shopify_stores/${this.subdomain}/outlets?variant_ids=${this.variantIds.join()}`;
    for (let cartItem of this.cartItems) {
      url += `&qty-${cartItem.variant_id}=${cartItem.quantity}`;
    }
    if (this.latitude && this.longitude) {
      url += `&latitude=${this.latitude}&longitude=${this.longitude}`;
    }
    fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {
        for (let outletJson of json.outlets) {
		  var outlet = new Outlet(parent.cnc, outletJson, parent.cartItems);
          parent.outlets[outlet.getName()] = outlet;
          parent.renderOutlet(outlet);
        }
        if (json.outlets.length) {
          parent.setInfo('Please choose a pickup location:');
        } else {
          parent.setInfo('');
        }
        parent.loaded = true;
        parent.cnc.updateCollectionAbility();
        parent.cnc.updateCheckoutButton();
        if (parent.cnc.settings.enableMap) {
          parent.cnc.updateMap();
        }
        if (parent.cnc.getMode() === 'store') {
          parent.selectFirst();
        }
      });
  }
}

class ProductResults extends Results {
  constructor(cnc, apiPrefix, subdomain, initialVariantId) {
    super(cnc, apiPrefix, subdomain);
    this.createElement();
    this.createList();
    this.initialVariantId = initialVariantId;
  }
  createElement() {
    this.element = document.createElement('div');
    this.element.id = 'cnc-results';
  }
  update() {
    this.fetch();
  }
  fetch() {
    this.unload();
    var parent = this;
    var variantId = this.findGetParameter('variant');
    if (!variantId) {
      variantId = this.initialVariantId;
    }
    var url = `https://${this.apiPrefix}/api/shopify_stores/${this.subdomain}/outlets?variant_ids=${variantId}&qty-${variantId}=1`;
    if (this.latitude && this.longitude) {
      url += `&latitude=${this.latitude}&longitude=${this.longitude}`;
    }
    fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {
        for (let outletJson of json.outlets) {
		  var outlet = new ProductOutlet(parent.cnc, outletJson);
          parent.outlets[outlet.getName()] = outlet;
          parent.renderOutlet(outlet);
        }
        parent.loaded = true;
      	if (parent.cnc.settings.enableMap) {
          parent.cnc.updateMap();
        }
        parent.cnc.resultsLoaded();
      });
  }
  getSelectedVariantIdFromHtml() {
    var select = document.getElementById('ProductSelect-product-template');
    if (select) {
      return select.options[select.selectedIndex].value;
    }
  }
  findGetParameter(parameterName) {
    var result = null,
    tmp = [];
    location.search
      .substr(1)
      .split("&")
      .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
      });
    return result;
  }
}
