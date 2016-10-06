let common;
common = {
    wrap_success: function(test) {
        test = test.afterJSON(common.is_valid_response)
       
        // Clients MUST send all JSON API data in request documents with the header Content-Type: application/vnd.api+json without any media type parameters.
        test = test.addHeader("Content-Type", "application/vnd.api+json")
        


        // Servers MUST send all JSON API data in response documents with the header Content-Type: application/vnd.api+json without any media type parameters.
        test = test.expectHeaderContains('Content-Type', 'application/vnd.api+json')

    // A server MUST respond to a successful request to fetch an individual resource or resource collection with a 200 OK response. 
    test = test.expectStatus(200)

        return test;
    },
    is_valid_response: function(json) {
        for(let i in common.validators) {
            common.validators[i](json);
        }
    },
    is_resource_object: function(json) {
        // A resource object MUST contain at least the following top-level members:
        return json && json["id"] && json["type"];
    },
    is_resource_identifier_object: function(json) {
        return json && json["id"] && json["type"]
    },
    validate_resource_objects: function(data) {
        if(!Array.isArray(data)) {
            data = [data];
        }
        for(let i in data) {
            let datum = data[i];
            common.validate_resource_object(datum);
        }
    },
    validate_resource_object: function(datum) {
        console.log("validating resource object: ", datum);
        
        expect(datum.id).not.toBe(null, "Every resource object MUST contain an id member and a type member.");
        expect(datum.type).not.toBe(null,"Every resource object MUST contain an id member and a type member."); 
        
        expect(typeof datum.id).toBe("string","The values of the id and type members MUST be strings.");
        expect(typeof datum.type).toBe("string","The values of the id and type members MUST be strings.");

        // The values of type members MUST adhere to the same constraints as member names.
        expect(datum.id.length).not.toBe(0, "The values of type members MUST adhere to the same constraints as member names. Member names MUST contain at least one character.");
        // TODO: Member names MUST contain only the allowed characters listed below.
        // TODO: Member names MUST start and end with a “globally allowed character”, as defined below.
        

        if(datum.attributes) {
            expect(typeof datum.attributes).toBe("object", "The value of the attributes key MUST be an object (an “attributes object”).");


            expect('id' in datum.attributes).toBe(false, "In other words, a resource can not ... have an attribute or relationship named type or id. "+JSON.stringify(datum));
        }

        if(datum.relationships) {

            expect(typeof datum.relationships).toBe("object", "TODO: find the part of the spec that says datum.relationships should be an object");

            expect('type' in datum.relationships).toBe(false, "In other words, a resource can not ... have an attribute or relationship named type or id. "+JSON.stringify(datum))

        }

    },
    is_resource_objects: function(data) {
        if(!Array.isArray(data)) {
            data = [data];
        }
        for(let i in data) {
            let datum = data[i];
            if(!common.is_resource_object(datum)) {
                return false;
            }
        }
        return true;
    },
    validators: {
        has_no_error: function(json) {
            if(!json.meta || !('error' in json.meta)) {
                return;
            }

            expect(json.meta.error).toBe(null);
        },
        primary_data_resource_objects: function(json) {
            if(!common.is_resource_objects(json.data)) {
                return;
            }
            common.validate_resource_objects(json.data);
        },
        primary_data: function(json) {
            // A logical collection of resources MUST be represented as an array, even if it only contains one item or is empty.
            let temp_failure = null;
            let modes = [common.is_resource_object, common.is_resource_identifier_object];
            OUTER: for(let modei in modes) {
                let mode = modes[modei];
                if(Array.isArray(json.data)) {
                    for(let i in json.data) {
                        let datum = json.data[i];
                        console.log("MODE: ",mode, datum);
                        if(!mode(datum)) {
                            temp_failure = "Primary data MUST be either: ... an array of resource objects, an array of resource identifier objects, or an empty array ([]), for requests that target resource collections -- "+JSON.stringify(datum);
                            continue OUTER;

                        }
                    }
                    return; // no error
                } else if(json.data) {
                    if(!mode(json.data)) {
                        temp_failure = "Primary data MUST be either: ... a single resource object, a single resource identifier object, or null, for requests that target single resources -- "+JSON.stringify(json);
                        continue OUTER;
                    }
                    return; // no error
                }
            }
            expect(null).toBe(temp_failure);
        },
        links_attributes: function(json) {
            if(!json.links) {
                return
            }
            
            let permissible = ["self", "related", "first", "last", "prev", "next"];
            for(let key in json.links) {
                if(!permissible.includes(key)) {
                    expect(null).toBe("The top-level links object MAY contain the following members: "+permissible);
                } 
            }
            
        },
        no_included_without_data: function(json) {
            if(!json["data"] && json["included"]) {
                expect(null).toBe("If a document does not contain a top-level data key, the included member MUST NOT be present either.");
            }
        },
        data_no_coexist_errors: function(json) {
            if(json["data"] && json["errors"]) {
                expect(null).toBe("The members data and errors MUST NOT coexist in the same document.")
            }
        },
        minimum_members: function(json) {
            let permissible = ["data", "errors", "meta"]
            for(let key in permissible) {
                if(permissible[key] in json) {
                    return;
                }
            }
            expect(null).toBe(true, "A document MUST contain at least one of the following top-level members: "+permissible+", json: "+JSON.stringify(json));
        },
        addl_members: function(json) {
            let permissible = ["data", "errors", "meta", "jsonapi", "links", "included"];
            for(let key in json) {
                if(!permissible.includes(key)) {
                    expect(null).toBe(true,"Unless otherwise noted, objects defined by this specification MUST NOT contain any additional members. We found: "+key);
                }
            }
        }
    }
};
module.exports = common;
