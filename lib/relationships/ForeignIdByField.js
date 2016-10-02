var Request = require('../request.js');

function ForeignIdByField(field_name, resource_name) {
    this.field_name = field_name;
    this.resource_name = resource_name;
}

ForeignIdByField.prototype.handle = function(arena, originreq, rel_name) {
    
    let ids = [];
    for(let i in originreq.response) {
        let datum = originreq.response[i];
        let value = datum.id;
        if(value != null) {
            ids.push(value);
        }
    }
    
    let should_include = originreq.dependencies.include.includes(rel_name);

    let _newreq = Request()
        .resource(this.resource_name)
        .kind("get_by_field_name")
        .data({field_name: this.field_name, ids: ids})
        .output(false) // TODO: this might be true in some situations, most of which collude with .include() being true, this should take precedence
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

ForeignIdByField.prototype.will_mount = function(config, resource_name, relationship_name) {
    // make sure the field on the destination resource is hidden
    config.exclude_field(this.resource_name, this.field_name);
}

ForeignIdByField.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {
    console.log("ForeignIdByField Back propegate ", destreq);
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
                console.log("IRES: ", iresult);
                console.log("JRES: ", jresult);
            }
        }
    }
}

module.exports = function(field_name, resource_name) {
    return new ForeignIdByField(field_name, resource_name);
}
