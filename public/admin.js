// Blog: name, title, favicon, mindmap style, mindmap background, tags, password

// Tags is a tree that can be edited by clicking on a tag, and selecting his parent
// Articles could be sorted by creation date or tags
// Ok so left you got a menu for 
// 1) Blog metas 
// 2) Tag tree (clicking on a tag give you list of articles in it, and allow you to edit its name and its parent)
// 3) Shortcut to last edited articles

// Article: url, title, tags, background, content

// Sort tags by total number of articles ?

// See http://cssdeck.com/labs/pure-css-tree-menu-framework

'use strict';
/*global tinymce*/
function empty(node) {
    while(node.firstChild) {
        node.removeChild(node.firstChild);
    }   
}

var elements = {
    nav: document.querySelector('nav'),
    main: document.querySelector('main')
};

//var dummy = {tags: {childs: [{name: 'Lapins', articles: [], childs: [{name: 'Carottes', childs: []}]}, {name: 'Chats', articles: [], childs: []}]}};

// field {name: string|undefined, description: string|undefined, type: text|file|html, value: what, saver: return null or error message}

function getElement(field, i) {
    var div = document.createElement('div');
    div.className = 'field';
    if (field.name) {
        var strong = document.createElement('strong');
        strong.appendChild(document.createTextNode(field.name));
        if (field.type === 'button') {
            strong.className = 'button';
            var c = 'hsl(' + ((i * 90) % 360) + ', 100%, 50%)';
            strong.style.backgroundColor = c;
            strong.addEventListener('mouseenter', () => strong.style.backgroundColor = c.replace('50%', '30%'));
            strong.addEventListener('mouseleave', () => strong.style.backgroundColor = c);
            strong.addEventListener('click', () => field.saver());
        }
        div.appendChild(strong);
    }
    if (field.type === 'text' || field.type === 'file') {
        var input = document.createElement('input');
        input.type = 'text';
        if (field.description) input.placeholder = field.description;
        if (field.value) input.value = field.value;
        input.addEventListener('input', () => field.saver(input.value));
        div.appendChild(input);
    }
    if (field.type === 'list') {
        var ul = document.createElement('ul');
        ul.className = 'items';
        field.items.forEach(one => {
            var li = document.createElement('li');
            li.innerHTML = '<span style="font-weight: bold;">' + one.url + ': </span>' + one.title;
            li.addEventListener('click', () => field.saver(one));
            ul.appendChild(li);
        });
        div.appendChild(ul);
    }
    if (field.type === 'html') {
        var textarea = document.createElement('textarea');
        textarea.appendChild(document.createTextNode(field.value));
        div.appendChild(textarea);
        setTimeout(() => {
        tinymce.init({ selector:'textarea', height: window.innerHeight - 140, plugins: [
    'advlist autolink lists link image charmap print preview hr anchor pagebreak',
    'searchreplace wordcount visualblocks visualchars code fullscreen',
    'insertdatetime media nonbreaking save table contextmenu directionality',
    'emoticons template paste textcolor colorpicker textpattern imagetools'
  ],
        toolbar: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview media | forecolor backcolor emoticons',
        image_advtab: true,
        setup : function(editor) {
            window.addEventListener('beforeunload', () => field.saver(editor.getContent()))
          editor.on('change', () => {
              field.saver(editor.getContent());
          });
        }
        });
        }, 100);
    }
    return div;
}

function populate(element, fields) {
    var i = 0;
    fields.map(field => getElement(field, i++)).forEach(x => element.appendChild(x));
}

var password = window.localStorage.getItem('password') || prompt('Password /(oxo)\\');
window.localStorage.setItem('password', password);
var socket = new WebSocket('ws://' + window.location.host + '/' + password);

function setMetaFactory(name) {
    return value => {
        socket.send(JSON.stringify({set: 'meta', name, value}));
    };
}

var previous = null;
var metas = null;
var templates = {
    'nav': metas => {
        empty(elements.nav);
        document.title = 'Manage ' + metas.name;
        var informations = document.createElement('div');
        informations.id = 'informations';
        informations.appendChild(document.createTextNode('Informations'));
        informations.addEventListener('click', () => templates.blog(metas));
        elements.nav.appendChild(informations);
        
        var newtag = document.createElement('div');
        newtag.id = 'newtag';
        newtag.appendChild(document.createTextNode('New tag'));
        newtag.addEventListener('click', () => templates.tag())
        elements.nav.appendChild(newtag);
        
        var tagsTree = document.createElement('div');
        tagsTree.id = 'tags-tree';
        var tagsTreeTitle = document.createElement('strong');
        tagsTreeTitle.appendChild(document.createTextNode('Tags'));
        tagsTree.appendChild(tagsTreeTitle);
        var recursiveBuild = (tag) => {
            var list = document.createElement('ul');
            tag.childs.forEach(child => {
                var li = document.createElement('li');
                var span = document.createElement('span');
                span.className = 'tag';
                span.addEventListener('click', () => templates.tag(child));
                span.appendChild(document.createTextNode(child.name + (child.articles.length > 0 ? ' (' + child.articles.length + ')' : '')));
                li.appendChild(span);
                li.appendChild(recursiveBuild(child));
                list.appendChild(li);
            });
            return list;
        };
        tagsTree.appendChild(recursiveBuild(metas.tags));
        elements.nav.appendChild(tagsTree);
    },
    'blog': metas => {
        empty(elements.main);
        populate(elements.main, [
            {name: 'Blog Name', value: metas.name, description: 'Name of your blog', type: 'text', saver: setMetaFactory('name')},
            {name: 'Blog Title', value: metas.title, description: 'Short description of your blog', type: 'text', saver: setMetaFactory('title')},
            {name: 'Admin Password', value: metas.password, description: 'Password for accessing this page', type: 'text', saver: setMetaFactory('password')}
        ]);
    },
    'tag': tag => {
        empty(elements.main);
        if (tag) previous = tag;
        else previous = {parent: '', from: ''};
        populate(elements.main, [
            {name: 'Name', value: tag ? tag.name : '', description: 'Do not use spaces. Lower case only', type: 'text', saver: name => {
                if (name.startsWith('#')) {
                    name = name.slice(1);
                }
                name = name.toLowerCase();
                socket.send(JSON.stringify({set: 'tag', from: previous.name, name: name, parent: previous.parent}));
                previous.name = name;
            }},
            {name: 'Parent', value: tag ? tag.parent : '', description: 'Keep it empty if this is a root tag. Only one parent is allowed', type: 'text', saver: parent => {
                if (parent.startsWith('#')) {
                    parent = parent.slice(1);
                }
                parent = parent.toLowerCase();
                socket.send(JSON.stringify({set: 'tag', name: previous.name, parent}));
                previous.parent = parent;
            }},
            {name: 'Articles', type: 'list', items: tag ? tag.articles: [], saver: art => templates.article(art)},
            {name: 'Create article here', type: 'button', saver: () => {
                templates.article({url: '', title: '', tags: [previous.name], background: '', content: '', time: Date.now()});
            }},
            {name: 'Delete tag', type: 'button', saver: () => {
                socket.send(JSON.stringify({set: 'tag', from: previous.name, name: ''}));
                templates.blog(metas);
            }}
        ]);
    },
    'article': article => {
        previous = article;
        function factory(name, f) {
            return value => {
                var old = previous.url;
                previous[name] = f ? f(value) : value;
                socket.send(JSON.stringify({set: 'article', from: old, article: previous}));
            };
        }
        empty(elements.main);
        populate(elements.main, [
            {name: 'URL', value: article.url, description: 'Article\'s ID (i.e url = rabbits => http://' + window.location.host + '/rabbits)', type: 'text', saver: factory('url')},
            {name: 'Title', value: article.title, description: 'Title of your article', type: 'text', saver: factory('title')},
            {name: 'Tags', value: article.tags.map(t => '#' + t).join(' '), description: 'Tags of your article (i.e "#blabla #blop #cats")', type: 'text', saver: factory('tags', t => t.split(' ').map(a => a.startsWith('#') ? a.slice(1) : a))},
            {name: 'Background', value: article.background, description: 'URL to the background image (Large image recommended) (Optional)', type: 'file', saver: factory('background')},
            {name: 'Content', value: article.content, type: 'html', saver: factory('content')},
            {name: 'Delete article', type: 'button', saver: () => {
                factory('url')('');
                templates.blog(metas);
            }}
        ]);
    }
};

socket.onopen = event => {
    socket.send(JSON.stringify({get: 'metas'}));
};
socket.onmessage = event => {
    var data = JSON.parse(event.data);
    if (data.hasOwnProperty('metas')) {
        metas = data.metas;
        templates.nav(metas);
        if (elements.main.innerHTML === '') templates.blog(metas);
    }
};
socket.onclose = event => {
    if (metas === null) {
        // User changed password
        window.localStorage.removeItem('password');
        window.location.reload();
    }
    Array.prototype.forEach.call(document.querySelectorAll('input, textarea'), element => {
        element.setAttribute('disabled', 'disabled');
    });
};