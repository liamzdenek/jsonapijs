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
        this.factory.pool.getConnection(function(err, connection) {
            if(err) {
                return reject(Exception()
                    .code(500)
                    .title("Could not get table column list for "+this.table_name+" -- "+err)
                .build());
            }
            connection.query('DESCRIBE '+this.table_name, function(err, rows, fields) {
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
                connection.release();
                console.log("DESCRIBE TABLE: ", table_fields);
                return resolve(table_fields);
            })
        }.bind(this))
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
    }/* else if(req.kind == "delete") {
        return this.delete(req);
    }*/
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
            .id(id.toString())
            .attributes(rows[i])
        .build());
    }
    return result;
}

MySQLResource.prototype.get_index = function(req) {
    return this.start_connection(req).then(function(connection) {
        return new Promise(function(resolve, reject) {
            let offset = req.pagination_params && req.pagination_params['offset'] ? parseInt(req.pagination_params['offset']) : null;
            let limit = req.pagination_params && req.pagination_params['limit'] ? parseInt(req.pagination_params['limit']) : null;
            let query = "SELECT * FROM "+this.table_name;
            let sql_args = [];
            if(offset != null && limit != null) {
                query += " LIMIT ?,?"
                sql_args = [offset, limit]
            } else if(offset != null) {
                query += " LIMIT ?,18446744073709551615"
                sql_ags = [offset];
            } else if(limit != null) {
                query += "LIMIT ?"
                sql_args = [limit];
            }
            connection.query(query, sql_args, function(err, rows, fields) {
                if(err) {
                    return reject(err);
                }
                        
                return resolve(this.output(req, rows));
            }.bind(this));
        }.bind(this));
    }.bind(this));
}

MySQLResource.prototype.get_by_ids = function(req) {
    return this.start_connection(req).then(function(connection) {
        return new Promise(function(resolve, reject) {
			if( req.data.length == 0 ) {
				return resolve([]);
			}
            let q = new ast.Query("SELECT * FROM "+this.table_name+' ')
            let where = new ast.Where(
                new ast.In(this.id_key, req.data)
            )

            where.express(q)
            connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
                if(err) {
					console.log("ERROR WHILE EXECUTING: ", q.query_string());
                    return reject(err);
                }
                return resolve(this.output(req, rows));
            }.bind(this));
        }.bind(this));
    }.bind(this));
}

MySQLResource.prototype.get_by_field_name = function(req) {
    return Promise.all([this.columns, this.start_connection(req)]).then(function(data) {
        let table_fields = data[0];
        let connection = data[1]
        return new Promise(function(resolve, reject) {
            if(!table_fields.includes(req.data.field_name)) {
                return reject("Only the following fields may be used for get_by_field_name on MySQLResources: "+table_fields+" -- you specified "+req.data.field_name);
            }
            let q = new ast.Query("SELECT * FROM "+this.table_name+' ');
            let where = new ast.Where(
                new ast.In(req.data.field_name, req.data.ids)
            );
            where.express(q);
            connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
                if(err) {
                    return reject(err);
                }
                return resolve(this.output(req,rows));
            }.bind(this))
        }.bind(this))
    }.bind(this));
}

MySQLResource.prototype.start_connection = function(req) {
    if(req.arena.mysql_connection) {
        return req.arena.mysql_connection;
    }

    console.log("BEGINNING CONN, MOUNTING EXIT");
    req.arena.push_after(this.end_connection.bind(this,req));
    req.arena.mysql_connection = new Promise(function(resolve, reject) {
        this.factory.pool.getConnection(function(err, connection) {
            if(err){ return reject(err); }
            
            resolve(connection);
        }.bind(this));
    }.bind(this));
    return req.arena.mysql_connection;
}

MySQLResource.prototype.end_connection = function(req) {
    console.log("IN END CONNECTION");
    if(!req.arena.mysql_connection) {
        return;
    }
    if(req.arena.mysql_connection_close) {
        return;
    }
    req.arena.mysql_connection_close = req.arena.mysql_connection;
    req.arena.mysql_connection_close.then(function(conn) { return this.end_tx(req); }.bind(this))
    req.arena.mysql_connection_close.then(function(conn) { conn.release() }.bind(this));
    return req.arena.mysql_connection_close;
}

MySQLResource.prototype.start_tx = function(req) {
    if(req.arena.mysql_transaction) {
        return req.arena.mysql_transaction;
    }
    req.arena.mysql_transaction = this.start_connection(req).then(function(connection) {
        return new Promise(function(resolve, reject) {
            connection.query("START TRANSACTION", function(err) {
                if(err) { return reject(err); }
                console.log("BEGUN TX");
                resolve(connection);
            }.bind(this));
        }.bind(this));
    }.bind(this));
    return req.arena.mysql_transaction;
}

MySQLResource.prototype.end_tx = function(req, after) {
    if(!req.arena.mysql_transaction) {
        return;
    }

    console.log("Setting promise after tx");
    return Promise.all([after, req.arena.mysql_transaction]).then(function(data) {
        let connection = data[1];
        console.log("ENDING TX ", req.arena.mysql_transaction);
        return req.arena.mysql_transaction.then(new Promise(function(resolve, reject) {
            connection.query("COMMIT", function(err) {
                if(err) { return reject(err); }
                resolve();
            }.bind(this))
        }.bind(this)))
        .catch(function(outer_err) {
            return new Promise(function(resolve, reject) {
                console.log("FAILURE -- ROLLBACK");
                connection.query("ROLLBACK", function(err) {
                    if(err) { return reject(err); }
                    reject(outer_err);
                }.bind(this))
            }.bind(this))
        }.bind(this));
    }.bind(this));
}

MySQLResource.prototype.create = function(req) {
    let mysql_tx = this.start_tx(req);
    return Promise.all([this.columns, mysql_tx]).then( function(data) {
        let table_fields = data[0];
        let connection = data[1];
        return create_common(req, function(resolve, reject) {
            if("id" in req.data) {
                return reject(Exception()
                    .status(403)
                    .title("This resource does not support a client-generated ID")
                .build());
            }

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
            connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
                console.log("QUERY DONE");
                if(err) {
                    return reject(err);
                }
                connection.query("SELECT * FROM "+this.table_name+" WHERE "+this.id_key+"=?", rows.insertId, function(err, rows, fields) {
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
    let mysql_tx = this.start_tx(req);
    return Promise.all([this.columns, mysql_tx]).then( function(data) {
        let table_fields = data[0];
        let connection = data[1];
        return update_common(req, function(resolve, reject) {
            if(req.data.id && req.data.document.id && req.data.document.id != req.data.id) {
                return reject(Exception()
                    .status(403)
                    .title("This resource does not support the updating of IDs")
                .build());
            }

            let table_fields_whitelisted = [];
            table_fields.forEach(function(k) {
                if(k in req.data.document.attributes) {
                    table_fields_whitelisted.push(k);
                }
            });
            let q = new ast.Query("");
            let update = new ast.Update(this.table_name, table_fields_whitelisted, req.data.document.attributes, new ast.Where(
                new ast.Equals(this.id_key, req.data.id)
            ));
            update.express(q);
            console.log("QUERY: ", q);
            connection.query(q.query_string(), q.sql_arguments, function(err, rows, fields) {
                console.log("QUERY DONE");
                if(err) {
                    return reject(err);
                }
                connection.query("SELECT * FROM "+this.table_name+" WHERE "+this.id_key+"=?", req.data.id, function(err, rows, fields) {
                    if(err) {
                        return reject(err);
                    }
                    return resolve(this.output(req,rows));
                    
                }.bind(this));
            }.bind(this))
            
        }.bind(this));
    }.bind(this));
}

function MySQLResourceFactory(builder) {
    this.connection_object = builder._connection_object;
    this.pool = mysql.createPool(this.connection_object);
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
