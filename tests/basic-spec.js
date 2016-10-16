var frisby = require('frisby');

var environment = require('./environment/basic.js');
var suite = require('./suite.js')

suite(environment);
