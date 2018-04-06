/**
 * @file: 
 * @author: imcooder@gmail.com
 */
/* jshint esversion: 6 */
/* jshint node:true */

const stream = require('stream');
const isStream = require('is-stream');
const _ = require('underscore');

var number = 0;
const NEWLINE = '\r\n';
var FIELD_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="%s"';
var FIELD_CONTENT_DISPOSITION_LENGTH = FIELD_CONTENT_DISPOSITION.length - 2;
var FILE_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="%s"; filename="%s"';
var FILE_CONTENT_DISPOSITION_LENGTH = FILE_CONTENT_DISPOSITION.length - 4;
var CONTENT_TYPE = 'Content-Type: %s';
var CONTENT_TYPE_LENGTH = CONTENT_TYPE.length - 2;

module.exports = class MultipartStream extends stream.Stream(options) {
    constructor(options) {
        super();
        options = options || {};
        let self = this;
        this._boundary = options.boundary || 'SuperSweetSpecialBoundaryShabam';
        this._streams = [];
        this.readable = true;
        this.writable = true;
        this.paused = true;
        this.busy = false;
        this.eof = false;
        this.writing = false;
        this.firstStream = true;
        this.hasSplited = false;
        this._head = NEWLINE + '--' + this._boundary + NEWLINE;
        this._tail = NEWLINE + '--' + this._boundary + '--';
        this._separator = NEWLINE + '--' + this._boundary + NEWLINE;
    }

    addStream(stream) {
        stream.pause();
        let self = this;
        return new Promise((resolve, reject) => {
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
    }

    resume() {
        let self = this;
        console.log('resume');
        let wasPaused = this.paused;
        this.paused = false;
        this._read();
    }

    pause() {
        this.paused = true;
    }

    getBoundary() {
        return this._boundary;
    }

    write(data) {
        let self = this;
        this.emit('data', data);
        return true;
    }

    end() {
        console.log('stream end');
        let self = this;
        self._pushTail();
        self.eof = true;
        self.readable = false;
        self.emit('end');
    }

    _read() {
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
    }

    _emitStream(cb) {
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
        } else if (!self.hasSplited){
            self._pushSeparator();
            self.hasSplited = true;
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
            self._pushSeparator();
            self.hasSplited = true;
            cb();
        }).bind(this));
        streamStub.stream.resume();
    }
    _pushHeader() {
        let self = this;
        console.log('stream:pushHeader');
        if (self._head) {
            self.emit('data', self._head);
        }
    }

    _pushSeparator() {
        let self = this;
        console.log('stream:pushSeparator');
        if (self._separator) {
            self.emit('data', self._separator);
        }
    }

    _pushTail() {
        let self = this;
        console.log('stream:pushTail');
        if (self._tail) {
            self.emit('data', self._tail);
        }
    }
    makePartStream(part) {
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
    }
    addPart(part) {
        let self = this;
        part = part || {};
        let partStream = new stream.PassThrough();
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
    }
};


