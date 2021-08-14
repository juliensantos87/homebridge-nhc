'use strict';

var Service = require("hap-nodejs").Service;
var Characteristic = require("hap-nodejs").Characteristic;

function NikoHomeControlLight(platform, action = null) {
  this.platform = platform;

  var uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
  var foundAccessory = null;

  this.platform.accessories.forEach((access) => {
    if (access.UUID == uuid) {
      foundAccessory = access;
    }
  });

  if (foundAccessory == null) {
    this.accessory = this.createAccessory(action)//.bind(this);
  } else {
    this.accessory = foundAccessory;
    this.updateAccessory(this.accessory, action);
  }

  this.accessory._id = action.id;
  this.accessory.value = this.convertValue(action.value1);
}

NikoHomeControlLight.prototype.createAccessory = function(action) {
  var uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
  var PlateformAccessory = this.platform.api.platformAccessory;

  var accessory = new PlateformAccessory(action.name + action.id, uuid);

  this.updateAccessory(accessory, action);

  this.platform.accessories.push(accessory);
  this.platform.api.registerPlatformAccessories("homebridge-nikohomecontrole", "NikoHomeControle", [accessory]);

  return accessory;
}

NikoHomeControlLight.prototype.updateAccessory = function(accessory, action) {
  accessory.on('identify', this.identify.bind(this));

  var service = accessory.getService(accessory.displayName);

  if (service == undefined) {
    accessory.addService(Service.Lightbulb, accessory.displayName)
  }

  accessory.getService(accessory.displayName)
    .getCharacteristic(Characteristic.On)
    .on('get', this.getValue.bind(this))
    .on('set', this.setValue.bind(this))
    .on('change', this.changeValue.bind(this))
  ;
}

NikoHomeControlLight.prototype.convertValue = function(value1) {
  if (value1 == 100) {
    return true;
  } else {
    return false;
  }
}

NikoHomeControlLight.prototype.identify = function(callback) {
  this.platform.log(this.accessory.displayName, "Identify!!!");

  var that = this;
  var initialValue = this.accessory.value;

  if (initialValue === true) {
    this.platform.niko.executeActions(this.accessory._id, 0);
  } else {
      this.platform.niko.executeActions(this.accessory._id, 100);
  }

  setTimeout(function() {
    that.platform.niko.executeActions(that.accessory._id, initialValue);
  },
  2000);

  callback();
}

NikoHomeControlLight.prototype.getValue = function(callback) {
  this.platform.log("Get " + this.accessory.displayName + " Light -> " + this.accessory.value);

  callback(null, this.accessory.value);
}

NikoHomeControlLight.prototype.setValue = function(value, callback) {
  this.accessory.value = value;

  if (value) {
    value = 100;
  } else {
    value = 0;
  }

  this.platform.niko.executeActions(this.accessory._id, value);
  this.platform.log("Set " + this.accessory.displayName + " Light -> " + this.accessory.value);

  callback();
}

NikoHomeControlLight.prototype.changeValue = function(oldValue, newValue) {
  if (newValue === undefined) {
    return;
  }

  var value = this.convertValue(newValue);

  if (this.accessory.value !== value) {
    this.accessory.value = value;
    this.platform.log("Change " + this.accessory.displayName + " Light -> " + this.accessory.value);
    this.accessory.getService(this.accessory.displayName).getCharacteristic(Characteristic.On).updateValue(this.accessory.value);
  }
}

module.exports = NikoHomeControlLight
