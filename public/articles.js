'use strict';

var elements = {
    blog: document.getElementById('blog'),
    header: document.querySelector('header'),
    menu: document.getElementById('menu'),
    main: document.querySelector('main')
};

// TODO className mess


elements.blog.addEventListener('mouseenter', function() {
    document.body.className += ' menu-open';
});
elements.menu.addEventListener('mouseleave', function() {
    document.body.className = document.body.className.replace(' menu-open', '');
});

if (window.background) {
    document.body.className = 'background';
    document.body.style.backgroundImage = 'url("' + window.background + '")';
    elements.header.style.color = 'white'; // TODO should be computed
    elements.main.style.marginTop = Math.floor(window.innerHeight * 0.9) + 'px';
    window.addEventListener('scroll', function() {
        if (document.body.scrollTop > elements.main.offsetTop - elements.header.clientHeight) {
            elements.header.className = 'scrolled';
        } else {
            elements.header.className = '';
        }
    });
}