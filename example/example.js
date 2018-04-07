// Module dependencies
/* jshint node:true */
/* jshint esversion:6 */

const multipartStream = require('../index');
const {
    PassThrough
} = require('stream');
const process = require('process');

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
        body: JSON.stringify(data[i])
    }).then(() => {
        // console.log('success');
    }).catch(error => {
        console.error('response failed:%s', error.stack);
    });
}

stream.on('finish', () => {
    console.log('finish');
});
let delayStream = new PassThrough();
setTimeout(() => {
    delayStream.end('delay stream test');
}, 5000);
stream.addPart({
    headers: {
        'Content-Disposition': 'form-data; name=metadata',
        'Content-Type': 'application/json; charset=utf-8',
    },
    body: delayStream,
}).then(() => {
    // console.log('stream write finish');
});

stream.addPart({
    headers: {
        'Content-Disposition': 'form-data; name=metadata',
        'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(data[data.length - 1]),
}, true).then(() => {
    // console.debug('success');
}).catch(error => {
    console.error('failed:%s', error.stack);
});

stream.end();
