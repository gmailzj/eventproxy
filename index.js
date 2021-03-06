var eventproxy = require("./eventProxy.js");
var EventProxy = eventproxy;
var fs = require("fs");
const assert = require('assert');
const equal = assert.equal;
var ep = new eventproxy;

// var callback = function(err, data) {
//         console.log(err, data);
//     }
//     // eq.all === eq.assign
// ep.all("a", ["b", "c"], function(a, b, c) {
//     console.log("all event is ok")
//     callback(null, arguments)
// })

// // 对事件a 定义 处理回调
// // ep.on("a", function() {
// //     // console.log(Date.now(), "中国")
// // })

// // ep.emit("a", 1);
// ep.emit("a", 1)
// ep.emit("c", 3)

// ep.emit("b", 3);



// 这里最好是先 ep = new eventproxy 防止事件混淆在一起
ep.all("d", "e", function(p1, p2) {
    console.log("d e ok")
})

// ep.on("d", function dHandler() {
//     console.log(Date.now(), "中国")
// })


ep.emit("d", "data-d");
ep.emit("e", "data-e");

var getContent = require("./getContent");
getContent.getContent2(function(err, data) { // 如果出错了，data 为undefined
    console.log((data))
    console.log("数据:", arguments)
})

// any 用法 任何一个被注册的事件触发都会导致注册的事件被触发
var obj = new EventProxy();
var counter = 0;
var eventData1 = "eventData1";
var eventData2 = "eventData2";
obj.any('event1', 'event2', function(map) {
    assert.equal(map.data, eventData1, 'Return data should be evnetData1.');
    assert.equal(map.eventName, "event1", 'Event name should be event1.');
    counter += 1;
});
obj.trigger('event1', eventData1);
assert.equal(counter, 1, 'counter should be incremented.');
obj.trigger('event2', 2);
assert.equal(counter, 1, 'counter should not be incremented.');


// not 用法 除了某种事件以外的其他事件都可以触发
var obj = new EventProxy();
var counter = 0;
obj.not('event1', function(data) {
    counter += 1;
});
obj.trigger('event1', 1);
equal(counter, 0, 'counter should not be incremented.');
obj.trigger('event2', 2);
equal(counter, 1, 'counter should be incremented.');
obj.trigger('event2', 2);
equal(counter, 2, 'counter should be incremented.');

// process.exit();


// test after方法
// var files = ["t1.txt", "t2.txt"]
// var ep = new eventproxy();
// ep.after('got_file', files.length, function(list) {
//     // 在所有文件的异步执行结束后将被执行
//     // 所有文件的内容都存在list数组中
//     console.log("read file list ok", list)
// });
// for (var i = 0; i < files.length; i++) {
//     // fs.readFile(files[i], 'utf-8', function(err, content) {
//     //     // 触发结果事件
//     //     ep.emit('got_file', content);
//     // });
//     fs.readFile(files[i], { encoding: 'utf8', flag: 'r' }, ep.group('got_file', function(data) {
//         return 'filter:' + data;
//     }));
// }

// var ep = new EventProxy();
// ep.tail('tpl', 'data', function(tpl, data) {
//     // 在所有指定的事件触发后，将会被调用执行
//     // 参数对应各自的事件名的最新数据
//     console.log(tpl, data);
// });
// fs.readFile('template.tpl', 'utf-8', function(err, content) {
//     ep.emit('tpl', content);
// });
// setInterval(function() {
//     fs.readFile('data.json', 'utf-8', function(err, content) {
//         if (err) {
//             // 一旦发生异常，一律交给error事件的handler处理
//             return ep.emit('error', err);
//         }
//         ep.emit('data', content);
//     });
// }, 2000);



// ep.fail(callback);
// // 由于参数位相同，它实际是
// ep.fail(function (err) {
//   callback(err);
// });

// // 等价于
// ep.bind('error', function (err) {
//   // 卸载掉所有handler
//   ep.unbind();
//   // 异常回调
//   callback(err);
// });