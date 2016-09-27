var Record = require("./../record.js");

function RamResource() {
    var data = {
        "test1": {"asdf": "123"},
        "test2": {"asdf": "223"},
        "test3": {"asdf": "323"},
        "test4": {"asdf": "423"}
    };

    this.push = function(id, attributes) {
        data[id] = attributes;
    }

    this.query = function(req) {
        console.log("RamResource got req: ", req);
        if(req.kind == "getIndex") {
            this.getIndex(req);
        } else if(req.kind == "getByIds") {
            this.getByIds(req);
        } else {
            throw "RamResource doesn't know how to handle query kind: "+req.kind;
        }
    }.bind(this)

    this.getIndex = function(req) {
        let result = [];
        for(k in data) {
            result.push(
                Record()
                    .type(req.resource)
                    .id(k)
                    .attributes(data[k])
                    .build()
            );
        }
        req.response = result;
    }.bind(this);

    this.getByIds = function(req) {
        let result = [];
        for(i in req.data) {
            let id = req.data[i];
            if(data[id]) {
                result.push(
                    Record()
                        .type(req.resource)
                        .id(id)
                        .attributes(data[id])
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
