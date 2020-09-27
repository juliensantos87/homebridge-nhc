'use strict'

const NikoHomeControlPlatform = require('./lib/NikoHomeControlPlatform')

module.exports = function (homebridge) {
  homebridge.registerPlatform('homebridge-nikohomecontrole', 'NikoHomeControle', NikoHomeControlPlatform, true)
}
