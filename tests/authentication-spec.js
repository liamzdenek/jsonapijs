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
        })
    .toss();

    common.wrap_success(frisby.create('Check Session'))
        .get(BASE_URL+"/session/mine?include=logged_in_as")
        .addHeader("Authorization", "Bearer "+id)
        .afterJSON(function(json) {
            console.log("INCLUDED: ", json);
        })
    .toss();
}
