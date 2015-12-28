'use strict';

var fs = require('fs');

class Store {
    constructor(file) {
        this.file = file;
        this.data = {};
        this.load();
    }
    setItem(key, value) {
        this.data[key] = value;
        this.save();
    }
    getItem(key, or) {
        return this.data.hasOwnProperty(key) ? this.data[key] : (or ? or : null);
    }
    removeItem(key) {
        delete this.data[key];
        this.save();
    }
    keys() {
        var keys = [];
        for (let key in this.data) {
            keys.push(key);
        }
        return keys;
    }
    values() {
        var values = [];
        for (let key in this.data) {
            values.push(this.data[key]);
        }
        return values;
    }
    save() {
        fs.writeFile(this.file, JSON.stringify(this.data), 'UTF-8');
    }
    load() {
        fs.readFile(this.file, 'UTF-8', (error, json) => {
            if (!error) {
                this.data = JSON.parse(json);
            }
        });
    }
}

module.exports = Store;