var Request = require('../request.js');

function IdByLocalField(field_name, resource_name, required) {
    this.field_name = field_name;
    this.resource_name = resource_name;
    this.required = required;
}

IdByLocalField.prototype.denote = function(arena, req, rel_name) {
    for(let i in req.response) {
        let record = req.response[i];
        record.set_relationship_links(rel_name, {
            "related": "/"+record.type+"/"+record.id+"/relationships/"+rel_name
        });
        record.set_relationship(rel_name, {
            id: record.attributes[this.field_name],
            type: this.resource_name
        }); 
    }
}

IdByLocalField.prototype.include = function(arena, originreq, rel_name) {
    console.log("Relationship INCLUDE");    
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

IdByLocalField.prototype.pre_create = function(request, rel_name) {
    return new Promise(function(resolve, reject) {
        if(!request.data || !request.data.relationships || !(rel_name in request.data.relationships)) {
            return this.required ?
                reject("403 Forbidden -- the "+rel_name+"relationship is not optional") :
                resolve();
        }
        
        if(!("data" in request.data.relationships[rel_name])) {
            return reject("400 Bad Request -- relationship must include data section")
        }

        if(Array.isArray(request.data.relationships[rel_name].data)) {
            return reject("400 Bad Request - IdByLocalField cannot have a one to many relationship")
        }

        if(request.data.relationships[rel_name].data.type != this.resource_name) {
            return reject("400 Bad Request - IdByLocalField does not support anything other than a single link to "+this.resource_name);
        }

        request.data.attributes = request.data.attributes || {};

        request.data.attributes[this.field_name] = request.data.relationships[rel_name].data.id

        resolve();
    }.bind(this))
}

IdByLocalField.prototype.will_mount = function(config, resource_name, relationship_name) {
    // make sure the field on the origin resource is hidden
    config.exclude_field(resource_name, this.field_name);
}

IdByLocalField.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {
    /*
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
    */
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
