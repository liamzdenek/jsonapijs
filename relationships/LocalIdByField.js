function LocalIdByField(field_name) {
    this.field_name = field_name;
}

LocalIdByField.prototype.handle = function(req) {
    let ids = [];
    for(let i in req.response) {
        let datum = req.response[i];
        let value = datum.attributes[req.response];
        ids.push(value);
    }
    return ids;
}

module.exports = function(field_name) {
    return new LocalIdByField(field_name);
}
