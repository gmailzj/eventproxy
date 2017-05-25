/*global define*/ !(function(name, definition) {
    // Check define
    var hasDefine = typeof define === 'function',
        // Check exports
        hasExports = typeof module !== 'undefined' && module.exports;

    if (hasDefine) {
        // AMD Module or CMD Module
        define('eventproxy_debug', function() { return function() {}; });
        define(['eventproxy_debug'], definition);
    } else if (hasExports) {
        // Node.js Module
        module.exports = definition(require('debug')('eventproxy'));
    } else {
        // Assign to common namespaces or simply the global object (window)
        this[name] = definition();
    }
})('EventProxy', function(debug) {
    debug = debug || function() {};

    /*!
     * refs
     */
    var SLICE = Array.prototype.slice;
    var CONCAT = Array.prototype.concat;
    var ALL_EVENT = '__all__';

    /**
     * EventProxy. An implementation of task/event based asynchronous pattern.
     * A module that can be mixed in to *any object* in order to provide it with custom events.
     * You may `bind` or `unbind` a callback function to an event;
     * `trigger`-ing an event fires all callbacks in succession.
     * Examples:
     * ```js
     * var render = function (template, resources) {};
     * var proxy = new EventProxy();
     * proxy.assign("template", "l10n", render);
     * proxy.trigger("template", template);
     * proxy.trigger("l10n", resources);
     * ```
     */
    var EventProxy = function() {
        // 防止直接调用构造函数
        if (!(this instanceof EventProxy)) {
            return new EventProxy();
        }
        this._callbacks = {};
        this._fired = {};
    };

    /**
     * Bind an event, specified by a string name, `ev`, to a `callback` function.
     * Passing __ALL_EVENT__ will bind the callback to all events fired.
     * Examples:
     * ```js
     * var proxy = new EventProxy();
     * proxy.addListener("template", function (event) {
     *   // TODO
     * });
     * ```
     * @param {String} eventname Event name.
     * @param {Function} callback Callback.
     */
    EventProxy.prototype.addListener = function(ev, callback) {
        // 其实只是把事件处理回调 加入到回调队列，在trigger的时候用到
        // 程序中也可以单独对某件事件添加处理函数
        debug('Add listener for %s', ev);
        // 常用手法 添加一项并且作为数组使用并且初始化，这样运行的时候不会出错
        this._callbacks[ev] = this._callbacks[ev] || [];
        //  加入到回调队列中
        this._callbacks[ev].push(callback);
        return this;
    };
    /**
     * `addListener` alias, `bind`  ，`on`，`subscribe` 等价
     */
    EventProxy.prototype.bind = EventProxy.prototype.addListener;
    /**
     * `addListener` alias, `on`
     */
    EventProxy.prototype.on = EventProxy.prototype.addListener;
    /**
     * `addListener` alias, `subscribe`
     */
    EventProxy.prototype.subscribe = EventProxy.prototype.addListener;

    /**
     * Bind an event, but put the callback into head of all callbacks.
     * @param {String} eventname Event name.
     * @param {Function} callback Callback.
     */
    EventProxy.prototype.headbind = function(ev, callback) {
        // 添加到事件处理队列的最前面
        debug('Add listener for %s', ev);
        this._callbacks[ev] = this._callbacks[ev] || [];
        this._callbacks[ev].unshift(callback);
        return this;
    };

    /**
     * Remove one or many callbacks. 取消事件处理回调
     *
     * - If `callback` is null, removes all callbacks for the event.
     * - If `eventname` is null, removes all bound callbacks for all events.
     * @param {String} eventname Event name.
     * @param {Function} callback Callback.
     */
    EventProxy.prototype.removeListener = function(eventname, callback) {
        var calls = this._callbacks;
        if (!eventname) { // 如果不加事件名，清除所有的回调
            debug('Remove all listeners');
            this._callbacks = {};
        } else {
            if (!callback) { // 没有提供参数 回调，清除eventname事件的所有回调
                debug('Remove all listeners of %s', eventname);
                calls[eventname] = [];
            } else { // 得到事件名和回调
                var list = calls[eventname];
                if (list) {
                    var l = list.length;
                    for (var i = 0; i < l; i++) {
                        if (callback === list[i]) { // 如果找到了回调 删除回调
                            debug('Remove a listener of %s', eventname);
                            list[i] = null;
                        }
                    }
                }
            }
        }
        return this;
    };
    /**
     * `removeListener` alias, unbind 等价
     */
    EventProxy.prototype.unbind = EventProxy.prototype.removeListener;

    /**
     * Remove all listeners. It equals unbind()
     * Just add this API for as same as Event.Emitter.
     * @param {String} event Event name.
     */
    EventProxy.prototype.removeAllListeners = function(event) {
        return this.unbind(event);
    };

    /**
     * Bind the ALL_EVENT event 注册 任务完成的 事件处理函数
     */
    EventProxy.prototype.bindForAll = function(callback) {
        //console.log(ALL_EVENT)
        this.bind(ALL_EVENT, callback);
    };

    /**
     * Unbind the ALL_EVENT event  取消监听 任务完成
     */
    EventProxy.prototype.unbindForAll = function(callback) {
        this.unbind(ALL_EVENT, callback);
    };

    /**
     * Trigger an event, firing all bound callbacks. Callbacks are passed the
     * same arguments as `trigger` is, apart from the event name.
     * Listening for `"all"` passes the true event name as the first argument.
     * @param {String} eventname Event name
     * @param {Mix} data Pass in data
     */
    EventProxy.prototype.trigger = function(eventname, data) {
        debug("trigger:", eventname)
        var list, ev, callback, i, l;
        var both = 2;
        var calls = this._callbacks;
        // console.log(calls);
        debug('Emit event %s with data %j', eventname, data);
        while (both--) {
            // 注意第一次运行到这里 both已经等于1了，如果是等于0，说明是用来最后处理ALL_EVENT(全部完成的事件bindForAll)
            // 也就是说 每一次trigger单个事件的时候，其实也会触发ALL_EVENT事件，
            // 但是ALL_EVENT事件是否完成，最终的判断是在_assign函数的_all函数中

            // 事件名
            ev = both ? eventname : ALL_EVENT;
            list = calls[ev]; // 得到回调列表
            if (list) {
                // 遍历所有的回调, 一个事件可能有多个绑定回调，比如用户自定义bind
                for (i = 0, l = list.length; i < l; i++) {
                    // 注意上一轮(both=1)的回调

                    // 有两种可能：
                    // 1 用户自定回调为false，
                    // 2 单个事件回调已经执行了, 会在removeListener中执行 unbind，
                    if (!(callback = list[i])) {
                        debug(callback, 'alert')
                            // 删掉该list中的item
                        list.splice(i, 1);

                        // 下面两行相当于重来一次循环判断
                        i--;
                        l--;
                    } else { // callback 为真
                        // console.log(callback)
                        var args = [];
                        // 如果是单个事件 过滤掉第一个参数 事件名，只要data
                        // ALL_EVENT的话，需要包括事件名, after方法中有用到事件名和data
                        var start = both ? 1 : 0;
                        for (var j = start; j < arguments.length; j++) {
                            args.push(arguments[j]);
                        }
                        // console.log(args);
                        // callback 必须是函数，用户自定义bind的时候，没有强制规定
                        callback.apply(this, args);
                    }
                }
            }
        }
        return this;
    };

    /**
     * `trigger` alias  emit、trigger、fire 等价 都是触发事件的意思
     */
    EventProxy.prototype.emit = EventProxy.prototype.trigger;
    /**
     * `trigger` alias
     */
    EventProxy.prototype.fire = EventProxy.prototype.trigger;

    /**
     * Bind an event like the bind method, but will remove the listener after it was fired.
     * @param {String} ev Event name
     * @param {Function} callback Callback
     */
    EventProxy.prototype.once = function(ev, callback) {
        // 和bind的区别就是
        var self = this;
        // 里面包装一个unbind, 当第一次执行以后，unbind，就相当于只能once
        var wrapper = function() {
            //console.log(arguments)
            // 这里arguments是指真正 wrapper 执行的时候的参数
            callback.apply(self, arguments);
            self.unbind(ev, wrapper);
        };

        // 真正绑定
        this.bind(ev, wrapper);
        return this;
    };

    // later等于下面的三个选择之一 。优先级：setImmediate > process.nextTick > setTimeout(fn, 0);
    var later = (typeof setImmediate !== 'undefined' && setImmediate) ||
        (typeof process !== 'undefined' && process.nextTick) || function(fn) {
            setTimeout(fn, 0);
        };

    /**
     * emitLater
     * make emit async  异步事件触发
     */
    EventProxy.prototype.emitLater = function() {
        var self = this;
        var args = arguments;
        later(function() { // 通过上面的later方案
            self.trigger.apply(self, args);
        });
    };

    /**
     * Bind an event, and trigger it immediately.  绑定并立即执行，传递 事件名、事件发生以后的回调、触发时传递的数据
     * @param {String} ev Event name.
     * @param {Function} callback Callback.
     * @param {Mix} data The data that will be passed to calback as arguments.
     */
    EventProxy.prototype.immediate = function(ev, callback, data) {
        this.bind(ev, callback);
        this.trigger(ev, data);
        return this;
    };
    /**
     * `immediate` alias 和 immediate 别名等价
     */
    EventProxy.prototype.asap = EventProxy.prototype.immediate;

    // 设置最终回调和事件列表
    var _assign = function(eventname1, eventname2, cb, once) {
        // 引用this
        var proxy = this;
        var argsLength = arguments.length;
        var times = 0;
        var flag = {};

        // Check the arguments length. 最起码有3个参数：一个事件名和一个回调和一个标记once(内部赋值，::all方法里面)
        if (argsLength < 3) {
            return this;
        }

        // 所有的事件参数
        var events = SLICE.call(arguments, 0, -2);

        // 最终回调cb
        var callback = arguments[argsLength - 2];

        // true 表示isOnce为真，all的时候赋值为 true
        var isOnce = arguments[argsLength - 1];

        // Check the callback type.
        if (typeof callback !== "function") {
            return this;
        }
        debug('Assign listener for events %j, once is %s', events, !!isOnce);

        // key 表示的是 事件名
        var bind = function(key) {
            // 根据isOnce判断method为once或者bind
            var method = isOnce ? "once" : "bind";

            // 在这里绑定每个事件handler proxy[method] 对应 this.once、this.bind方法
            // 在应用中的区别就是
            // ep.tail的时候会使用bind，这样只要事件成功触发过，然后重复提交任意其中1个事件(tail绑定) 都会触发ALL_EVENT
            proxy[method](key, function(data) {
                // 这里才是真正的单个事件处理 handler

                // this._fired[key] 初始化
                proxy._fired[key] = proxy._fired[key] || {};

                // 存储已经触发的事件的数据, ALL_EVENT回调用到
                proxy._fired[key].data = data;
                // flag[key]列表中标记key 不存在的时候表示第一次触发事件才是是真正合法的
                if (!flag[key]) {
                    flag[key] = true;
                    times++;
                }
            });
        };

        // 绑定多个自定义事件
        var length = events.length;
        for (var index = 0; index < length; index++) {
            bind(events[index]); // 参数为事件名key
        }
        // ALL_EVENT 回调, 但是不代表真正完成ALL_EVENT，单个事件触发的时候也会这些这里，然后在里面判断是否完成
        // 第一个参数
        var _all = function(event) {
            console.log('开始ALL_EVENT 是否完成判断：', times, length, flag[event], event);

            // '开始ALL_EVENT 是否完成判断：'
            if (times < length) { // 如果事件触发的次数小于总的事件数量
                return;
            }
            if (!flag[event]) {
                return;
            }
            var data = [];
            // 这里就是获取ALL_EVENT回调的参数
            for (var index = 0; index < length; index++) {
                data.push(proxy._fired[events[index]].data);
            }
            if (isOnce) { // 如果是一次性事件，注册ubindForAll事件处理
                proxy.unbindForAll(_all);
            }
            debug('Events %j all emited with data %j', events, data);
            // 真正传递数据并执行回调
            callback.apply(null, data);
        };
        proxy.bindForAll(_all);
    };

    /**
     * Assign some events, after all events were fired, the callback will be executed once.
     *
     * Examples:
     * ```js
     * proxy.all(ev1, ev2, callback);
     * proxy.all([ev1, ev2], callback);
     * proxy.all(ev1, [ev2, ev3], callback);
     * ```
     * @param {String} eventname1 First event name.
     * @param {String} eventname2 Second event name.
     * @param {Function} callback Callback, that will be called after predefined events were fired.
     */
    EventProxy.prototype.all = function(eventname1, eventname2, callback) {
        // 主要是为了合并事件参数
        var args = CONCAT.apply([], arguments);
        args.push(true);
        // console.log(args)
        _assign.apply(this, args);
        return this;
    };
    /**
     * `all` alias
     */
    EventProxy.prototype.assign = EventProxy.prototype.all;

    /**
     * Assign the only one 'error' event handler.
     * @param {Function(err)} callback
     */
    EventProxy.prototype.fail = function(callback) {
        var that = this;

        that.once('error', function() {
            that.unbind();
            // put all arguments to the error handler
            // fail(function(err, args1, args2, ...){})
            callback.apply(null, arguments);
        });
        return this;
    };

    /**
     * A shortcut of ep#emit('error', err)
     */
    EventProxy.prototype.throw = function() {
        var that = this;
        that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
    };

    /**
     * Assign some events, after all events were fired, the callback will be executed first time.
     * Then any event that predefined be fired again, the callback will executed with the newest data.
     * Examples:
     * ```js
     * proxy.tail(ev1, ev2, callback);
     * proxy.tail([ev1, ev2], callback);
     * proxy.tail(ev1, [ev2, ev3], callback);
     * ```
     * @param {String} eventname1 First event name.
     * @param {String} eventname2 Second event name.
     * @param {Function} callback Callback, that will be called after predefined events were fired.
     */
    EventProxy.prototype.tail = function() {
        var args = CONCAT.apply([], arguments);
        args.push(false); // 和EventProxy.prototype.all的唯一区别 true=>false，从而来控制bind 和once
        _assign.apply(this, args);
        return this;
    };
    /**
     * `tail` alias, assignAll
     */
    EventProxy.prototype.assignAll = EventProxy.prototype.tail;
    /**
     * `tail` alias, assignAlways
     */
    EventProxy.prototype.assignAlways = EventProxy.prototype.tail;

    /**
     * The callback will be executed after the event be fired N times.
     * @param {String} eventname Event name.
     * @param {Number} times N times.
     * @param {Function} callback Callback, that will be called after event was fired N times.
     */
    EventProxy.prototype.after = function(eventname, times, callback) {
        // 重复异步协作
        // 如果参数times为0，直接执行回调, 参数为数组[]
        if (times === 0) {
            callback.call(null, []);
            return this;
        }
        var proxy = this,
            firedData = [];
        // _after 初始化
        this._after = this._after || {};
        // 根据事件名设置分组名
        var group = eventname + '_group';
        // 存储分组事件的数据
        this._after[group] = {
            index: 0,
            results: []
        };
        debug('After emit %s times, event %s\'s listenner will execute', times, eventname);

        // 设置所有事件完成以后的回调
        var all = function(name, data) {
            if (name === eventname) { // 到处都是闭包 事件名
                times--;
                // 将数据添加到list列表
                firedData.push(data);
                if (times < 1) { // 说明已经完成了
                    debug('Event2 %s was emit %s, and execute the listenner', eventname, times);
                    // 解绑事件监听
                    proxy.unbindForAll(all);
                    // 事件完成调用回调
                    callback.apply(null, [firedData]);
                }
            }
            if (name === group) { // 到处都是闭包 事件组名 ep.group('got_file') ,实际是ep.emit的groupname
                times--;
                // 换一种group方式将数据添加到list列表
                proxy._after[group].results[data.index] = data.result;
                if (times < 1) { // 说明已经完成了
                    debug('Event %s was emit %s, and execute the listenner', eventname, times);
                    // 解绑事件监听
                    proxy.unbindForAll(all);
                    // 事件完成调用回调
                    callback.call(null, proxy._after[group].results);
                }
            }
        };
        proxy.bindForAll(all);
        return this;
    };

    /**
     * The `after` method's helper. Use it will return ordered results.
     * If you need manipulate result, you need callback
     * Examples:
     * ```js
     * var ep = new EventProxy();
     * ep.after('file', files.length, function (list) {
     *   // Ordered results
     * });
     * for (var i = 0; i < files.length; i++) {
     *   fs.readFile(files[i], 'utf-8', ep.group('file'));
     * }
     * ```
     * @param {String} eventname Event name, shoule keep consistent with `after`.
     * @param {Function} callback Callback function, should return the final result.
     */
    EventProxy.prototype.group = function(eventname, callback) {
        var that = this;
        var group = eventname + '_group'; // 分组名称
        var index = that._after[group].index;
        that._after[group].index++;
        return function(err, data) {
            if (err) { // 错误处理
                // put all arguments to the error handler 提交错误
                return that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
            }
            that.emit(group, { // 提交事件组
                index: index,
                // callback(err, args1, args2, ...) 如果ep.group()的时候提供了callback参数，就是增加中间层加工data
                result: callback ? callback.apply(null, SLICE.call(arguments, 1)) : data
            });
        };
    };

    /**
     * The callback will be executed after any registered event was fired. It only executed once.
     * 回调将在任意一个注册了的事件触发以后执行，而且只执行一次
     * @param {String} eventname1 Event name.
     * @param {String} eventname2 Event name.
     * @param {Function} callback The callback will get a map that has data and eventname attributes.
     */
    EventProxy.prototype.any = function() {
        var proxy = this,
            callback = arguments[arguments.length - 1], // 最后一个参数为callback
            events = SLICE.call(arguments, 0, -1), // 事件名数组
            _eventname = events.join("_"); // eg:  event1_event2_event3

        debug('Add listenner for Any of events %j emit', events);
        proxy.once(_eventname, callback); // 只执行一次

        var _bind = function(key) {
            proxy.bind(key, function(data) { // 对每一个事件绑定
                debug('One of events %j emited, execute the listenner');
                proxy.trigger(_eventname, { "data": data, eventName: key }); // 触发`event1_event2_event3`事件
            });
        };

        for (var index = 0; index < events.length; index++) {
            _bind(events[index]);
        }
    };

    /**
     * The callback will be executed when the event name not equals with assigned event.
     * @param {String} eventname Event name.
     * @param {Function} callback Callback.
     */
    EventProxy.prototype.not = function(eventname, callback) {
        var proxy = this;
        debug('Add listenner for not event %s', eventname);

        // 这里绑定 ALL_EVENT  ，在trigger单个事件的时候，在trigger方法里面会有ALL_EVENT的判断
        proxy.bindForAll(function(name, data) {
            if (name !== eventname) {
                debug('listenner execute of event %s emit, but not event %s.', name, eventname);
                callback(data); // 传递数据并执行回调
            }
        });
    };

    /**
     * Success callback wrapper, will handler err for you.
     *
     * ```js
     * fs.readFile('foo.txt', ep.done('content'));
     *
     * // equal to =>
     *
     * fs.readFile('foo.txt', function (err, content) {
     *   if (err) {
     *     return ep.emit('error', err);
     *   }
     *   ep.emit('content', content);
     * });
     * ```
     *
     * ```js
     * fs.readFile('foo.txt', ep.done('content', function (content) {
     *   return content.trim();
     * }));
     *
     * // equal to =>
     *
     * fs.readFile('foo.txt', function (err, content) {
     *   if (err) {
     *     return ep.emit('error', err);
     *   }
     *   ep.emit('content', content.trim());
     * });
     * ```
     * @param {Function|String} handler, success callback or event name will be emit after callback.
     * @return {Function}
     */
    EventProxy.prototype.done = function(handler, callback) {
        var that = this;
        return function(err, data) {

            if (err) {
                // put all arguments to the error handler
                // 如果出错了，提交error
                return that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
            }

            // callback(err, args1, args2, ...)
            // 得到数据
            var args = SLICE.call(arguments, 1);

            if (typeof handler === 'string') { // 如果第一个参数是字符串
                // getAsync(query, ep.done('query'));
                // or
                // getAsync(query, ep.done('query', function (data) {
                //   return data.trim();
                // }));
                if (callback) { // 如果有回调，其实就是数据加工函数
                    // only replace the args when it really return a result
                    return that.emit(handler, callback.apply(null, args));
                } else {
                    // put all arguments to the done handler
                    //ep.done('some');
                    //ep.on('some', function(args1, args2, ...){});  触发事件，并传递数据
                    return that.emit.apply(that, [handler].concat(args));
                }
            }

            // speed improve for mostly case: `callback(err, data)`
            if (arguments.length <= 2) { // 第一个参数是函数 需要手动emit
                // console.log("<=2")
                return handler(data);
            }

            // callback(err, args1, args2, ...)
            handler.apply(null, args);
            // console.log("last")
        };
    };

    /**
     * make done async
     * @return {Function} delay done
     */
    EventProxy.prototype.doneLater = function(handler, callback) {
        var _doneHandler = this.done(handler, callback);
        return function(err, data) {
            var args = arguments;
            later(function() {
                _doneHandler.apply(null, args);
            });
        };
    };

    /**
     * Create a new EventProxy
     * Examples:
     * ```js
     * var ep = EventProxy.create();
     * ep.assign('user', 'articles', function(user, articles) {
     *   // do something...
     * });
     * // or one line ways: Create EventProxy and Assign
     * var ep = EventProxy.create('user', 'articles', function(user, articles) {
     *   // do something...
     * });
     * ```
     * @return {EventProxy} EventProxy instance
     */
    EventProxy.create = function() {
        var ep = new EventProxy();
        var args = CONCAT.apply([], arguments);
        if (args.length) {
            // 假设最后1个是errorHandler, 倒数第2个是回调
            var errorHandler = args[args.length - 1];
            var callback = args[args.length - 2];
            if (typeof errorHandler === 'function' && typeof callback === 'function') {

                // 处理好errorHandler,
                args.pop();
                ep.fail(errorHandler);
            }
            // 开始真正的assign
            ep.assign.apply(ep, args);
        }
        return ep;
    };

    // Backwards compatibility
    EventProxy.EventProxy = EventProxy;

    return EventProxy;
});