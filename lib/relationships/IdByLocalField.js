var Request = require('../request.js');

function IdByLocalField(field_name, resource_name, required) {
    this.field_name = field_name;
    this.resource_name = resource_name;
    this.required = required;
}

IdByLocalField.prototype.handle = function(arena, originreq, rel_name) {
    console.log("Relationship HANDLE");    
    let ids = [];
    for(let i in originreq.response) {
        let datum = originreq.response[i];
        let value = datum.attributes[this.field_name];
        if(value != null) {
            ids.push(value);
        }
    }
    
    let should_include = originreq.dependencies.include.includes(rel_name);

    let _newreq = Request()
        .resource(this.resource_name)
        .kind("get_by_ids")
        .data(ids)
        .output(false) // TODO: this might be true in some situations, most of which collude with .include() being true, this should take precedence
        .include(should_include)
        .dependencies(originreq.dependencies.get_child(rel_name))
        .is_singular(true)
    
    if(should_include) { 
        _newreq.origin(this, originreq, rel_name);
    }
    let newreq = _newreq.build();

    arena.push_request(newreq);
}

IdByLocalField.prototype.will_mount = function(config, resource_name, relationship_name) {
    // make sure the field on the origin resource is hidden
    config.exclude_field(resource_name, this.field_name);
}

IdByLocalField.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {
    console.log("IdByLocalField Back propegate ", destreq);
    for(let i in originreq.response) {
        let iresult = originreq.response[i];
        for(let j in destreq.response) {
            let jresult = destreq.response[j];
            //console.log("IRES: ", iresult);
            //console.log("JRES: ", jresult);
            if(iresult.attributes[this.field_name] == jresult.id) {
                iresult.set_relationship(rel_name, {
                    id: jresult.id,
                    type: jresult.type
       });
            }
        }
    }
}

function IdByLocalFieldBuilder() {
    this._field_name = null;
    this._resource_name = null;
    this._required = false;
}


IdByLocalFieldBuilder.prototype.field_name = function(field_name) {
    this._field_name = field_name;
    return this;
}

IdByLocalFieldBuilder.prototype.resource_name = function(resource_name) {
    this._resource_name = resource_name;
    return this;
}

IdByLocalFieldBuilder.prototype.required = function(bool) {
    this._required = bool;
    return this;
}

IdByLocalFieldBuilder.prototype.build = function() {
    if(!this._field_name) {
        throw "IdByLocalFieldBuilder requires a .field_name()";
    }
    if(!this._resource_name) {
        throw "IdByLocalFieldBuilder requires a .resource_name()";
    }
    return new IdByLocalField(this._field_name, this._resource_name, this._required);
}

module.exports = function() {
    return new IdByLocalFieldBuilder();
}
