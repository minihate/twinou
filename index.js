'use strict';

var fs = require('fs');
var server = new (require('./Server.js'))(process.argv.length > 2);
var Store = require('./Store.js');
var metas = new Store('stores/metas.json');
var tags = new Store('stores/tags.json');
var articles = new Store('stores/articles.json');
var Lorem = require('./Lorem.js');
var ss = new(require('ws').Server)({
    server: server.server
});

if (!fs.existsSync('./stores')){
    fs.mkdirSync('./stores');
}

function getTagsWith(t, parent, _a) {
    return t.filter(a => a.parent === parent).map(a => {
        a.articles = _a.filter(b => b.tags.indexOf(a.name) !== -1);
        a.childs = getTagsWith(t, a.name, _a);
        return a;
    });
}

function getTags() {
    var t = tags.keys().map((k, i) => {return {name: k, parent: tags.getItem(k), i}});
    return {childs: getTagsWith(t, '', articles.values())};
}

function getMetas() {
    return {
        name: metas.getItem('name', 'Twinou'),
        title: metas.getItem('title', 'Welcome to Twinou'),
        password: metas.getItem('password', 'twinou'),
        tags: getTags() // TODO add articles for each tags
    };
}

ss.on('connection', socket => {
	if (decodeURIComponent(socket.upgradeReq.url) !== '/' + metas.getItem('password', 'twinou')) socket.close();
	socket.on('message', message => {
	    var data = JSON.parse(message);
	    if (data.hasOwnProperty('get')) {
	        if (data.get === 'metas') {
	            socket.send(JSON.stringify({metas: getMetas()}));
	        }
	    } else if (data.hasOwnProperty('set')) {
	        if (data.set === 'meta') {
	            metas.setItem(data.name, data.value);
	        } else if (data.set === 'tag') {
	            if (data.from !== '') {
	                delete tags.data[data.from];
	            }
	            if (data.name === '') {
	                delete tags.data[data.from];
	            } else {
	                if (data.parent === '' || tags.data.hasOwnProperty(data.parent)) {
	                    tags.data[data.name] = data.parent;
	                }
	            }
	            tags.save();
	        } else if (data.set === 'article') {
	            if (data.from !== data.article.url && articles.data.hasOwnProperty(data.article.url)) process.exit();
	            articles.removeItem(data.from);
	            if (data.article.url.length > 0) articles.setItem(data.article.url, data.article);
	        }
	        socket.send(JSON.stringify({metas: getMetas()}));
	    }
    });
});

server.module(new RegExp('^/$'), 'mindmap', () => {
    var m = getMetas();
    m.json = JSON.stringify(m.tags);
    return m;
});
server.module(new RegExp('^/admin$'), 'admin', getMetas);
server.module(new RegExp('^/.{1,}$'), 'article', uri => {
    var article = articles.getItem(decodeURIComponent(uri.pathname.slice(1)));
    if (!article) return null;
    else return Object.assign(getMetas(), article);
});

server.serve('public/');
server.compile('templates/');
server.listen(process.argv.length > 2 ? parseInt(process.argv[2]) : 80);