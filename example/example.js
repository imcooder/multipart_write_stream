// Module dependencies
const path = require('path');
const loadRouter = require('..');
var multipartStream = require('../index');
var process = require('process');

let stream = new multipartStream({
    boundary: "cooder"
});
stream.pipe(process.stdout, {
    end: false
});
let data = [{
        key: "test",
    },
    {
        key: "test test"
    },
    {
        key: "test test test"
    }
];
for (let i = 0; i < data.length - 1; i++) {
    stream.addPart({
        headers: {
            'Content-Disposition': 'form-data; name=metadata',
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(data[i]),
    }).then(function() {
        console.log('success');
    }).catch(function(error) {
        console.error('response failed:%s', error.stack);
    });
}
stream.addPart({
    headers: {
        'Content-Disposition': 'form-data; name=metadata',
        'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(data[data.length - 1]),
}).then(function() {
    stream.end();
    console.debug('success');
}).catch(function(error) {
    logger.error('failed:%s', error.stack);
});