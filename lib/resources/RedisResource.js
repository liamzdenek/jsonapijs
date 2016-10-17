var Promise = require('bluebird');
var Exception = require('./../exception.js');
let Record = require('./../record.js');
var redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

function RedisResource(connection, prefix) {
    this.client = connection.client;
    this.prefix = prefix;
}

RedisResource.prototype.query = function(req) {
    if(req.kind == "get_index") {
        return this.get_index(req);
    } else if(req.kind == "get_by_ids") {
        return this.get_by_ids(req);
    } else if(req.kind == "get_by_field_name" && req.data.field_name == "id") {
        req.data = req.data.ids;
        return this.get_by_ids(req);
    } else if(req.kind == "get_by_field_name") {
        return this.get_by_field_name(req);
    } else if(req.kind == "create") {
        return this.create(req);
    } else if(req.kind == "update") {
        return this.update(req);
    } else if(req.kind == "delete") {
        return this.delete(req);
    }
    return Promise.reject("RedisResource query does not support req kind: "+req.kind);
}

RedisResource.prototype.get_index = function(req) {
    // while this query is strictly possible, I think it is best to avoid implementing this to prevent its use, particularly since redis recommends against it, and SCAN doesnt quite fit this use case.
    return Promise.reject(Exception()
        .title("RedisResource does not support get_index -- Redis recommends against KEYS queries in regular application code")
        .links({
            "about": "http://redis.io/commands/keys",
        })
        .build()
    );
    /*
    return this.client.keysAsync(this.prefix+"*").then(function(res) {
        console.log("REDIS RES: ", res);
        return Promise.reject("TODO "+res);
    });
    */
}

RedisResource.prototype.get_by_ids = function(req) {
    let keys = req.data.map(function(v) {
        return this.prefix+v;
    }.bind(this))
    return this.client.mgetAsync(keys).then(function(data) {
        let results = req.data.map(function(v,i) {
            if(!data[i]) {
                return undefined;
            }
            return Record()
                .type(req.resource)
                .id(v)
                .attributes(JSON.parse(data[i]))
            .build()
        });
        results = results.filter(function(k) { return !!k });
        return Promise.resolve(results);
    });
}

RedisResource.prototype.get_by_field_name = function(req) {
    return Promise.reject(Exception()
        .status(405)
        .title("RedisResource does not support get_by_field_name -- only get_index and get_by_ids")
    .build())
}

RedisResource.prototype.start_tx = function(req) {
    if(req.arena.redis_transaction) {
        return req.arena.redis_transaction;
    }

    req.arena.push_after(this.end_tx.bind(this, req));
    req.arena.redis_transaction = Promise.resolve(this.client.multi());
    return req.arena.redis_transaction;
}

RedisResource.prototype.end_tx = function(req, after) {
    return Promise.all([req.arena.redis_transaction, after]).then(function(data) {
        let tx = data[0];
        return tx.execAsync().then(function() {
            console.log("EXEC ASYNC");  
        });
    }.bind(this))
    .catch(function(rej) {
        console.log("DISCARD ASYNC");
        req.arena.redis_transaction.then(function(tx) {
            console.log("TX: ", tx);
            tx.discard();
        }.bind(this));
        return Promise.reject(rej);
    }.bind(this));
}

RedisResource.prototype.create = function(req) {
    if(!req.data.id) {
        return Promise.reject(Exception()
            .status(400)
            .title("RedisResource requires a client-generated ID")
        .build());
    }
    if(req.data.type != req.resource) {
        return Promise.reject(Exception()
            .status(400)
            .title("RedisResource requires type to be: "+req.resource+" -- you provided: "+req.data.type)
        .build());
    }
    if(!req.data.attributes) {
        return Promise.reject(Exception()
            .status(400)
            .title("RedisResource requires attributes to be provided")
        .build());
    }
    return this.start_tx(req).then(function(multi) {
        console.log("GOT MULTI: ", multi);
        req.arena.redis_transaction = Promise.resolve(multi.set(this.prefix+req.data.id, JSON.stringify(req.data.attributes), function(err, reply) {
            console.log("ERR: ", err);
            console.log("REPLY: ", reply);
        }));
        return [Record()
            .id(req.data.id)
            .type(req.resource)
            .attributes(JSON.parse(JSON.stringify(req.data.attributes)))
        .build()]
    }.bind(this))
}

function RedisConnection(options) {
    this.client = redis.createClient(options);
}

RedisConnection.prototype.prefix = function(prefix) {
    return new RedisResource(this, prefix+".");
}

module.exports = RedisConnection;
