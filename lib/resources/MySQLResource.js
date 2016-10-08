var Request = require("./../request.js");
var Record = require("./../record.js");
var Promise = require("bluebird");
var Exception = require("./../exception.js");
var mysql = require("mysql");
var create_common = require("./create_common.js");
var update_common = require("./update_common.js");
var ast = require("./mysql/ast.js");

function MySQLResource(factory, table_name, id_key) {
    this.factory = factory;
    this.table_name = table_name;
    this.id_key = id_key
    this.columns = new Promise(function(resolve, reject) {
        this.factory.connection.query('DESCRIBE '+this.table_name, function(err, rows, fields) {
            if(err) {
               return reject(Exception()
                    .code(500)
                    .title("Could not get table column list for "+this.table_name+" -- "+err)
                .build());
            }
            let table_fields = [];
            rows.forEach(function(row) {
                table_fields.push(row["Field"]);
            })
            return resolve(table_fields);
        })
    }.bind(this));
}

MySQLResource.prototype.query = function(req) {
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
    }
    return Promise.reject(Exception()
        .status(500)
        .title("MySQLResource doesn't know how to handle query kind: "+req.kind)
    .build());
}

MySQLResource.prototype.output = function(req, rows) {
    let result = [];
    for(let i in rows) {
        let id = rows[i][this.id_key];
        delete rows[i][this.id_key];
        result.push(Record()
            .type(req.resource)
            .id(id)
            .attributes(rows[i])
        .build());
    }
    return result;
}

MySQLResource.prototype.get_index = function(req) {
    return new Promise(function(resolve, reject) {
        this.factory.connection.query('SELECT * FROM '+this.table_name, function(err, rows, fields) {
            if(err) {
                return reject(err);
            }
                    
            return resolve(this.output(req, rows));
        }.bind(this));
    }.bind(this));
}

MySQLResource.prototype.get_by_ids = function(req) {
    return new Promise(function(resolve, reject) {
        let q = new ast.Query("SELECT * FROM "+this.table_name+' ')
        let where = new ast.Where(
            new ast.In(this.id_key, req.data)
        )

        where.express(q)

        this.factory.connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
            if(err) {
                return reject(err);
            }
            return resolve(this.output(req, rows));
        }.bind(this));
    }.bind(this));
}

MySQLResource.prototype.get_by_field_name = function(req) {
    return this.columns.then(function(table_fields) {
        return new Promise(function(resolve, reject) {
            if(!table_fields.includes(req.data.field_name)) {
                return Promise.reject("Only the following fields may be used for get_by_field_name on SQLResources: "+table_fields+" -- you specified "+req.data.field_name);
            }
            let q = new ast.Query("SELECT * FROM "+this.table_name+' ');
            let where = new ast.Where(
                new ast.In(req.data.field_name, req.data.ids)
            );
            where.express(q);
            this.factory.connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
                if(err) {
                    return reject(err);
                }
                return resolve(this.output(req,rows));
            }.bind(this))
        }.bind(this))
    }.bind(this));
}

MySQLResource.prototype.create = function(req) {
    return this.columns.then(function(table_fields) {
        return create_common(req, function(resolve, reject) {
            if("id" in req.data) {
                return reject(Exception()
                    .status(403)
                    .title("This resource does not support a client-generated ID")
                .build());
            }

            console.log("REQ: ", req);
            let table_fields_whitelisted = [];
            table_fields.forEach(function(k) {
                if(k in req.data.attributes) {
                    table_fields_whitelisted.push(k);
                }
            });
            let q = new ast.Query("");
            let insert = new ast.Insert(this.table_name, table_fields_whitelisted, [req.data.attributes]);
            insert.express(q);
            console.log("QUERY: ", q);
            this.factory.connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
                if(err) {
                    return reject(err);
                }
                this.factory.connection.query("SELECT * FROM "+this.table_name+" WHERE "+this.id_key+"=?", rows.insertId, function(err, rows, fields) {
                    if(err) {
                        return reject(err);
                    }
                    return resolve(this.output(req,rows));
                    
                }.bind(this));
            }.bind(this))
            
        }.bind(this));
    }.bind(this));
}

MySQLResource.prototype.update = function(req) {
}

function MySQLResourceFactory(builder) {
    this.connection_object = builder._connection_object;
    this.connection = mysql.createConnection(this.connection_object);

    this.connection.connect(function(err) {
        if(err) {
            throw err;
        }
    });
}

MySQLResourceFactory.prototype.table = function(table_name, id_key) {
    return new MySQLResource(this, table_name, id_key);
}

function MySQLResourceFactoryBuilder() {
}

MySQLResourceFactoryBuilder.prototype.connection_object = function(o) {
    this._connection_object = o;
    return this;
}

MySQLResourceFactoryBuilder.prototype.build = function() {
    return new MySQLResourceFactory(this);
}

module.exports = function() {
    return new MySQLResourceFactoryBuilder();
}
