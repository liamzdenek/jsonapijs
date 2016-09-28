var Request = require('../request.js');

function LocalIdByField(field_name, resource_name) {
    this.field_name = field_name;
    this.resource_name = resource_name;
}

LocalIdByField.prototype.handle = function(arena, originreq, rel_name) {
    
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

    console.log(ids);
    return ids;
}

LocalIdByField.prototype.will_mount = function(config, resource_name, relationship_name) {
    // make sure the field on the origin resource is hidden
    config.exclude_field(resource_name, this.field_name);
}

LocalIdByField.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {
    console.log("LocalIdByField Back propegate ", destreq);
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

module.exports = function(field_name, resource_name) {
    return new LocalIdByField(field_name, resource_name);
}
