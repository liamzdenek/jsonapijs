var frisby = require('frisby');
var environment = require('./environment/2.js');
var common = require('./common.js');
var uuid = require('node-uuid');

var BASE_URL = environment.URL

common.wrap_success(frisby.create('Create Session')
    .post(BASE_URL+"/session/",{
        data: {
            type: "session",
            attributes: {
                "username": "223",
                "password": "abcd",
            },
        }
    },{json: true})
)
    .afterJSON(function(json) {
        expect(uuid.parse(json.data.id)).not.toBe(null);
        let id = json.data.id;
        check_login(id);
    })
.toss();

function check_login(id) {
    common.wrap_success(frisby.create('Check Session'))
        .get(BASE_URL+"/session/mine")
        .addHeader("Authorization", "Bearer "+id)
        .afterJSON(function(json) {
            console.log("CHECK LOGIN: ", json);
            expect(json.data.relationships.logged_in_as.data.type).toBe("users", "Expected a user relationship to be specified in the relationships section");
            expect(json.data.relationships.logged_in_as.data.id).toBe("2", "Expected a user relationship to be specified in the relationships section");
        })
    .toss();

    common.wrap_success(frisby.create('Check Session'))
        .get(BASE_URL+"/session/mine?include=logged_in_as")
        .addHeader("Authorization", "Bearer "+id)
        .afterJSON(function(json) {
            console.log("INCLUDED: ", JSON.stringify(json));
            expect(json.included.length).toBe(1,"Expected included to contain the user record");
        })
    .toss();

    common.wrap_success(frisby.create('Ensure /users/2 does not send back "password" field'))
        .get(BASE_URL+"/users/2")
        .afterJSON(function(json) {
            expect(typeof json.data).toBe("object", "Expected exactly one response object");
            expect("password" in json.data.attributes).toBe(false, "The attributes of the primary response data should not contain the 'password' key");
            expect("username" in json.data.attributes).toBe(true, "The attributes of the primary response should contain the 'password' key");
        })
    .toss()
}
