function Exception(builder) {
    ["id", "links", "status", "code", "title", "detail", "source", "meta"].forEach(function(k){
        if("_"+k in builder) {
            this[k] = builder["_"+k]
        }
    }.bind(this))

    console.log("ERROR OBJ: ",this);
}

function ExceptionBuilder() {
}

ExceptionBuilder.prototype.id = function(id) {
    this._id = id;
    return this;
}

ExceptionBuilder.prototype.links = function(links) {
    this._links = links;
    return this;
}

ExceptionBuilder.prototype.status = function(status) {
    this._status = status;
    return this;
}

ExceptionBuilder.prototype.code = function(code) {
    this._code = code;
    return this;
}

ExceptionBuilder.prototype.title = function(title) {
    this._title = title;
    return this;
}

ExceptionBuilder.prototype.detail = function(detail) {
    this._detail = detail;
    return this;
}

ExceptionBuilder.prototype.source = function(source) {
    this._source = source;
    return this;
}

ExceptionBuilder.prototype.meta = function(meta) {
    this._meta = meta;
    return this;
}

ExceptionBuilder.prototype.build = function() {
    return new Exception(this);
}

module.exports = function() {
    return new ExceptionBuilder();
}
