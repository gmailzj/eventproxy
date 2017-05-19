var eventproxy = require("./eventProxy.js");
var fs = require("fs");
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


// ep.emit("d", "data-d");
// ep.emit("e", "data-e");

// var getContent = require("./getContent");
// getContent.getContent(function(err, data) {
//     // console.log("数据:", arguments)
// })


// process.exit();


// test after方法
var files = ["t1.txt", "t2.txt"]
var ep = new eventproxy();
ep.after('got_file', files.length, function(list) {
    // 在所有文件的异步执行结束后将被执行
    // 所有文件的内容都存在list数组中
    console.log("read file list ok", list)
});
for (var i = 0; i < files.length; i++) {
    // fs.readFile(files[i], 'utf-8', function(err, content) {
    //     // 触发结果事件
    //     ep.emit('got_file', content);
    // });
    fs.readFile(files[i], { encoding: 'utf8', flag: 'r' }, ep.group('got_file', function(data) {
        return 'filter:' + data;
    }));
}



// exports.getContent = function (callback) {
//  var ep = new EventProxy();
//   ep.all('tpl', 'data', function (tpl, data) {
//     // 成功回调
//     callback(null, {
//       template: tpl,
//       data: data
//     });
//   });
//   // 侦听error事件
//   ep.bind('error', function (err) {
//     // 卸载掉所有handler
//     ep.unbind();
//     // 异常回调
//     callback(err);
//   });
//   fs.readFile('template.tpl', 'utf-8', function (err, content) {
//     if (err) {
//       // 一旦发生异常，一律交给error事件的handler处理
//       return ep.emit('error', err);
//     }
//     ep.emit('tpl', content);
//   });
//   db.get('some sql', function (err, result) {
//     if (err) {
//       // 一旦发生异常，一律交给error事件的handler处理
//       return ep.emit('error', err);
//     }
//     ep.emit('data', result);
//   });
// };


// exports.getContent = function (callback) {
//  var ep = new EventProxy();
//   ep.all('tpl', 'data', function (tpl, data) {
//     // 成功回调
//     callback(null, {
//       template: tpl,
//       data: data
//     });
//   });
//   // 添加error handler
//   ep.fail(callback);

//   fs.readFile('template.tpl', 'utf-8', ep.done('tpl'));
//   db.get('some sql', ep.done('data'));
// };


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