let RelatedRecord = require("./../relatedrecord.js");
let Request = require("./../request.js");

function Polymorphic(type_attribute, id_attribute) {
    this.type_attribute = type_attribute;
    this.id_attribute = id_attribute;
}

Polymorphic.prototype.denote = function(arena, req, rel_name) {
    console.log("POLYMORPHIC DENOTE: ", req);
    for(let i in req.response) {
        let record = req.response[i];

        console.log("SET REL: ", rel_name);
        record.set_relationship(rel_name, RelatedRecord()
            .id(record.attributes[this.id_attribute])
            .type(record.attributes[this.type_attribute])
        .build())
        console.log("DENOTED: ", record);

        // TODO: come up with less risky way to remove these without will_mount
        arena.push_after(function(record) {
            delete record.attributes[this.type_attribute];
            delete record.attributes[this.id_attribute];
        }.bind(this, record))
    }
}

Polymorphic.prototype.include = function(arena, req, rel_name) {
    let promises = [];
    for(let i in req.response) {
        let record = req.response[i];
        let should_include = req.dependencies.include.includes(rel_name);
        let _newreq = Request()
            .kind("get_by_ids")
            .resource(record.attributes[this.type_attribute])
            .data([record.attributes[this.id_attribute]])
            .is_singular(true)
            .include(should_include)
        
        
        if(should_include) {
            _newreq.origin(this, req, rel_name);
        }
            
        let newreq = _newreq.build();

        promises.push(arena.push_request(newreq));
    }
    return promise.All(promises);
}

Polymorphic.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {

}

function PolymorphicBuilder() {
    this._type_attribute = null;
    this._id_attribute = null;
}

PolymorphicBuilder.prototype.type_attribute = function(type) {
    this._type_attribute = type;
    return this;
}

PolymorphicBuilder.prototype.id_attribute = function(id) {
    this._id_attribute = id;
    return this;
}

PolymorphicBuilder.prototype.build = function() {
    if(!this._type_attribute || !this._id_attribute) {
        throw "Type and Id are not optional for Polymorphic()";
    }
    return new Polymorphic(this._type_attribute, this._id_attribute);
}

module.exports = function() {
    return new PolymorphicBuilder();
}
