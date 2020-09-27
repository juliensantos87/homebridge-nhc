'use strict';

var Service = require("hap-nodejs").Service;
var Characteristic = require("hap-nodejs").Characteristic;

function NikoHomeControlBlind(platform, action = null) {
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

    this.accessory.position = action.value1;
    this.accessory.target = action.value1;
    this.accessory.state = this.convertState(this.accessory.position);

    this.accessory.time = 30;

    this.platform.config.time.forEach((ActionTime) => {
        if (ActionTime.id == action.id) {
            this.accessory.time = ActionTime.time;
        }
    });

    this.running = false;
    this.timeout = null;
}

NikoHomeControlBlind.prototype.createAccessory = function(action) {
    var uuid = this.platform.api.hap.uuid.generate(action.name + action.id);
    var PlateformAccessory = this.platform.api.platformAccessory;

    var accessory = new PlateformAccessory(action.name + action.id, uuid);

    this.updateAccessory(accessory, action);

    this.platform.accessories.push(accessory);
    this.platform.api.registerPlatformAccessories("homebridge-nikohomecontrole", "NikoHomeControle", [accessory]);

    return accessory;
}
NikoHomeControlBlind.prototype.updateAccessory = function(accessory, action) {
    accessory.on('identify', this.identify.bind(this));

    var service = accessory.getService(accessory.displayName);

    if (service == undefined) {
        accessory.addService(Service.WindowCovering, accessory.displayName)
    }

    accessory.getService(accessory.displayName)
        .getCharacteristic(Characteristic.PositionState)
        .on('get', this.getState.bind(this))
        .updateValue(this.state);

    accessory.getService(accessory.displayName)
        .getCharacteristic(Characteristic.CurrentPosition)
        .on('get', this.getPosition.bind(this))
        .updateValue(this.position);

    accessory.getService(accessory.displayName)
        .getCharacteristic(Characteristic.TargetPosition)
        .on('get', this.getTarget.bind(this))
        .on('set', this.setTarget.bind(this))
        .on('change', this.changeTarget.bind(this))
        .updateValue(this.target);
}

NikoHomeControlBlind.prototype.convertState = function(value) {
    this.platform.log("Converte STATE " + this.accessory.displayName + " Blind -> " + value);
    if (value != 0) {
      return Characteristic.PositionState.OPENED;
    } else {
      return Characteristic.PositionState.CLOSED;
    }
}

NikoHomeControlBlind.prototype.identify = function(callback) {
    this.platform.log(this.accessory.displayName, "Identify!!!");
    callback();
}

NikoHomeControlBlind.prototype.getState = function(callback) {
    this.platform.log("Get STATE " + this.accessory.displayName + " Blind -> " + this.accessory.state);
    callback(null, this.accessory.state);
}

NikoHomeControlBlind.prototype.getPosition = function(callback) {
    this.platform.log("Get Position " + this.accessory.displayName + " Blind -> " + this.accessory.position);
    callback(null, this.accessory.position);
}

NikoHomeControlBlind.prototype.getTarget = function(callback) {
    this.platform.log("Get Target " + this.accessory.displayName + " Blind -> " + this.accessory.target);
    callback(null, this.accessory.target);
}

NikoHomeControlBlind.prototype.setTarget = function(value, callback) {
    this.accessory.target = value;

    if (this.accessory.target < this.accessory.position) {
        value = 254;
    } else {
        value = 255;
    }

    this.running = true;
    this.platform.niko.executeActions(this.accessory._id, value);
    this.platform.log("Set Target " + this.accessory.displayName + " Blind -> " + this.accessory.target);

    callback();
}

NikoHomeControlBlind.prototype.move = function() {
    var that = this;
    let direction = null;

    if (this.accessory.target > this.accessory.position) {
        direction = 1;
    } else {
        direction = -1;
    }
    if (Math.abs(this.accessory.target - this.accessory.position) > 0) {
        that.accessory.position += direction;
        this.timeout = setTimeout(function(){
            that.move();
        }, this.accessory.time * 10);
    } else {
        this.platform.niko.executeActions(this.accessory._id, 253);
        this.accessory
            .getService(this.accessory.displayName)
            .getCharacteristic(Characteristic.CurrentPosition)
            .updateValue(this.accessory.position);
        this.accessory
            .getService(this.accessory.displayName)
            .getCharacteristic(Characteristic.PositionState)
            .updateValue(Characteristic.PositionState.STOPPED);
    }
}

NikoHomeControlBlind.prototype.changeTarget = function(oldValue, newValue) {
    if (newValue === undefined) {
        return;
    }

    if (null === oldValue && false === this.running) {
        this.accessory.position = newValue;

        return;
    }

    clearTimeout(this.timeout);
    this.timeout = null;
    this.running = false;
    this.move();
}

NikoHomeControlBlind.prototype.changeValue = function(oldValue, newValue) {
  this.changeTarget(oldValue, newValue);
}

module.exports = NikoHomeControlBlind
