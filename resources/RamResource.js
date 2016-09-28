var Record = require("./../record.js");

function RamResource() {
    var data = {};

    this.push = function(id, attributes) {
        data[id] = attributes;
    }

    this.query = function(req) {
        console.log("RamResource got req: ", req);
        if(req.kind == "get_index") {
            this.get_index(req);
        } else if(req.kind == "get_by_ids") {
            this.get_by_ids(req);
        } else if(req.kind == "get_by_field_name" && req.data.field_name == "id") {
            req.data = req.data.ids;
            this.get_by_ids(req);
        } else if(req.kind == "get_by_field_name") {
            this.get_by_field_name(req);
        } else {
            throw "RamResource doesn't know how to handle query kind: "+req.kind;
        }
    }.bind(this)

    this.get_index = function(req) {
        let result = [];
        for(k in data) {
            let datum = data[k];
            // the object may be manipulated and we dont want it to point to the true copy
            datum = JSON.parse(JSON.stringify(datum))
            result.push(
                Record()
                    .type(req.resource)
                    .id(k)
                    .attributes(datum)
                    .build()
            );
        }
        req.response = result;
    }.bind(this);

    this.get_by_ids = function(req) {
        let result = [];
        for(i in req.data) {
            let id = req.data[i];
            let datum = data[id];
            if(datum) {
                // the object may be manipulated and we dont want it to point to the true copy
                datum = JSON.parse(JSON.stringify(datum))
                result.push(
                    Record()
                        .type(req.resource)
                        .id(id)
                        .attributes(datum)
                        .build()
                );
            }
        }
        req.response = result;
    }.bind(this);

    this.get_by_field_name = function(req) {
        let result = [];
        for(i in data) {
            let datum = data[i];
            if(req.data.ids.includes(datum[req.data.field_name])) {
                // the object may be manipulated and we dont want it to point to the true copy
                datum = JSON.parse(JSON.stringify(datum))
                result.push(
                    Record()
                        .type(req.resource)
                        .id(i)
                        .attributes(datum)
                        .build()
                );
            }
        }
        req.response = result;
    }.bind(this);
}

module.exports = function() {
    return new RamResource();
}
