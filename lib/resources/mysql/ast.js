
function Query(query_text) {
    this.query = query_text;
    //this.format_arguments = [];
    this.sql_arguments = [];
}

Query.prototype.query_string = function() {
    return this.query;
}

// interface Expression {
//      express(Query)
// }

function Logic(keyword, expressions) {
    this.keyword = keyword;
    this.expressions = expressions;
}

Logic.prototype.express = function(q) {
    if(this.expressions.length > 1) {
        q.query += "(";
    }
    this.expressions.forEach(function(e,i) {
        if(v != 0) {
            q.query += this.keyword + " ";
        }
        e.express(q);
    }.bind(this))
    if(this.expressions.length > 1) {
        q.query += ")";
    }
}

function Where(expression) {
    this.expression = expression;
}

Where.prototype.express = function(q) {
    q.query += "WHERE ";
    this.expression.express(q);
}

function Literal(string_expression) {
    if(!string_expression) {
        return null;
    }
    this.string_expression = string_expression;
}

Literal.prototype.express = function(q) {
    q.query += this.string_expression + " "
}

function Equals(key, value) {
    this.key = key;
    this.value = value;
}

Equals.prototype.express = function(q) {
    q.query += this.key + "=? ";
    q.sql_arguments.push(this.value);
}

function In(key, values) {
    this.key = key;
    this.values = values;
}

In.prototype.express = function(q) {
    q.query += this.key+" IN( ";
    this.values.forEach(function(v,k) {
        q.sql_arguments.push(v);
        q.query += "?";
        if(k != this.values.length-1) {
            q.query += ",";
        }
    }.bind(this))
    q.query += ")"
}

function Insert(table, columns, data) {
    this.table = table;
    this.columns = columns;
    this.data = data;
}

Insert.prototype.express = function(q) {
    let table_fields_string = "(";
    if(this.columns.length != 0) {
        table_fields_string += "`"+this.columns.join("`,`")+"`"
    }
    table_fields_string += ")";
    console.log("Whitelisted fields: ", table_fields_string);
    q.query += "INSERT INTO "+this.table+" "+table_fields_string+" VALUES ";
    this.data.forEach(function(new_row, i) {
        q.query += "("
        this.columns.forEach(function(column, j) {
            q.query += "?";
            if(j != this.columns.length-1) {
                q.query += ",";
            }
            q.sql_arguments.push(new_row[column])
        }.bind(this));
        q.query += ")";
        if(i == this.data.length-1) {
            q.query += ";";
        } else {
            q.query += ",";
        }
    }.bind(this))
}

function Update(table, columns, data, where) {
    this.table = table;
    this.columns = columns;
    this.data = data;
    this.where = where;
}

Update.prototype.express = function(q) {
    let table_fields_string = "(";
    if(this.columns.length != 0) {
        table_fields_string += "`"+this.columns.join("`,`")+"`"
    }
    table_fields_string += ")";
    console.log("Whitelisted fields: ", table_fields_string);
    q.query += "UPDATE "+this.table+" SET ";
    this.columns.forEach(function(column, j) {
        q.query += column+"=?";
        if(j != this.columns.length-1) {
            q.query += ",";
        }
        q.sql_arguments.push(this.data[column])
    }.bind(this));
    this.where.express(q);
}

module.exports = {
    Query: Query,
    Logic: Logic,
    AND: Logic.bind(null,"AND"),
    OR: Logic.bind(null,"OR"),
    Where: Where,
    Literal: Literal,
    Equals: Equals,
    In: In,
    Insert: Insert,
    Update: Update,
}

