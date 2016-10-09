var Polymorphic = require("./../relationships/Polymorphic.js");

function AuthenticationRelationship(polymorphic) {
    this.polymorphic = polymorphic;

    if(typeof polymorphic.denote == "function") {
        this.denote = function(arena, req, rel_name) {
            return this.polymorphic.denote(arena, req, rel_name);
        }.bind(this);
    }

    if(typeof polymorphic.include == "function") {
        this.include = function(arena, req, rel_name) {
            return this.polymorphic.include(arena, req, rel_name);
        }
    }
}

function AuthenticationRelationshipBuilder() {
    this._type_attribute = null;
    this._id_attribute = null;
}

AuthenticationRelationshipBuilder.prototype.type_attribute = function(type) {
    this._type_attribute = type;
    return this;
}

AuthenticationRelationshipBuilder.prototype.id_attribute = function(id) {
    this._id_attribute = id;
    return this;
}

AuthenticationRelationshipBuilder.prototype.build = function() {
    return new AuthenticationRelationship(
        Polymorphic()
            .type_attribute(this._type_attribute)
            .id_attribute(this._id_attribute)
        .build()
    ); 
}

module.exports = function() {
    return new AuthenticationRelationshipBuilder();
}
