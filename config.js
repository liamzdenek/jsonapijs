function Config() {
    this.resources = {};
    this.relationships = {};
}

Config.prototype.push_resource = function(name, resource) {
    this.resources[name] = resource;
}

Config.prototype.get_resource = function(name) {
    if(!this.resources[name]) {
        throw "Resource ["+name+"] does not exist";
    }
    return this.resources[name]
}

Config.prototype.push_relationship = function(resource_name, name, relationship) {
    if(!this.relationships[resource_name]) {
        if(!this.resources[resource_name]) {
            throw "Resource "+resource_name+" does not exist";
        }
        this.relationships[resource_name] = {};
    }
    this.relationships[resource_name][name] = relationship;
}

Config.prototype.get_relationships_by_resource = function(resource_name) {
    if(!this.relationships[resource_name]) {
        throw "Resource "+resource_name+" does not exist";
    }
    return this.relationships[resource_name];
}

Config.prototype.get_relationship_by_resource = function(resource_name, name) {
    if(!this.relationships[resource_name]) {
        return null;
    }
    return this.relationships[resource_name][name]
}

Config.prototype.get_controller = function() {
    var controller = require("./controller.js")(this);
    return controller;
}

Config.prototype.new_arena = function() {
    var arena = require("./arena.js")(this);
    return arena;
}

module.exports = function() {
    return new Config();
}
