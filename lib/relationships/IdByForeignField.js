var Request = require('../request.js');

function IdByForeignField(field_name, resource_name, required) {
    this.field_name = field_name;
    this.resource_name = resource_name;
    this.required = required;
}

IdByForeignField.prototype.denote = function(arena, req, rel_name) {
    console.log("DENOTING IdByForeignField ", rel_name, req.response);
    for(let i in req.response) {
        let record = req.response[i];
        console.log("Record", record);
        record.set_relationship_links(rel_name, {
            "related": "/"+record.type+"/"+record.id+"/relationships/"+rel_name
        });
    }
}

IdByForeignField.prototype.include = function(arena, originreq, rel_name) {
    
    let ids = [];
    for(let i in originreq.response) {
        let datum = originreq.response[i];
        let value = datum.id;
        if(value != null) {
            originreq.response[i].set_relationship(rel_name, []);
            ids.push(value);
        }
    }
    
    let should_include = originreq.dependencies.include.includes(rel_name);

    let _newreq = Request()
        .resource(this.resource_name)
        .kind("get_by_field_name")
        .data({field_name: this.field_name, ids: ids})
        .include(should_include)
        .dependencies(originreq.dependencies.get_child(rel_name))
        .is_singular(true)
    
    if(should_include) { 
        _newreq.origin(this, originreq, rel_name);
    }
    let newreq = _newreq.build();

    arena.push_request(newreq);

    console.log(ids);
    return ids;
}

IdByForeignField.prototype.post_create = function(request, rel_name) {
    return new Promise(function(resolve, reject) {
        if(!request.data || !request.data.relationships || !(rel_name in request.data.relationships)) {
            return this.required ?
                reject("403 Forbidden -- the "+rel_name+"relationship is not optional") :
                resolve();
        }
        
        if(!("data" in request.data.relationships[rel_name])) {
            return reject("400 Bad Request -- relationship must include data section")
        }

        reject("500 Internal Server Error -- not implemented");
    })
}

IdByForeignField.prototype.will_mount = function(config, resource_name, relationship_name) {
    // make sure the field on the destination resource is hidden
    config.exclude_field(this.resource_name, this.field_name);
}

IdByForeignField.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {
    console.log("IdByForeignField Back propegate ", destreq);
    let origin = originreq.response;
    let dest = destreq.response;
    if(!Array.isArray(origin)) {
        origin = [origin];
    }
    if(!Array.isArray(dest)) {
        dest = [dest];
    }
    for(let i in origin) {
        let iresult = origin[i];
        for(let j in dest) {
            let jresult = dest[j];
            if(jresult.attributes[this.field_name] == iresult.id) {
                iresult.push_relationship(rel_name, {
                    id: jresult.id,
                    type: jresult.type
                });
                //console.log("IRES: ", iresult);
                //console.log("JRES: ", jresult);
            }
        }
    }
}

function IdByForeignFieldBuilder() {
    this._field_name = null;
    this._resource_name = null;
    this._required = false;
}

IdByForeignFieldBuilder.prototype.field_name = function(field_name) {
    this._field_name = field_name;
    return this;
}

IdByForeignFieldBuilder.prototype.resource_name = function(resource_name) {
    this._resource_name = resource_name;
    return this;
}

IdByForeignFieldBuilder.prototype.required = function(bool) {
    this._required = bool;
    return this;
}

IdByForeignFieldBuilder.prototype.build = function() {
    if(!this._field_name) {
        throw "IdByForeignFieldBuilder requires a .field_name()";
    }
    if(!this._resource_name) {
        throw "IdByForeignFieldBuilder requires a .resource_name()";
    }
    return new IdByForeignField(this._field_name, this._resource_name, this._required);
}

module.exports = function() {
    return new IdByForeignFieldBuilder();
}
