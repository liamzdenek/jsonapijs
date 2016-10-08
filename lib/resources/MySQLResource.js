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
}

MySQLResource.prototype.query = function(req) {
    if(req.kind == "get_index") {
        return this.get_index(req);
    } else if(req.kind == "get_by_ids") {
        return this.get_by_ids(req);
    } else if(req.kind == "get_by_field_name" && req.data.field_name == "id") {

    } else if(req.kind == "get_by_field_name") {

    } else if(req.kind == "create") {

    } else if(req.kind == "update") {

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
