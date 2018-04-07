/**
 * @file:
 * @author: imcooder@gmail.com
 */
/* jshint esversion: 6 */
/* jshint node:true */
const util = require('util');
const stream = require('stream');
const isStream = require('is-stream');
const delayedStream = require('delayed-stream');
const _ = require('underscore');

const NEWLINE = '\r\n';
var FIELD_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="%s"';
var FIELD_CONTENT_DISPOSITION_LENGTH = FIELD_CONTENT_DISPOSITION.length - 2;
var FILE_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="%s"; filename="%s"';
var FILE_CONTENT_DISPOSITION_LENGTH = FILE_CONTENT_DISPOSITION.length - 4;
var CONTENT_TYPE = 'Content-Type: %s';
var CONTENT_TYPE_LENGTH = CONTENT_TYPE.length - 2;

function log() {
    let date = new Date();
    let dateString = util.format('%d-%d-%d %d:%d:%d.%d', date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
    let out = dateString + ' ' + util.format.apply(null, arguments);
    // console.warn(out);
}
const STATUS = {
    none: 0,
    doing: 1,
    done: 2
};
module.exports = class MultipartStream extends stream.Stream {
    constructor(options) {
        super();
        options = options || {};
        this._curId = 0;
        let self = this;
        this._boundary = options.boundary || 'SuperSweetSpecialBoundaryShabam';
        this._streams = [];
        this._currentStream = null;
        this.readable = true;
        this.writable = true;
        this.paused = true;
        this.busy = false;
        this.eof = false;
        this._tailStatus = STATUS.none;
        this.writing = false;
        this.firstStream = true;
        this.hasSplited = false;
        this._head = NEWLINE + '--' + this._boundary + NEWLINE;
        this._tail = NEWLINE + '--' + this._boundary + '--' + NEWLINE;
        this._separator = NEWLINE + '--' + this._boundary + NEWLINE;
    }

    static isStreamLike(stream) {
        return (typeof stream !== 'function') && (typeof stream !== 'string') && (typeof stream !== 'boolean') &&
            (typeof stream !== 'number') && (!Buffer.isBuffer(stream));
    }
    addStream(stream, opt = {}) {
        stream.pause();
        let self = this;
        return new Promise((resolve, reject) => {
            let id = this._curId++;
            log('addStream:%d', id);
            self._streams.push(Object.assign(opt, {
                id: id,
                stream: stream,
                resolve: resolve,
                reject: reject,
                status: STATUS.none
            }));
            this.next();
        });
    }

    resume() {
        let self = this;
        log('resume');
        this.paused = false;
        this._read();
        if (this._currentStream) {
            this._currentStream.resume();
        }
        this.emit('resume');
    }

    pause() {
        this.paused = true;
        if (this._currentStream) {
            this._currentStream.pause();
        }
        this.emit('pause');
    }

    getBoundary() {
        return this._boundary;
    }

    write(data) {
        this.emit('data', data);
        return true;
    }

    end() {
        log('stream end');
        if (!this.eof) {
            this._appendTail();
        }
        this.eof = true;
    }
    _reset() {
        this.writable = false;
        this._streams = [];
        this._currentStream = null;
    }
    _emitError(err) {
        this._reset();
        this.emit('error', err);
    }
    _handleErrors(stream) {
        if (!stream) {
            return;
        }
        stream.on('error', error => {
            this._emitError(error);
        });
    }
    _handleEnd() {
        log('handleEnd');
        let self = this;
        self.readable = false;
    }
    _read() {
        log('_read');
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
    next() {
        if (this.writing) {
            return;
        }
        this._next();
    }
    _next() {
        log('_next');
        if (this.writing) {
            return;
        }
        if (!this._streams.length) {
            this.emit("drain");
            if (this.eof) {
                this._handleEnd();
            }
            return;
        }
        this.writing = true;
        let streamStub = this._streams.shift();
        log('stream:%s begin', streamStub.id);
        streamStub.status = STATUS.doing;
        streamStub.stream.pipe(this, {
            end: false
        });
        streamStub.stream.on('end', () => {
            log('stream:%s end', streamStub.id);
            streamStub.status = STATUS.done;
            if (streamStub.resolve) {
                streamStub.resolve();
            }
            this.writing = false;
            this._next();
        });
        streamStub.stream.on('error', error => {
            console.error('stream:%s end', streamStub.id);
            if (streamStub.reject) {
                streamStub.reject(error);
            }
            this.emit('error', new Error(util.format('sub stream idx:%d error', streamStub.id)));
        });
        streamStub.stream.resume();
    }

    _appendString(str, opt = {}) {
        if (!str) {
            return Promise.resolve();
        }
        let partStream = new stream.PassThrough();
        partStream.end(str);
        return this.addStream(partStream, opt);
    }
    _appendHeader() {
        return this._appendString(this._head);
    }
    _appendSeparator() {
        return this._appendString(this._separator);
    }
    _appendTail() {
        if (this._tailStatus > STATUS.none) {
            return Promise.reject(new Error('already tail'));
        }
        this._tailStatus = STATUS.doing;
        return this._appendString(this._tail, {
            tail: true
        }).then(() => {
            this._tailStatus = STATUS.done;
            this.emit('finish');
        });
    }
    static makePartStream(part) {
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

    addPart(part, last = false, opt = {
        end: false
    }) {
        let self = this;
        if (this.firstStream) {
            this._appendHeader();
            this.firstStream = false;
        }
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

        let p = self.addStream(partStream);
        this._appendString(NEWLINE);
        if (!last) {
            this._appendSeparator();
        } else {
            this.end();
        }
        return p;
    }
};


