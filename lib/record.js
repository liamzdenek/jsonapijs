function Record(type, id, attributes, links, relationships) {
    this.type = type;
    this.id = id;
    
    let isEmpty = function(obj) {
        return Object.keys(obj).length === 0 && obj.constructor === Object
    }

    if(!isEmpty(attributes)) {
        this.attributes = attributes;
    }
    if(!isEmpty(links)) {
        this.links = links;
    }
    if(!isEmpty(relationships)) {
        this.relationships = relationships;
    }
}

Record.prototype.set_relationship_links = function(relationship_name, links) { 
    if(!this.relationships) {
        this.relationships = {};
    }

    if(!this.relationships[relationship_name]) {
        this.relationships[relationship_name] = {};
    }
    this.relationships[relationship_name].links = links;
}

Record.prototype.set_relationship = function(relationship_name, records) {
    if(!this.relationships) {
        this.relationships = {};
    }

    if(!this.relationships[relationship_name]) {
        this.relationships[relationship_name] = {};
    }
    this.relationships[relationship_name].data = records;
}
Record.prototype.push_relationship = function(relationship_name, record) {
    if(!this.relationships) {
        this.relationships = {};
    }

    if(!this.relationships[relationship_name]) {
        this.relationships[relationship_name] = {
            data: [],
            //"links": {
                //"self": "/"+this.type+"/"+this.id+"/relationships/"+relationship_name,
            //}
        };
    }
    this.relationships[relationship_name].data.push(record);
}

function RecordBuilder() {
    this._type = null;
    this._id = null;
    this._attributes = {};
    this._links = {};
    this._relationships = {};
}

RecordBuilder.prototype.type = function(type) {
    this._type = type;
    return this;
}

RecordBuilder.prototype.id = function(id) {
    this._id = id;
    return this;
}

RecordBuilder.prototype.attributes = function(attributes) {
    this._attributes = attributes;
    return this;
}

RecordBuilder.prototype.links = function(links) {
    this._links = links;
    return this;
}

RecordBuilder.prototype.relationships = function(relationships) {
    this._relationships = relationships;
    return this;
}

RecordBuilder.prototype.build = function() {
    if(!this._type) {
        throw "Record requires Type to be provided";
    }
    if(!this._id) {
        throw "Record requires Id to be provided";
    }

    return new Record(this._type, this._id, this._attributes, this._links, this._relationships);
}

module.exports = function() {
    return new RecordBuilder();
}
