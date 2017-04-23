# multipart write stream

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/multipart_write_stream.svg
[npm-url]: https://npmjs.com/package/multipart_write_stream
[download-image]: https://img.shields.io/npm/dm/multipart_write_stream.svg
[download-url]: https://npmjs.com/package/multipart_write_stream
[david-image]: https://img.shields.io/david/imcooder/multipart_write_stream.svg
[david-url]: https://david-dm.org/imcooder/multipart_write_stream

## Install
```
npm i multipart_write_stream -S
```

## Usage
### addPart
return Promse


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
    stream.end(); //all end
    console.debug('success');
}).catch(function(error) {
    logger.error('failed:%s', error.stack);
});

## License

The [MIT License](LICENSE)