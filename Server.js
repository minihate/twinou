'use strict';
var Handlebars = require('handlebars');
var http = require('http');
var fs = require('fs');
var url = require('url');
var mime = require('mime');
var path = require('path');
var watch = require('node-watch');

// TODO put this code in a different project

var encoding = 'UTF-8';

function walk(dir, f) {
    fs.readdir(dir, (error, childs) => {
        childs.forEach(child => {
            var path = dir + '/' + child;
            fs.stat(path, (error, stats) => {
                if (stats.isDirectory()) {
                    walk(path, f);
                } else if (stats.isFile()) {
                    f(path);
                }
            });
        });
    });
}

class Server {
    constructor(watching) {
        this.watch = !!watching;
        this.statics = {};
        this.modules = [];
        this.templates = {};
        this.server = http.createServer((request, response) => {
            var uri = url.parse(request.url, true);
            if (this.statics.hasOwnProperty(uri.pathname)) {
                response.writeHead(200, {'Content-Type': this.statics[uri.pathname].mime + '; charset=' + encoding});
                response.end(this.statics[uri.pathname].content, encoding);
            } else {
                var module = this.modules.find(a => uri.pathname.match(a.pattern));
                var context = null;
                if (module) {
                    context = module.f(uri);
                }
                if (context) {
                    response.writeHead(200, {'Content-Type': 'text/html; charset=' + encoding});
                    response.end(this.templates[module.template](context), encoding);
                } else {
                    response.writeHead(404, {'Content-Type': 'text/html; charset=' + encoding});
                    response.end(this.templates['error']({code: 404, message: '<strong>' + decodeURIComponent(uri.pathname) + '</strong> was not found on this server.'}), encoding);
                }
            }
        });
    }
    // TODO serve one file (for uploads)
    serve(dir, watching) {
        if (!dir.endsWith('/')) dir += '/';
        walk(dir, path => {
            var url = path.slice(dir.length);
            fs.readFile(path, encoding, (error, content) => {
                this.statics[url] = {
                    mime: mime.lookup(path),
                    content
                };
            });
        });
        if (this.watch) watch(dir, () => this.serve(dir));
    }
    compile(dir, watching) {
        if (!dir.endsWith('/')) dir += '/';
        fs.readdir(dir, (error, childs) => {
            childs.forEach(child => {
                var name = path.parse(child).name;
                fs.readFile(dir + '/' + child, encoding, (error, content) => {
                    this.templates[name] = Handlebars.compile(content);
                });
            });
        });
        if (this.watch) watch(dir, () => this.compile(dir));
    }
    module(pattern, template, f) {
        this.modules.push({pattern, template, f});
    }
    listen(port) {
        this.server.listen(port);
    }
}

module.exports = Server;