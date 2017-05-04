/*jshint esversion: 6 */
var stream = require('stream');
var inherits = require('inherits');
var isStream = require('is-stream');
var util = require('util');
var _ = require('underscore');
var number = 0;
var fs = require('fs');
var mime = require('mime');

var NEWLINE = '\r\n';
var FIELD_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="%s"';
var FIELD_CONTENT_DISPOSITION_LENGTH = FIELD_CONTENT_DISPOSITION.length - 2;
var FILE_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="%s"; filename="%s"';
var FILE_CONTENT_DISPOSITION_LENGTH = FILE_CONTENT_DISPOSITION.length - 4;
var CONTENT_TYPE = 'Content-Type: %s';
var CONTENT_TYPE_LENGTH = CONTENT_TYPE.length - 2;

function MultipartStream(options) {
    options = options || {};
    let self = this;
    this._boundary = options.boundary || '__boundary_cooder__';
    this._streams = [];
    this.readable = true;
    this.writable = true;
    this.paused = true;
    this.busy = false;
    this.eof = false;
    this.writing = false;
    this.firstStream = true;
    self._head = '--' + this._boundary + NEWLINE;
    self._tail = NEWLINE + '--' + this._boundary + '--';
    self._separator = NEWLINE + '--' + this._boundary + NEWLINE;
}
util.inherits(MultipartStream, stream.Stream);

MultipartStream.prototype.addStream = function(stream) {
    stream.pause();
    let self = this;
    return new Promise(function(resolve, reject) {
        let id = ++number;
        console.log('addStream:%d', id);
        self._streams.push({
            id: id,
            stream: stream,
            resolve: resolve,
            reject: reject,
        });
        process.nextTick(self.resume.bind(self));
    });
};

MultipartStream.prototype.resume = function() {
    let self = this;
    console.log('resume');
    var wasPaused = self.paused;
    self.paused = false;
    self._read();
};

MultipartStream.prototype.pause = function() {
    let self = this;
    self.paused = true;
};

MultipartStream.prototype.getBoundary = function() {
    let self = this;
    return self._boundary;
};

MultipartStream.prototype.write = function(data) {
    let self = this;
    self.emit('data', data);
    return true;
};

MultipartStream.prototype.end = function() {
    console.log('stream end');
    let self = this;
    self._pushTail();
    self.eof = true;
    self.readable = false;
    self.emit('end');
};

MultipartStream.prototype._read = function() {
    let self = this;
    if (!self.readable || self.paused) {
        return;
    }
    if (self._streams.length > 0) {
        self._emitStream(self._read.bind(self));
    } else {
        // 继续等待input 不结束
        //self.end();    
    }
};

MultipartStream.prototype._emitStream = function(cb) {
    console.log('emit stream');
    let self = this;
    if (!self._streams.length) {
        return;
    }
    if (self.writing) {
        return;
    }
    if (self.firstStream) {
        self._pushHeader();
        self.firstStream = false;
    } else {
        self._pushSeparator();
    }
    let streamStub = self._streams.shift();
    console.log('stream:%s begin', streamStub.id);
    self.writing = true;
    streamStub.stream.pipe(self, { end: false });
    streamStub.stream.on('end', (function handleFileEnd() {
        console.log('stream:%s end', streamStub.id);
        if (streamStub.resolve) {
            streamStub.resolve();
        }
        self.writing = false;
        self.emit('data', NEWLINE);
        cb();
    }).bind(this));
    streamStub.stream.resume();
};
MultipartStream.prototype._pushHeader = function() {
    let self = this;
    console.log('stream:pushHeader');
    if (self._head) {
        self.emit('data', self._head);
    }
};

MultipartStream.prototype._pushSeparator = function() {
    let self = this;
    console.log('stream:pushSeparator');
    if (self._separator) {
        self.emit('data', self._separator);
    }
};

MultipartStream.prototype._pushTail = function() {
    let self = this;
    console.log('stream:pushTail');
    if (self._tail) {
        self.emit('data', self._tail);
    }
};
MultipartStream.prototype.makePartStream = function(part) {
    part = part || {};
    var partStream = new stream.PassThrough();
    if (part.headers) {
        for (let key in part.headers) {
            let header = part.headers[key];
            partStream.write(key + ': ' + header + NEWLINE);
        }
    }
    partStream.write(NEWLINE);
    if (isStream(part.body)) {
        part.body.pipe(partStream);
    } else {
        partStream.end(part.body);
    }
    return partStream;
};
MultipartStream.prototype.addPart = function(part) {
    let self = this;
    part = part || {};
    var partStream = new stream.PassThrough();
    if (part.headers) {
        for (let key in part.headers) {
            let header = part.headers[key];
            partStream.write(key + ': ' + header + NEWLINE);
        }
    }
    partStream.write(NEWLINE);
    if (isStream(part.body)) {
        part.body.pipe(partStream);
    } else {
        partStream.end(part.body);
    }
    return self.addStream(partStream);
};


module.exports = MultipartStream;
