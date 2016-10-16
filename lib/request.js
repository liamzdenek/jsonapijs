var Exception = require("./exception.js");

function Request(builder) {
    this.resource = builder._resource;
    this.kind = builder._kind;
    this.data = builder._data;
    this.should_output = builder._should_output; 
    this.should_include = builder._should_include;
    this.never_output = false;
    this.is_singular = builder._is_singular;
    this.dependencies = builder._dependencies;
    this.pagination_params = builder._pagination_params;
    this.origin = builder._origin;
    this.response = null;
    this.arena = null;
    this.promise = null;
}

Request.prototype.clone = function() {
    let cloned = new Request({
        _resource: this.resource,
        _kind: this.kind,
        _data: this.data,
        _should_output: this.should_output,
        _should_include: this.should_include,
        _is_singular: this.is_singular,
        _dependencies: this.dependencies,
    });
    cloned.never_output = true;
    cloned.real_resource = this.resource;
    return cloned;
}

Request.prototype.repair_type = function(records) {
    for(let i in records) {
        let record = records[i];
        record.type = this.real_resource || this.resource;
    }
    return records;
}

Request.prototype.get_relationship = function(rel_name) {
    return this.arena.config.get_relationship_by_resource(this.real_resource || this.resource, rel_name);
}

Request.prototype.get_relationships = function() {
    return this.arena.config.get_relationships_by_resource(this.real_resource || this.resource);
}

Request.prototype.filter_fields = function(config) {
    data = this.response;
    if(!Array.isArray(data)) {
        data = [data];
    }
    for(let i in data) {
        let datum = data[i];
        for(let j in datum.attributes) {
            if(config.is_field_excluded(this.resource, j)) {
                delete datum.attributes[j]
            }
        }
    }
}

function RequestBuilder() {
    this._resource = null;
    this._kind = null;
    this._data = null;
    this._should_output = false;
    this._should_include = false;
    this._dependencies = null;
    this._origin = null;
    this._pagination_params = null;
}

RequestBuilder.prototype.pagination_params = function(params) {
    this._pagination_params = params;
    return this;
}

RequestBuilder.prototype.parse_pagination_params = function(req) {
    this._pagination_params = req.query.page;
    return this;
}

RequestBuilder.prototype.resource = function(resource) {
    this._resource = resource;
    return this;
}

RequestBuilder.prototype.kind = function(kind) {
    this._kind = kind;
    return this;
}

RequestBuilder.prototype.data = function(data) {
    this._data = data;
    return this;
}

RequestBuilder.prototype.output = function(should_output) {
    this._should_output = should_output;
    return this;
}

RequestBuilder.prototype.include = function(should_include) {
    this._should_include = should_include;
    return this;
}

RequestBuilder.prototype.dependencies = function(dep) {
    this._dependencies = dep;
    return this;
}

RequestBuilder.prototype.origin = function(relationship, origin, relationship_name) {
    this._origin = {relationship:relationship, request:origin, relationship_name: relationship_name};
    return this;
}

RequestBuilder.prototype.is_singular = function(is_singular) {
    this._is_singular = is_singular;
    return this;
}

RequestBuilder.prototype.build = function() {
    if(!this._resource) {
        throw Exception()
            .title("RequestBuilder must have Resource defined")
            .include_stack()
            .print_stack()
        .build();
    }
    if(!this._kind) {
        throw Exception()
            .title("RequestBuilder must have Resource defined")
            .include_stack()
        .build()
    }
    return new Request(this); 
}

module.exports = function() {
    return new RequestBuilder();
}
