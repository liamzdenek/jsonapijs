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
    if(typeof name == "object" && typeof name.query == "function") {
        return name;
    }
    if(!this.resources[name]) {
        throw "Resource ["+name+"] does not exist -- 1";
    }
    return this.resources[name]
}

Config.prototype.push_relationship = function(resource_name, name, relationship) {
    if(!this.relationships[resource_name]) {
        if(!this.resources[resource_name]) {
            throw "Resource ["+resource_name+"] does not exist -- 2";
        }
        this.relationships[resource_name] = {};
    }
    if(typeof relationship.will_mount == "function") {
        relationship.will_mount(this, resource_name, name);
    }
    this.relationships[resource_name][name] = relationship;
}

Config.prototype.get_relationships_by_resource = function(resource_name) {
    if(typeof resource_name == "object" && typeof resource_name.query == "function") {
        if(typeof resource_name.get_relationships == "function") {
            return resource_name.get_relationships();
        }
        return {};
    }
    if(!this.resources[resource_name]) {
        throw "Resource ["+resource_name+"] does not exist -- 3";
    } 

    let rels = {};
    if(this.relationships[resource_name]) {
        Object.assign(rels, this.relationships[resource_name]);
    }
    if(typeof resource_name.get_relationships == "function") {
        let newrels = resource_name.get_relationships();
        if(typeof newrels == "object") {
            Object.assign(rels, newrels);
        }
    }
    return rels;
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
    if(this.relationships[resource_name] && this.relationships[resource_name][name]) {
        return this.relationships[resource_name][name]
    }
    if(typeof resource_name == "object" && typeof resource_name.query == "function") {
        if(typeof resource_name.get_relationships == "function") {
            let rels = resource_name.get_relationships();
            if(rels[name]) {
                return rels[name];
            }
        }
    }

    return null;
}

Config.prototype.get_controller = function() {
    var controller = require("./controller.js")(this);
    return controller;
}

Config.prototype.new_arena = function(req, rep) {
    var arena = require("./arena.js")(this, req, rep);
    return arena;
}

module.exports = function() {
    return new Config();
}
