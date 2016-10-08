
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
    }.bind(this))
    q.query += ")"
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
}

