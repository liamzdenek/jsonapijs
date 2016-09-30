var frisby = require('frisby');

var environment = require('./environment/1.js');
var suite = require('./suite.js')

suite(environment);
