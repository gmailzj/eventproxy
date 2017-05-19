var EventProxy = require("./eventProxy.js");
var fs = require("fs")

exports.getContent = function(callback) {

    console.log("run content")
    var ep = new EventProxy();
    ep.all('tpl', 'data', function(tpl, data) {
        // 成功回调
        callback(null, {
            template: tpl,
            data: data
        });
    });
    // 侦听error事件
    ep.bind('error', function(err) {
        // 卸载掉所有handler
        ep.unbind();
        // 异常回调
        callback(err);
    });
    fs.readFile('template.tpl', 'utf-8', function(err, content) {

        if (err) {
            // 一旦发生异常，一律交给error事件的handler处理
            return ep.emit('error', err);
        }
        // console.log('读取模板', content)
        ep.emit('tpl', content);
    });
    fs.readFile('data.json', 'utf-8', function(err, content) {
        if (err) {
            // 一旦发生异常，一律交给error事件的handler处理
            return ep.emit('error', err);
        }
        ep.emit('data', content);
    });
    // db.get('some sql', function(err, result) {
    //     if (err) {
    //         // 一旦发生异常，一律交给error事件的handler处理
    //         return ep.emit('error', err);
    //     }
    //     ep.emit('data', result);
    // });
};

exports.getContent2 = function(callback) {
    var ep = new EventProxy();
    ep.all('tpl', 'data', function(tpl, data) {
        // 成功回调
        callback(null, {
            template: tpl,
            data: data
        });
    });
    // 添加error handler
    ep.fail(callback);

    fs.readFile('template.tpl', 'utf-8', ep.done('tpl'));
    fs.readFile('data.json', 'utf-8', ep.done('data'));
    //db.get('some sql', ep.done('data'));
};