'use strict';

const {Accessory: Accessory} = require('module');
const niko = require('niko-home-control');

var NikoHomeControlLight = require('./NikoHomeControlLight');
var NikoHomeControlDimmer = require('./NikoHomeControlDimmer');
var NikoHomeControlBlind = require('./NikoHomeControlBlind');

module.exports = NikoHomeControlePlatform

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function NikoHomeControlePlatform(log, config, api) {
  log("NikoHomeControle Init");

  this.accessories = [];
  this.controllers = [];
  this.niko = niko;

  this.log = log;
  this.config = config;

  if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on('didFinishLaunching', function() {
        this.log("DidFinishLaunching");
        this.run();
      }.bind(this));
  }
}

// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
NikoHomeControlePlatform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking
  // accessory.updateReachability()
  accessory.reachable = true;

  this.accessories.push(accessory);
}

NikoHomeControlePlatform.prototype.run = function() {
  this.log("Run");

  this.niko.init({
    ip: this.config.ip,
    port: 8000,
    timeout: 2000,
    events: true
  });

  niko.events.on('listactions', this.onEventAction.bind(this));

  niko
    .listActions()
    .then(this.listActions.bind(this));
}

NikoHomeControlePlatform.prototype.listActions = function(response) {
  var actions = response.data;

  actions.forEach((action) => {
    // exclude
    if (this.config.exclude.indexOf(action.id) != -1) {
      return;
    }

    switch(action.type) {
      case 1:
        this.addAccessory(NikoHomeControlLight, null, action);
        break;
      case 2:
        this.addAccessory(NikoHomeControlDimmer, null, action);
        break;
      case 4:
        this.addAccessory(NikoHomeControlBlind, null, action);
        break;
      default:
        this.log('UNKNOW ' + action.name + ' type ' + action.type);
    }
  });
}

NikoHomeControlePlatform.prototype.addAccessory = function(className, accessory = null, action = null) {
  this.log("Add " + action.name);
  var controller = new className(this, action);
  this.controllers[action.id] = controller;
}

NikoHomeControlePlatform.prototype.onEventAction = function(event) {
  event.data.forEach((action) => {
    if (this.controllers.hasOwnProperty(action.id)) {
      this.controllers[action.id].changeValue(null, action.value1);
    }
  });
}
