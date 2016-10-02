function Config() {
    this.resources = {};
    this.relationships = {};
    this.excluded_fields = {};
}

Config.prototype.push_resource = function(name, resource) {
    if(typeof resource.will_mount == "function") {
        resource.will_mount(this);
    }
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
    if(typeof relationship.will_mount == "function") {
        relationship.will_mount(this, resource_name, name);
    }
    this.relationships[resource_name][name] = relationship;
}

Config.prototype.get_relationships_by_resource = function(resource_name) {
    if(!this.relationships[resource_name]) {
        throw "Resource "+resource_name+" does not exist";
    }
    return this.relationships[resource_name];
}

Config.prototype.exclude_field = function(resource_name, field_name) {
    if(!this.excluded_fields[resource_name]) {
        this.excluded_fields[resource_name] = {};
    }
    if(!(field_name in this.excluded_fields[resource_name])) {
        this.excluded_fields[resource_name][field_name] = 1;
    } else {
        this.excluded_fields[resource_name][field_name]++;
    }
}

Config.prototype.is_field_excluded = function(resource_name, field_name) {
    return this.excluded_fields[resource_name] && this.excluded_fields[resource_name][field_name]
}

Config.prototype.get_relationship_by_resource = function(resource_name, name) {
    if(!resource_name) {
        throw "Resource must be defined";
    }
    if(!name) {
        throw "Name must be defined";
    }
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