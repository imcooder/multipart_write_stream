# multipart write stream

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/multipart-write-stream.svg
[npm-url]: https://npmjs.com/package/multipart-write-stream
[download-image]: https://img.shields.io/npm/dm/multipart-write-stream.svg
[download-url]: https://npmjs.com/package/multipart-write-stream
[david-image]: https://img.shields.io/david/imcooder/multipart-write-stream.svg
[david-url]: https://david-dm.org/imcooder/multipart-write-stream

## Install
```
npm i multipart-write-stream -S
```

## Usage
### addPart
return Promse

```js
let stream = new multipartStream({
    boundary: "cooder"
});
stream.pipe(process.stdout, {
    end: false
});
stream.on('finish', () => {
        console.log('all finish');
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
}).then(function() {
    console.debug('success');
}, true).catch(function(error) {
    logger.error('failed:%s', error.stack);
});
```
body: string array or stream
## License

The [MIT License](LICENSE)
