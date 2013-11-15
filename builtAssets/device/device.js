;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
'use strict';

var routie = require('../../3rdparty/routie');
var player = require('./player');

window.Device = function() {
  
  routie({
    '':            require('./controllers/register'),
    '/register':   require('./controllers/register'),
    '/wait':       require('./controllers/wait'),
    '/join':       require('./controllers/join'),
    '/lobby':      require('./controllers/lobby'),
    '/gamepad':    require('./controllers/gamepad'),
    '/thanks':     require('./controllers/thanks')
  });
  
  $('#menu').on('click', function() {
    if (window.confirm('disconnect player?')) {
      player.reset();
      routie.navigate('/');
    }
  });
  
};
},{"../../3rdparty/routie":2,"./player":3,"./controllers/register":4,"./controllers/wait":5,"./controllers/join":6,"./controllers/lobby":7,"./controllers/gamepad":8,"./controllers/thanks":9}],2:[function(require,module,exports){
(function (root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(window);
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return (root.routie = factory(window));
    });
  } else {
    root.routie = factory(window);
  }
}(this, function (w) {

  var routes = [];
  var map = {};
  var reference = "routie";
  var oldReference = w[reference];

  var Route = function(path, name) {
    this.name = name;
    this.path = path;
    this.keys = [];
    this.fns = [];
    this.params = {};
    this.regex = pathToRegexp(this.path, this.keys, false, false);

  };

  Route.prototype.addHandler = function(fn) {
    this.fns.push(fn);
  };

  Route.prototype.removeHandler = function(fn) {
    for (var i = 0, c = this.fns.length; i < c; i++) {
      var f = this.fns[i];
      if (fn == f) {
        this.fns.splice(i, 1);
        return;
      }
    }
  };

  Route.prototype.run = function(params) {
    for (var i = 0, c = this.fns.length; i < c; i++) {
      this.fns[i].apply(this, params);
    }
  };

  Route.prototype.match = function(path, params){
    var m = this.regex.exec(path);

    if (!m) return false;


    for (var i = 1, len = m.length; i < len; ++i) {
      var key = this.keys[i - 1];

      var val = ('string' == typeof m[i]) ? decodeURIComponent(m[i]) : m[i];

      if (key) {
        this.params[key.name] = val;
      }
      params.push(val);
    }

    return true;
  };

  Route.prototype.toURL = function(params) {
    var path = this.path;
    for (var param in params) {
      path = path.replace('/:'+param, '/'+params[param]);
    }
    path = path.replace(/\/:.*\?/g, '/').replace(/\?/g, '');
    if (path.indexOf(':') != -1) {
      throw new Error('missing parameters for url: '+path);
    }
    return path;
  };

  var pathToRegexp = function(path, keys, sensitive, strict) {
    if (path instanceof RegExp) return path;
    if (path instanceof Array) path = '(' + path.join('|') + ')';
    path = path
      .concat(strict ? '' : '/?')
      .replace(/\/\(/g, '(?:/')
      .replace(/\+/g, '__plus__')
      .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
        keys.push({ name: key, optional: !! optional });
        slash = slash || '';
        return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
      })
      .replace(/([\/.])/g, '\\$1')
      .replace(/__plus__/g, '(.+)')
      .replace(/\*/g, '(.*)');
    return new RegExp('^' + path + '$', sensitive ? '' : 'i');
  };

  var addHandler = function(path, fn) {
    var s = path.split(' ');
    var name = (s.length == 2) ? s[0] : null;
    path = (s.length == 2) ? s[1] : s[0];

    if (!map[path]) {
      map[path] = new Route(path, name);
      routes.push(map[path]);
    }
    map[path].addHandler(fn);
  };

  var routie = function(path, fn) {
    if (typeof fn == 'function') {
      addHandler(path, fn);
      routie.reload();
    } else if (typeof path == 'object') {
      for (var p in path) {
        addHandler(p, path[p]);
      }
      routie.reload();
    } else if (typeof fn === 'undefined') {
      routie.navigate(path);
    }
  };

  routie.lookup = function(name, obj) {
    for (var i = 0, c = routes.length; i < c; i++) {
      var route = routes[i];
      if (route.name == name) {
        return route.toURL(obj);
      }
    }
  };

  routie.remove = function(path, fn) {
    var route = map[path];
    if (!route)
      return;
    route.removeHandler(fn);
  };

  routie.removeAll = function() {
    map = {};
    routes = [];
  };

  routie.navigate = function(path, options) {
    options = options || {};
    var silent = options.silent || false;

    if (silent) {
      removeListener();
    }
    setTimeout(function() {
      window.location.hash = path;

      if (silent) {
        setTimeout(function() { 
          addListener();
        }, 1);
      }

    }, 1);
  };

  routie.noConflict = function() {
    w[reference] = oldReference;
    return routie;
  };

  var getHash = function() {
    return window.location.hash.substring(1);
  };

  var checkRoute = function(hash, route) {
    var params = [];
    if (route.match(hash, params)) {
      route.run(params);
      return true;
    }
    return false;
  };

  var hashChanged = routie.reload = function() {
    var hash = getHash();
    for (var i = 0, c = routes.length; i < c; i++) {
      var route = routes[i];
      if (checkRoute(hash, route)) {
        return;
      }
    }
  };

  var addListener = function() {
    if (w.addEventListener) {
      w.addEventListener('hashchange', hashChanged, false);
    } else {
      w.attachEvent('onhashchange', hashChanged);
    }
  };

  var removeListener = function() {
    if (w.removeEventListener) {
      w.removeEventListener('hashchange', hashChanged);
    } else {
      w.detachEvent('onhashchange', hashChanged);
    }
  };
  addListener();

  return routie;
}));

},{}],6:[function(require,module,exports){
'use strict';

var routie = require('../../../3rdparty/routie');
var player = require('../player');
var view = require('../../views/join.hbs');

function joined() {
  routie.navigate('/lobby');
}

function backToWait() {
  routie.navigate('/wait');
}

function joinLobby(e) {
  e.preventDefault();
  var data = { playerId: player.get().id };
  $.post('/game/players', data).then(joined).fail(backToWait);
}

module.exports = function() {
  
  if (player.get().id === undefined) {
    routie.navigate('/connect');
  }
  
  $('#page').attr('class', 'join');
  $('#page').html(view());
  $('button').on('click', joinLobby);
};
},{"../../views/join.hbs":10,"../../../3rdparty/routie":2,"../player":3}],9:[function(require,module,exports){
'use strict';

var routie = require('../../../3rdparty/routie');
var view = require('../../views/thanks.hbs');
var config = require('../../../../config');

module.exports = function() {
  
  $('#page').attr('class', 'thanks');
  $('#page').html(view(config));

  $('#done').click(function() {
    routie.navigate('/join');
  });

};
},{"../../views/thanks.hbs":11,"../../../3rdparty/routie":2,"../../../../config":12}],12:[function(require,module,exports){
var config = {};

config.ask_about_social_networking = true;

config.twitter = {};

config.twitter.hashtag = "#ThoughtWorks";
config.twitter.message = "I just scored {0} points on JetPets by @ThoughtWorks. #YOW2013"

module.exports = config;
},{}],13:[function(require,module,exports){
/*! Socket.IO.min.js build:0.9.11, production. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */
var io="undefined"==typeof module?{}:module.exports;(function(){(function(a,b){var c=a;c.version="0.9.11",c.protocol=1,c.transports=[],c.j=[],c.sockets={},c.connect=function(a,d){var e=c.util.parseUri(a),f,g;b&&b.location&&(e.protocol=e.protocol||b.location.protocol.slice(0,-1),e.host=e.host||(b.document?b.document.domain:b.location.hostname),e.port=e.port||b.location.port),f=c.util.uniqueUri(e);var h={host:e.host,secure:"https"==e.protocol,port:e.port||("https"==e.protocol?443:80),query:e.query||""};c.util.merge(h,d);if(h["force new connection"]||!c.sockets[f])g=new c.Socket(h);return!h["force new connection"]&&g&&(c.sockets[f]=g),g=g||c.sockets[f],g.of(e.path.length>1?e.path:"")}})("object"==typeof module?module.exports:this.io={},this),function(a,b){var c=a.util={},d=/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,e=["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"];c.parseUri=function(a){var b=d.exec(a||""),c={},f=14;while(f--)c[e[f]]=b[f]||"";return c},c.uniqueUri=function(a){var c=a.protocol,d=a.host,e=a.port;return"document"in b?(d=d||document.domain,e=e||(c=="https"&&document.location.protocol!=="https:"?443:document.location.port)):(d=d||"localhost",!e&&c=="https"&&(e=443)),(c||"http")+"://"+d+":"+(e||80)},c.query=function(a,b){var d=c.chunkQuery(a||""),e=[];c.merge(d,c.chunkQuery(b||""));for(var f in d)d.hasOwnProperty(f)&&e.push(f+"="+d[f]);return e.length?"?"+e.join("&"):""},c.chunkQuery=function(a){var b={},c=a.split("&"),d=0,e=c.length,f;for(;d<e;++d)f=c[d].split("="),f[0]&&(b[f[0]]=f[1]);return b};var f=!1;c.load=function(a){if("document"in b&&document.readyState==="complete"||f)return a();c.on(b,"load",a,!1)},c.on=function(a,b,c,d){a.attachEvent?a.attachEvent("on"+b,c):a.addEventListener&&a.addEventListener(b,c,d)},c.request=function(a){if(a&&"undefined"!=typeof XDomainRequest&&!c.ua.hasCORS)return new XDomainRequest;if("undefined"!=typeof XMLHttpRequest&&(!a||c.ua.hasCORS))return new XMLHttpRequest;if(!a)try{return new(window[["Active"].concat("Object").join("X")])("Microsoft.XMLHTTP")}catch(b){}return null},"undefined"!=typeof window&&c.load(function(){f=!0}),c.defer=function(a){if(!c.ua.webkit||"undefined"!=typeof importScripts)return a();c.load(function(){setTimeout(a,100)})},c.merge=function(b,d,e,f){var g=f||[],h=typeof e=="undefined"?2:e,i;for(i in d)d.hasOwnProperty(i)&&c.indexOf(g,i)<0&&(typeof b[i]!="object"||!h?(b[i]=d[i],g.push(d[i])):c.merge(b[i],d[i],h-1,g));return b},c.mixin=function(a,b){c.merge(a.prototype,b.prototype)},c.inherit=function(a,b){function c(){}c.prototype=b.prototype,a.prototype=new c},c.isArray=Array.isArray||function(a){return Object.prototype.toString.call(a)==="[object Array]"},c.intersect=function(a,b){var d=[],e=a.length>b.length?a:b,f=a.length>b.length?b:a;for(var g=0,h=f.length;g<h;g++)~c.indexOf(e,f[g])&&d.push(f[g]);return d},c.indexOf=function(a,b,c){for(var d=a.length,c=c<0?c+d<0?0:c+d:c||0;c<d&&a[c]!==b;c++);return d<=c?-1:c},c.toArray=function(a){var b=[];for(var c=0,d=a.length;c<d;c++)b.push(a[c]);return b},c.ua={},c.ua.hasCORS="undefined"!=typeof XMLHttpRequest&&function(){try{var a=new XMLHttpRequest}catch(b){return!1}return a.withCredentials!=undefined}(),c.ua.webkit="undefined"!=typeof navigator&&/webkit/i.test(navigator.userAgent),c.ua.iDevice="undefined"!=typeof navigator&&/iPad|iPhone|iPod/i.test(navigator.userAgent)}("undefined"!=typeof io?io:module.exports,this),function(a,b){function c(){}a.EventEmitter=c,c.prototype.on=function(a,c){return this.$events||(this.$events={}),this.$events[a]?b.util.isArray(this.$events[a])?this.$events[a].push(c):this.$events[a]=[this.$events[a],c]:this.$events[a]=c,this},c.prototype.addListener=c.prototype.on,c.prototype.once=function(a,b){function d(){c.removeListener(a,d),b.apply(this,arguments)}var c=this;return d.listener=b,this.on(a,d),this},c.prototype.removeListener=function(a,c){if(this.$events&&this.$events[a]){var d=this.$events[a];if(b.util.isArray(d)){var e=-1;for(var f=0,g=d.length;f<g;f++)if(d[f]===c||d[f].listener&&d[f].listener===c){e=f;break}if(e<0)return this;d.splice(e,1),d.length||delete this.$events[a]}else(d===c||d.listener&&d.listener===c)&&delete this.$events[a]}return this},c.prototype.removeAllListeners=function(a){return a===undefined?(this.$events={},this):(this.$events&&this.$events[a]&&(this.$events[a]=null),this)},c.prototype.listeners=function(a){return this.$events||(this.$events={}),this.$events[a]||(this.$events[a]=[]),b.util.isArray(this.$events[a])||(this.$events[a]=[this.$events[a]]),this.$events[a]},c.prototype.emit=function(a){if(!this.$events)return!1;var c=this.$events[a];if(!c)return!1;var d=Array.prototype.slice.call(arguments,1);if("function"==typeof c)c.apply(this,d);else{if(!b.util.isArray(c))return!1;var e=c.slice();for(var f=0,g=e.length;f<g;f++)e[f].apply(this,d)}return!0}}("undefined"!=typeof io?io:module.exports,"undefined"!=typeof io?io:module.parent.exports),function(exports,nativeJSON){function f(a){return a<10?"0"+a:a}function date(a,b){return isFinite(a.valueOf())?a.getUTCFullYear()+"-"+f(a.getUTCMonth()+1)+"-"+f(a.getUTCDate())+"T"+f(a.getUTCHours())+":"+f(a.getUTCMinutes())+":"+f(a.getUTCSeconds())+"Z":null}function quote(a){return escapable.lastIndex=0,escapable.test(a)?'"'+a.replace(escapable,function(a){var b=meta[a];return typeof b=="string"?b:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+a+'"'}function str(a,b){var c,d,e,f,g=gap,h,i=b[a];i instanceof Date&&(i=date(a)),typeof rep=="function"&&(i=rep.call(b,a,i));switch(typeof i){case"string":return quote(i);case"number":return isFinite(i)?String(i):"null";case"boolean":case"null":return String(i);case"object":if(!i)return"null";gap+=indent,h=[];if(Object.prototype.toString.apply(i)==="[object Array]"){f=i.length;for(c=0;c<f;c+=1)h[c]=str(c,i)||"null";return e=h.length===0?"[]":gap?"[\n"+gap+h.join(",\n"+gap)+"\n"+g+"]":"["+h.join(",")+"]",gap=g,e}if(rep&&typeof rep=="object"){f=rep.length;for(c=0;c<f;c+=1)typeof rep[c]=="string"&&(d=rep[c],e=str(d,i),e&&h.push(quote(d)+(gap?": ":":")+e))}else for(d in i)Object.prototype.hasOwnProperty.call(i,d)&&(e=str(d,i),e&&h.push(quote(d)+(gap?": ":":")+e));return e=h.length===0?"{}":gap?"{\n"+gap+h.join(",\n"+gap)+"\n"+g+"}":"{"+h.join(",")+"}",gap=g,e}}"use strict";if(nativeJSON&&nativeJSON.parse)return exports.JSON={parse:nativeJSON.parse,stringify:nativeJSON.stringify};var JSON=exports.JSON={},cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;JSON.stringify=function(a,b,c){var d;gap="",indent="";if(typeof c=="number")for(d=0;d<c;d+=1)indent+=" ";else typeof c=="string"&&(indent=c);rep=b;if(!b||typeof b=="function"||typeof b=="object"&&typeof b.length=="number")return str("",{"":a});throw new Error("JSON.stringify")},JSON.parse=function(text,reviver){function walk(a,b){var c,d,e=a[b];if(e&&typeof e=="object")for(c in e)Object.prototype.hasOwnProperty.call(e,c)&&(d=walk(e,c),d!==undefined?e[c]=d:delete e[c]);return reviver.call(a,b,e)}var j;text=String(text),cx.lastIndex=0,cx.test(text)&&(text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)}));if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,"")))return j=eval("("+text+")"),typeof reviver=="function"?walk({"":j},""):j;throw new SyntaxError("JSON.parse")}}("undefined"!=typeof io?io:module.exports,typeof JSON!="undefined"?JSON:undefined),function(a,b){var c=a.parser={},d=c.packets=["disconnect","connect","heartbeat","message","json","event","ack","error","noop"],e=c.reasons=["transport not supported","client not handshaken","unauthorized"],f=c.advice=["reconnect"],g=b.JSON,h=b.util.indexOf;c.encodePacket=function(a){var b=h(d,a.type),c=a.id||"",i=a.endpoint||"",j=a.ack,k=null;switch(a.type){case"error":var l=a.reason?h(e,a.reason):"",m=a.advice?h(f,a.advice):"";if(l!==""||m!=="")k=l+(m!==""?"+"+m:"");break;case"message":a.data!==""&&(k=a.data);break;case"event":var n={name:a.name};a.args&&a.args.length&&(n.args=a.args),k=g.stringify(n);break;case"json":k=g.stringify(a.data);break;case"connect":a.qs&&(k=a.qs);break;case"ack":k=a.ackId+(a.args&&a.args.length?"+"+g.stringify(a.args):"")}var o=[b,c+(j=="data"?"+":""),i];return k!==null&&k!==undefined&&o.push(k),o.join(":")},c.encodePayload=function(a){var b="";if(a.length==1)return a[0];for(var c=0,d=a.length;c<d;c++){var e=a[c];b+="\ufffd"+e.length+"\ufffd"+a[c]}return b};var i=/([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;c.decodePacket=function(a){var b=a.match(i);if(!b)return{};var c=b[2]||"",a=b[5]||"",h={type:d[b[1]],endpoint:b[4]||""};c&&(h.id=c,b[3]?h.ack="data":h.ack=!0);switch(h.type){case"error":var b=a.split("+");h.reason=e[b[0]]||"",h.advice=f[b[1]]||"";break;case"message":h.data=a||"";break;case"event":try{var j=g.parse(a);h.name=j.name,h.args=j.args}catch(k){}h.args=h.args||[];break;case"json":try{h.data=g.parse(a)}catch(k){}break;case"connect":h.qs=a||"";break;case"ack":var b=a.match(/^([0-9]+)(\+)?(.*)/);if(b){h.ackId=b[1],h.args=[];if(b[3])try{h.args=b[3]?g.parse(b[3]):[]}catch(k){}}break;case"disconnect":case"heartbeat":}return h},c.decodePayload=function(a){if(a.charAt(0)=="\ufffd"){var b=[];for(var d=1,e="";d<a.length;d++)a.charAt(d)=="\ufffd"?(b.push(c.decodePacket(a.substr(d+1).substr(0,e))),d+=Number(e)+1,e=""):e+=a.charAt(d);return b}return[c.decodePacket(a)]}}("undefined"!=typeof io?io:module.exports,"undefined"!=typeof io?io:module.parent.exports),function(a,b){function c(a,b){this.socket=a,this.sessid=b}a.Transport=c,b.util.mixin(c,b.EventEmitter),c.prototype.heartbeats=function(){return!0},c.prototype.onData=function(a){this.clearCloseTimeout(),(this.socket.connected||this.socket.connecting||this.socket.reconnecting)&&this.setCloseTimeout();if(a!==""){var c=b.parser.decodePayload(a);if(c&&c.length)for(var d=0,e=c.length;d<e;d++)this.onPacket(c[d])}return this},c.prototype.onPacket=function(a){return this.socket.setHeartbeatTimeout(),a.type=="heartbeat"?this.onHeartbeat():(a.type=="connect"&&a.endpoint==""&&this.onConnect(),a.type=="error"&&a.advice=="reconnect"&&(this.isOpen=!1),this.socket.onPacket(a),this)},c.prototype.setCloseTimeout=function(){if(!this.closeTimeout){var a=this;this.closeTimeout=setTimeout(function(){a.onDisconnect()},this.socket.closeTimeout)}},c.prototype.onDisconnect=function(){return this.isOpen&&this.close(),this.clearTimeouts(),this.socket.onDisconnect(),this},c.prototype.onConnect=function(){return this.socket.onConnect(),this},c.prototype.clearCloseTimeout=function(){this.closeTimeout&&(clearTimeout(this.closeTimeout),this.closeTimeout=null)},c.prototype.clearTimeouts=function(){this.clearCloseTimeout(),this.reopenTimeout&&clearTimeout(this.reopenTimeout)},c.prototype.packet=function(a){this.send(b.parser.encodePacket(a))},c.prototype.onHeartbeat=function(a){this.packet({type:"heartbeat"})},c.prototype.onOpen=function(){this.isOpen=!0,this.clearCloseTimeout(),this.socket.onOpen()},c.prototype.onClose=function(){var a=this;this.isOpen=!1,this.socket.onClose(),this.onDisconnect()},c.prototype.prepareUrl=function(){var a=this.socket.options;return this.scheme()+"://"+a.host+":"+a.port+"/"+a.resource+"/"+b.protocol+"/"+this.name+"/"+this.sessid},c.prototype.ready=function(a,b){b.call(this)}}("undefined"!=typeof io?io:module.exports,"undefined"!=typeof io?io:module.parent.exports),function(a,b,c){function d(a){this.options={port:80,secure:!1,document:"document"in c?document:!1,resource:"socket.io",transports:b.transports,"connect timeout":1e4,"try multiple transports":!0,reconnect:!0,"reconnection delay":500,"reconnection limit":Infinity,"reopen delay":3e3,"max reconnection attempts":10,"sync disconnect on unload":!1,"auto connect":!0,"flash policy port":10843,manualFlush:!1},b.util.merge(this.options,a),this.connected=!1,this.open=!1,this.connecting=!1,this.reconnecting=!1,this.namespaces={},this.buffer=[],this.doBuffer=!1;if(this.options["sync disconnect on unload"]&&(!this.isXDomain()||b.util.ua.hasCORS)){var d=this;b.util.on(c,"beforeunload",function(){d.disconnectSync()},!1)}this.options["auto connect"]&&this.connect()}function e(){}a.Socket=d,b.util.mixin(d,b.EventEmitter),d.prototype.of=function(a){return this.namespaces[a]||(this.namespaces[a]=new b.SocketNamespace(this,a),a!==""&&this.namespaces[a].packet({type:"connect"})),this.namespaces[a]},d.prototype.publish=function(){this.emit.apply(this,arguments);var a;for(var b in this.namespaces)this.namespaces.hasOwnProperty(b)&&(a=this.of(b),a.$emit.apply(a,arguments))},d.prototype.handshake=function(a){function f(b){b instanceof Error?(c.connecting=!1,c.onError(b.message)):a.apply(null,b.split(":"))}var c=this,d=this.options,g=["http"+(d.secure?"s":"")+":/",d.host+":"+d.port,d.resource,b.protocol,b.util.query(this.options.query,"t="+ +(new Date))].join("/");if(this.isXDomain()&&!b.util.ua.hasCORS){var h=document.getElementsByTagName("script")[0],i=document.createElement("script");i.src=g+"&jsonp="+b.j.length,h.parentNode.insertBefore(i,h),b.j.push(function(a){f(a),i.parentNode.removeChild(i)})}else{var j=b.util.request();j.open("GET",g,!0),this.isXDomain()&&(j.withCredentials=!0),j.onreadystatechange=function(){j.readyState==4&&(j.onreadystatechange=e,j.status==200?f(j.responseText):j.status==403?c.onError(j.responseText):(c.connecting=!1,!c.reconnecting&&c.onError(j.responseText)))},j.send(null)}},d.prototype.getTransport=function(a){var c=a||this.transports,d;for(var e=0,f;f=c[e];e++)if(b.Transport[f]&&b.Transport[f].check(this)&&(!this.isXDomain()||b.Transport[f].xdomainCheck(this)))return new b.Transport[f](this,this.sessionid);return null},d.prototype.connect=function(a){if(this.connecting)return this;var c=this;return c.connecting=!0,this.handshake(function(d,e,f,g){function h(a){c.transport&&c.transport.clearTimeouts(),c.transport=c.getTransport(a);if(!c.transport)return c.publish("connect_failed");c.transport.ready(c,function(){c.connecting=!0,c.publish("connecting",c.transport.name),c.transport.open(),c.options["connect timeout"]&&(c.connectTimeoutTimer=setTimeout(function(){if(!c.connected){c.connecting=!1;if(c.options["try multiple transports"]){var a=c.transports;while(a.length>0&&a.splice(0,1)[0]!=c.transport.name);a.length?h(a):c.publish("connect_failed")}}},c.options["connect timeout"]))})}c.sessionid=d,c.closeTimeout=f*1e3,c.heartbeatTimeout=e*1e3,c.transports||(c.transports=c.origTransports=g?b.util.intersect(g.split(","),c.options.transports):c.options.transports),c.setHeartbeatTimeout(),h(c.transports),c.once("connect",function(){clearTimeout(c.connectTimeoutTimer),a&&typeof a=="function"&&a()})}),this},d.prototype.setHeartbeatTimeout=function(){clearTimeout(this.heartbeatTimeoutTimer);if(this.transport&&!this.transport.heartbeats())return;var a=this;this.heartbeatTimeoutTimer=setTimeout(function(){a.transport.onClose()},this.heartbeatTimeout)},d.prototype.packet=function(a){return this.connected&&!this.doBuffer?this.transport.packet(a):this.buffer.push(a),this},d.prototype.setBuffer=function(a){this.doBuffer=a,!a&&this.connected&&this.buffer.length&&(this.options.manualFlush||this.flushBuffer())},d.prototype.flushBuffer=function(){this.transport.payload(this.buffer),this.buffer=[]},d.prototype.disconnect=function(){if(this.connected||this.connecting)this.open&&this.of("").packet({type:"disconnect"}),this.onDisconnect("booted");return this},d.prototype.disconnectSync=function(){var a=b.util.request(),c=["http"+(this.options.secure?"s":"")+":/",this.options.host+":"+this.options.port,this.options.resource,b.protocol,"",this.sessionid].join("/")+"/?disconnect=1";a.open("GET",c,!1),a.send(null),this.onDisconnect("booted")},d.prototype.isXDomain=function(){var a=c.location.port||("https:"==c.location.protocol?443:80);return this.options.host!==c.location.hostname||this.options.port!=a},d.prototype.onConnect=function(){this.connected||(this.connected=!0,this.connecting=!1,this.doBuffer||this.setBuffer(!1),this.emit("connect"))},d.prototype.onOpen=function(){this.open=!0},d.prototype.onClose=function(){this.open=!1,clearTimeout(this.heartbeatTimeoutTimer)},d.prototype.onPacket=function(a){this.of(a.endpoint).onPacket(a)},d.prototype.onError=function(a){a&&a.advice&&a.advice==="reconnect"&&(this.connected||this.connecting)&&(this.disconnect(),this.options.reconnect&&this.reconnect()),this.publish("error",a&&a.reason?a.reason:a)},d.prototype.onDisconnect=function(a){var b=this.connected,c=this.connecting;this.connected=!1,this.connecting=!1,this.open=!1;if(b||c)this.transport.close(),this.transport.clearTimeouts(),b&&(this.publish("disconnect",a),"booted"!=a&&this.options.reconnect&&!this.reconnecting&&this.reconnect())},d.prototype.reconnect=function(){function e(){if(a.connected){for(var b in a.namespaces)a.namespaces.hasOwnProperty(b)&&""!==b&&a.namespaces[b].packet({type:"connect"});a.publish("reconnect",a.transport.name,a.reconnectionAttempts)}clearTimeout(a.reconnectionTimer),a.removeListener("connect_failed",f),a.removeListener("connect",f),a.reconnecting=!1,delete a.reconnectionAttempts,delete a.reconnectionDelay,delete a.reconnectionTimer,delete a.redoTransports,a.options["try multiple transports"]=c}function f(){if(!a.reconnecting)return;if(a.connected)return e();if(a.connecting&&a.reconnecting)return a.reconnectionTimer=setTimeout(f,1e3);a.reconnectionAttempts++>=b?a.redoTransports?(a.publish("reconnect_failed"),e()):(a.on("connect_failed",f),a.options["try multiple transports"]=!0,a.transports=a.origTransports,a.transport=a.getTransport(),a.redoTransports=!0,a.connect()):(a.reconnectionDelay<d&&(a.reconnectionDelay*=2),a.connect(),a.publish("reconnecting",a.reconnectionDelay,a.reconnectionAttempts),a.reconnectionTimer=setTimeout(f,a.reconnectionDelay))}this.reconnecting=!0,this.reconnectionAttempts=0,this.reconnectionDelay=this.options["reconnection delay"];var a=this,b=this.options["max reconnection attempts"],c=this.options["try multiple transports"],d=this.options["reconnection limit"];this.options["try multiple transports"]=!1,this.reconnectionTimer=setTimeout(f,this.reconnectionDelay),this.on("connect",f)}}("undefined"!=typeof io?io:module.exports,"undefined"!=typeof io?io:module.parent.exports,this),function(a,b){function c(a,b){this.socket=a,this.name=b||"",this.flags={},this.json=new d(this,"json"),this.ackPackets=0,this.acks={}}function d(a,b){this.namespace=a,this.name=b}a.SocketNamespace=c,b.util.mixin(c,b.EventEmitter),c.prototype.$emit=b.EventEmitter.prototype.emit,c.prototype.of=function(){return this.socket.of.apply(this.socket,arguments)},c.prototype.packet=function(a){return a.endpoint=this.name,this.socket.packet(a),this.flags={},this},c.prototype.send=function(a,b){var c={type:this.flags.json?"json":"message",data:a};return"function"==typeof b&&(c.id=++this.ackPackets,c.ack=!0,this.acks[c.id]=b),this.packet(c)},c.prototype.emit=function(a){var b=Array.prototype.slice.call(arguments,1),c=b[b.length-1],d={type:"event",name:a};return"function"==typeof c&&(d.id=++this.ackPackets,d.ack="data",this.acks[d.id]=c,b=b.slice(0,b.length-1)),d.args=b,this.packet(d)},c.prototype.disconnect=function(){return this.name===""?this.socket.disconnect():(this.packet({type:"disconnect"}),this.$emit("disconnect")),this},c.prototype.onPacket=function(a){function d(){c.packet({type:"ack",args:b.util.toArray(arguments),ackId:a.id})}var c=this;switch(a.type){case"connect":this.$emit("connect");break;case"disconnect":this.name===""?this.socket.onDisconnect(a.reason||"booted"):this.$emit("disconnect",a.reason);break;case"message":case"json":var e=["message",a.data];a.ack=="data"?e.push(d):a.ack&&this.packet({type:"ack",ackId:a.id}),this.$emit.apply(this,e);break;case"event":var e=[a.name].concat(a.args);a.ack=="data"&&e.push(d),this.$emit.apply(this,e);break;case"ack":this.acks[a.ackId]&&(this.acks[a.ackId].apply(this,a.args),delete this.acks[a.ackId]);break;case"error":a.advice?this.socket.onError(a):a.reason=="unauthorized"?this.$emit("connect_failed",a.reason):this.$emit("error",a.reason)}},d.prototype.send=function(){this.namespace.flags[this.name]=!0,this.namespace.send.apply(this.namespace,arguments)},d.prototype.emit=function(){this.namespace.flags[this.name]=!0,this.namespace.emit.apply(this.namespace,arguments)}}("undefined"!=typeof io?io:module.exports,"undefined"!=typeof io?io:module.parent.exports),function(a,b,c){function d(a){b.Transport.apply(this,arguments)}a.websocket=d,b.util.inherit(d,b.Transport),d.prototype.name="websocket",d.prototype.open=function(){var a=b.util.query(this.socket.options.query),d=this,e;return e||(e=c.MozWebSocket||c.WebSocket),this.websocket=new e(this.prepareUrl()+a),this.websocket.onopen=function(){d.onOpen(),d.socket.setBuffer(!1)},this.websocket.onmessage=function(a){d.onData(a.data)},this.websocket.onclose=function(){d.onClose(),d.socket.setBuffer(!0)},this.websocket.onerror=function(a){d.onError(a)},this},b.util.ua.iDevice?d.prototype.send=function(a){var b=this;return setTimeout(function(){b.websocket.send(a)},0),this}:d.prototype.send=function(a){return this.websocket.send(a),this},d.prototype.payload=function(a){for(var b=0,c=a.length;b<c;b++)this.packet(a[b]);return this},d.prototype.close=function(){return this.websocket.close(),this},d.prototype.onError=function(a){this.socket.onError(a)},d.prototype.scheme=function(){return this.socket.options.secure?"wss":"ws"},d.check=function(){return"WebSocket"in c&&!("__addTask"in WebSocket)||"MozWebSocket"in c},d.xdomainCheck=function(){return!0},b.transports.push("websocket")}("undefined"!=typeof io?io.Transport:module.exports,"undefined"!=typeof io?io:module.parent.exports,this),function(a,b){function c(){b.Transport.websocket.apply(this,arguments)}a.flashsocket=c,b.util.inherit(c,b.Transport.websocket),c.prototype.name="flashsocket",c.prototype.open=function(){var a=this,c=arguments;return WebSocket.__addTask(function(){b.Transport.websocket.prototype.open.apply(a,c)}),this},c.prototype.send=function(){var a=this,c=arguments;return WebSocket.__addTask(function(){b.Transport.websocket.prototype.send.apply(a,c)}),this},c.prototype.close=function(){return WebSocket.__tasks.length=0,b.Transport.websocket.prototype.close.call(this),this},c.prototype.ready=function(a,d){function e(){var b=a.options,e=b["flash policy port"],g=["http"+(b.secure?"s":"")+":/",b.host+":"+b.port,b.resource,"static/flashsocket","WebSocketMain"+(a.isXDomain()?"Insecure":"")+".swf"];c.loaded||(typeof WEB_SOCKET_SWF_LOCATION=="undefined"&&(WEB_SOCKET_SWF_LOCATION=g.join("/")),e!==843&&WebSocket.loadFlashPolicyFile("xmlsocket://"+b.host+":"+e),WebSocket.__initialize(),c.loaded=!0),d.call(f)}var f=this;if(document.body)return e();b.util.load(e)},c.check=function(){return typeof WebSocket!="undefined"&&"__initialize"in WebSocket&&!!swfobject?swfobject.getFlashPlayerVersion().major>=10:!1},c.xdomainCheck=function(){return!0},typeof window!="undefined"&&(WEB_SOCKET_DISABLE_AUTO_INITIALIZATION=!0),b.transports.push("flashsocket")}("undefined"!=typeof io?io.Transport:module.exports,"undefined"!=typeof io?io:module.parent.exports);if("undefined"!=typeof window)var swfobject=function(){function A(){if(t)return;try{var a=i.getElementsByTagName("body")[0].appendChild(Q("span"));a.parentNode.removeChild(a)}catch(b){return}t=!0;var c=l.length;for(var d=0;d<c;d++)l[d]()}function B(a){t?a():l[l.length]=a}function C(b){if(typeof h.addEventListener!=a)h.addEventListener("load",b,!1);else if(typeof i.addEventListener!=a)i.addEventListener("load",b,!1);else if(typeof h.attachEvent!=a)R(h,"onload",b);else if(typeof h.onload=="function"){var c=h.onload;h.onload=function(){c(),b()}}else h.onload=b}function D(){k?E():F()}function E(){var c=i.getElementsByTagName("body")[0],d=Q(b);d.setAttribute("type",e);var f=c.appendChild(d);if(f){var g=0;(function(){if(typeof f.GetVariable!=a){var b=f.GetVariable("$version");b&&(b=b.split(" ")[1].split(","),y.pv=[parseInt(b[0],10),parseInt(b[1],10),parseInt(b[2],10)])}else if(g<10){g++,setTimeout(arguments.callee,10);return}c.removeChild(d),f=null,F()})()}else F()}function F(){var b=m.length;if(b>0)for(var c=0;c<b;c++){var d=m[c].id,e=m[c].callbackFn,f={success:!1,id:d};if(y.pv[0]>0){var g=P(d);if(g)if(S(m[c].swfVersion)&&!(y.wk&&y.wk<312))U(d,!0),e&&(f.success=!0,f.ref=G(d),e(f));else if(m[c].expressInstall&&H()){var h={};h.data=m[c].expressInstall,h.width=g.getAttribute("width")||"0",h.height=g.getAttribute("height")||"0",g.getAttribute("class")&&(h.styleclass=g.getAttribute("class")),g.getAttribute("align")&&(h.align=g.getAttribute("align"));var i={},j=g.getElementsByTagName("param"),k=j.length;for(var l=0;l<k;l++)j[l].getAttribute("name").toLowerCase()!="movie"&&(i[j[l].getAttribute("name")]=j[l].getAttribute("value"));I(h,i,d,e)}else J(g),e&&e(f)}else{U(d,!0);if(e){var n=G(d);n&&typeof n.SetVariable!=a&&(f.success=!0,f.ref=n),e(f)}}}}function G(c){var d=null,e=P(c);if(e&&e.nodeName=="OBJECT")if(typeof e.SetVariable!=a)d=e;else{var f=e.getElementsByTagName(b)[0];f&&(d=f)}return d}function H(){return!u&&S("6.0.65")&&(y.win||y.mac)&&!(y.wk&&y.wk<312)}function I(b,c,d,e){u=!0,r=e||null,s={success:!1,id:d};var g=P(d);if(g){g.nodeName=="OBJECT"?(p=K(g),q=null):(p=g,q=d),b.id=f;if(typeof b.width==a||!/%$/.test(b.width)&&parseInt(b.width,10)<310)b.width="310";if(typeof b.height==a||!/%$/.test(b.height)&&parseInt(b.height,10)<137)b.height="137";i.title=i.title.slice(0,47)+" - Flash Player Installation";var j=y.ie&&y.win?["Active"].concat("").join("X"):"PlugIn",k="MMredirectURL="+h.location.toString().replace(/&/g,"%26")+"&MMplayerType="+j+"&MMdoctitle="+i.title;typeof c.flashvars!=a?c.flashvars+="&"+k:c.flashvars=k;if(y.ie&&y.win&&g.readyState!=4){var l=Q("div");d+="SWFObjectNew",l.setAttribute("id",d),g.parentNode.insertBefore(l,g),g.style.display="none",function(){g.readyState==4?g.parentNode.removeChild(g):setTimeout(arguments.callee,10)}()}L(b,c,d)}}function J(a){if(y.ie&&y.win&&a.readyState!=4){var b=Q("div");a.parentNode.insertBefore(b,a),b.parentNode.replaceChild(K(a),b),a.style.display="none",function(){a.readyState==4?a.parentNode.removeChild(a):setTimeout(arguments.callee,10)}()}else a.parentNode.replaceChild(K(a),a)}function K(a){var c=Q("div");if(y.win&&y.ie)c.innerHTML=a.innerHTML;else{var d=a.getElementsByTagName(b)[0];if(d){var e=d.childNodes;if(e){var f=e.length;for(var g=0;g<f;g++)(e[g].nodeType!=1||e[g].nodeName!="PARAM")&&e[g].nodeType!=8&&c.appendChild(e[g].cloneNode(!0))}}}return c}function L(c,d,f){var g,h=P(f);if(y.wk&&y.wk<312)return g;if(h){typeof c.id==a&&(c.id=f);if(y.ie&&y.win){var i="";for(var j in c)c[j]!=Object.prototype[j]&&(j.toLowerCase()=="data"?d.movie=c[j]:j.toLowerCase()=="styleclass"?i+=' class="'+c[j]+'"':j.toLowerCase()!="classid"&&(i+=" "+j+'="'+c[j]+'"'));var k="";for(var l in d)d[l]!=Object.prototype[l]&&(k+='<param name="'+l+'" value="'+d[l]+'" />');h.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+i+">"+k+"</object>",n[n.length]=c.id,g=P(c.id)}else{var m=Q(b);m.setAttribute("type",e);for(var o in c)c[o]!=Object.prototype[o]&&(o.toLowerCase()=="styleclass"?m.setAttribute("class",c[o]):o.toLowerCase()!="classid"&&m.setAttribute(o,c[o]));for(var p in d)d[p]!=Object.prototype[p]&&p.toLowerCase()!="movie"&&M(m,p,d[p]);h.parentNode.replaceChild(m,h),g=m}}return g}function M(a,b,c){var d=Q("param");d.setAttribute("name",b),d.setAttribute("value",c),a.appendChild(d)}function N(a){var b=P(a);b&&b.nodeName=="OBJECT"&&(y.ie&&y.win?(b.style.display="none",function(){b.readyState==4?O(a):setTimeout(arguments.callee,10)}()):b.parentNode.removeChild(b))}function O(a){var b=P(a);if(b){for(var c in b)typeof b[c]=="function"&&(b[c]=null);b.parentNode.removeChild(b)}}function P(a){var b=null;try{b=i.getElementById(a)}catch(c){}return b}function Q(a){return i.createElement(a)}function R(a,b,c){a.attachEvent(b,c),o[o.length]=[a,b,c]}function S(a){var b=y.pv,c=a.split(".");return c[0]=parseInt(c[0],10),c[1]=parseInt(c[1],10)||0,c[2]=parseInt(c[2],10)||0,b[0]>c[0]||b[0]==c[0]&&b[1]>c[1]||b[0]==c[0]&&b[1]==c[1]&&b[2]>=c[2]?!0:!1}function T(c,d,e,f){if(y.ie&&y.mac)return;var g=i.getElementsByTagName("head")[0];if(!g)return;var h=e&&typeof e=="string"?e:"screen";f&&(v=null,w=null);if(!v||w!=h){var j=Q("style");j.setAttribute("type","text/css"),j.setAttribute("media",h),v=g.appendChild(j),y.ie&&y.win&&typeof i.styleSheets!=a&&i.styleSheets.length>0&&(v=i.styleSheets[i.styleSheets.length-1]),w=h}y.ie&&y.win?v&&typeof v.addRule==b&&v.addRule(c,d):v&&typeof i.createTextNode!=a&&v.appendChild(i.createTextNode(c+" {"+d+"}"))}function U(a,b){if(!x)return;var c=b?"visible":"hidden";t&&P(a)?P(a).style.visibility=c:T("#"+a,"visibility:"+c)}function V(b){var c=/[\\\"<>\.;]/,d=c.exec(b)!=null;return d&&typeof encodeURIComponent!=a?encodeURIComponent(b):b}var a="undefined",b="object",c="Shockwave Flash",d="ShockwaveFlash.ShockwaveFlash",e="application/x-shockwave-flash",f="SWFObjectExprInst",g="onreadystatechange",h=window,i=document,j=navigator,k=!1,l=[D],m=[],n=[],o=[],p,q,r,s,t=!1,u=!1,v,w,x=!0,y=function(){var f=typeof i.getElementById!=a&&typeof i.getElementsByTagName!=a&&typeof i.createElement!=a,g=j.userAgent.toLowerCase(),l=j.platform.toLowerCase(),m=l?/win/.test(l):/win/.test(g),n=l?/mac/.test(l):/mac/.test(g),o=/webkit/.test(g)?parseFloat(g.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):!1,p=!1,q=[0,0,0],r=null;if(typeof j.plugins!=a&&typeof j.plugins[c]==b)r=j.plugins[c].description,r&&(typeof j.mimeTypes==a||!j.mimeTypes[e]||!!j.mimeTypes[e].enabledPlugin)&&(k=!0,p=!1,r=r.replace(/^.*\s+(\S+\s+\S+$)/,"$1"),q[0]=parseInt(r.replace(/^(.*)\..*$/,"$1"),10),q[1]=parseInt(r.replace(/^.*\.(.*)\s.*$/,"$1"),10),q[2]=/[a-zA-Z]/.test(r)?parseInt(r.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0);else if(typeof h[["Active"].concat("Object").join("X")]!=a)try{var s=new(window[["Active"].concat("Object").join("X")])(d);s&&(r=s.GetVariable("$version"),r&&(p=!0,r=r.split(" ")[1].split(","),q=[parseInt(r[0],10),parseInt(r[1],10),parseInt(r[2],10)]))}catch(t){}return{w3:f,pv:q,wk:o,ie:p,win:m,mac:n}}(),z=function(){if(!y.w3)return;(typeof i.readyState!=a&&i.readyState=="complete"||typeof i.readyState==a&&(i.getElementsByTagName("body")[0]||i.body))&&A(),t||(typeof i.addEventListener!=a&&i.addEventListener("DOMContentLoaded",A,!1),y.ie&&y.win&&(i.attachEvent(g,function(){i.readyState=="complete"&&(i.detachEvent(g,arguments.callee),A())}),h==top&&function(){if(t)return;try{i.documentElement.doScroll("left")}catch(a){setTimeout(arguments.callee,0);return}A()}()),y.wk&&function(){if(t)return;if(!/loaded|complete/.test(i.readyState)){setTimeout(arguments.callee,0);return}A()}(),C(A))}(),W=function(){y.ie&&y.win&&window.attachEvent("onunload",function(){var a=o.length;for(var b=0;b<a;b++)o[b][0].detachEvent(o[b][1],o[b][2]);var c=n.length;for(var d=0;d<c;d++)N(n[d]);for(var e in y)y[e]=null;y=null;for(var f in swfobject)swfobject[f]=null;swfobject=null})}();return{registerObject:function(a,b,c,d){if(y.w3&&a&&b){var e={};e.id=a,e.swfVersion=b,e.expressInstall=c,e.callbackFn=d,m[m.length]=e,U(a,!1)}else d&&d({success:!1,id:a})},getObjectById:function(a){if(y.w3)return G(a)},embedSWF:function(c,d,e,f,g,h,i,j,k,l){var m={success:!1,id:d};y.w3&&!(y.wk&&y.wk<312)&&c&&d&&e&&f&&g?(U(d,!1),B(function(){e+="",f+="";var n={};if(k&&typeof k===b)for(var o in k)n[o]=k[o];n.data=c,n.width=e,n.height=f;var p={};if(j&&typeof j===b)for(var q in j)p[q]=j[q];if(i&&typeof i===b)for(var r in i)typeof p.flashvars!=a?p.flashvars+="&"+r+"="+i[r]:p.flashvars=r+"="+i[r];if(S(g)){var s=L(n,p,d);n.id==d&&U(d,!0),m.success=!0,m.ref=s}else{if(h&&H()){n.data=h,I(n,p,d,l);return}U(d,!0)}l&&l(m)})):l&&l(m)},switchOffAutoHideShow:function(){x=!1},ua:y,getFlashPlayerVersion:function(){return{major:y.pv[0],minor:y.pv[1],release:y.pv[2]}},hasFlashPlayerVersion:S,createSWF:function(a,b,c){return y.w3?L(a,b,c):undefined},showExpressInstall:function(a,b,c,d){y.w3&&H()&&I(a,b,c,d)},removeSWF:function(a){y.w3&&N(a)},createCSS:function(a,b,c,d){y.w3&&T(a,b,c,d)},addDomLoadEvent:B,addLoadEvent:C,getQueryParamValue:function(a){var b=i.location.search||i.location.hash;if(b){/\?/.test(b)&&(b=b.split("?")[1]);if(a==null)return V(b);var c=b.split("&");for(var d=0;d<c.length;d++)if(c[d].substring(0,c[d].indexOf("="))==a)return V(c[d].substring(c[d].indexOf("=")+1))}return""},expressInstallCallback:function(){if(u){var a=P(f);a&&p&&(a.parentNode.replaceChild(p,a),q&&(U(q,!0),y.ie&&y.win&&(p.style.display="block")),r&&r(s)),u=!1}}}}();(function(){if("undefined"==typeof window||window.WebSocket)return;var a=window.console;if(!a||!a.log||!a.error)a={log:function(){},error:function(){}};if(!swfobject.hasFlashPlayerVersion("10.0.0")){a.error("Flash Player >= 10.0.0 is required.");return}location.protocol=="file:"&&a.error("WARNING: web-socket-js doesn't work in file:///... URL unless you set Flash Security Settings properly. Open the page via Web server i.e. http://..."),WebSocket=function(a,b,c,d,e){var f=this;f.__id=WebSocket.__nextId++,WebSocket.__instances[f.__id]=f,f.readyState=WebSocket.CONNECTING,f.bufferedAmount=0,f.__events={},b?typeof b=="string"&&(b=[b]):b=[],setTimeout(function(){WebSocket.__addTask(function(){WebSocket.__flash.create(f.__id,a,b,c||null,d||0,e||null)})},0)},WebSocket.prototype.send=function(a){if(this.readyState==WebSocket.CONNECTING)throw"INVALID_STATE_ERR: Web Socket connection has not been established";var b=WebSocket.__flash.send(this.__id,encodeURIComponent(a));return b<0?!0:(this.bufferedAmount+=b,!1)},WebSocket.prototype.close=function(){if(this.readyState==WebSocket.CLOSED||this.readyState==WebSocket.CLOSING)return;this.readyState=WebSocket.CLOSING,WebSocket.__flash.close(this.__id)},WebSocket.prototype.addEventListener=function(a,b,c){a in this.__events||(this.__events[a]=[]),this.__events[a].push(b)},WebSocket.prototype.removeEventListener=function(a,b,c){if(!(a in this.__events))return;var d=this.__events[a];for(var e=d.length-1;e>=0;--e)if(d[e]===b){d.splice(e,1);break}},WebSocket.prototype.dispatchEvent=function(a){var b=this.__events[a.type]||[];for(var c=0;c<b.length;++c)b[c](a);var d=this["on"+a.type];d&&d(a)},WebSocket.prototype.__handleEvent=function(a){"readyState"in a&&(this.readyState=a.readyState),"protocol"in a&&(this.protocol=a.protocol);var b;if(a.type=="open"||a.type=="error")b=this.__createSimpleEvent(a.type);else if(a.type=="close")b=this.__createSimpleEvent("close");else{if(a.type!="message")throw"unknown event type: "+a.type;var c=decodeURIComponent(a.message);b=this.__createMessageEvent("message",c)}this.dispatchEvent(b)},WebSocket.prototype.__createSimpleEvent=function(a){if(document.createEvent&&window.Event){var b=document.createEvent("Event");return b.initEvent(a,!1,!1),b}return{type:a,bubbles:!1,cancelable:!1}},WebSocket.prototype.__createMessageEvent=function(a,b){if(document.createEvent&&window.MessageEvent&&!window.opera){var c=document.createEvent("MessageEvent");return c.initMessageEvent("message",!1,!1,b,null,null,window,null),c}return{type:a,data:b,bubbles:!1,cancelable:!1}},WebSocket.CONNECTING=0,WebSocket.OPEN=1,WebSocket.CLOSING=2,WebSocket.CLOSED=3,WebSocket.__flash=null,WebSocket.__instances={},WebSocket.__tasks=[],WebSocket.__nextId=0,WebSocket.loadFlashPolicyFile=function(a){WebSocket.__addTask(function(){WebSocket.__flash.loadManualPolicyFile(a)})},WebSocket.__initialize=function(){if(WebSocket.__flash)return;WebSocket.__swfLocation&&(window.WEB_SOCKET_SWF_LOCATION=WebSocket.__swfLocation);if(!window.WEB_SOCKET_SWF_LOCATION){a.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");return}var b=document.createElement("div");b.id="webSocketContainer",b.style.position="absolute",WebSocket.__isFlashLite()?(b.style.left="0px",b.style.top="0px"):(b.style.left="-100px",b.style.top="-100px");var c=document.createElement("div");c.id="webSocketFlash",b.appendChild(c),document.body.appendChild(b),swfobject.embedSWF(WEB_SOCKET_SWF_LOCATION,"webSocketFlash","1","1","10.0.0",null,null,{hasPriority:!0,swliveconnect:!0,allowScriptAccess:"always"},null,function(b){b.success||a.error("[WebSocket] swfobject.embedSWF failed")})},WebSocket.__onFlashInitialized=function(){setTimeout(function(){WebSocket.__flash=document.getElementById("webSocketFlash"),WebSocket.__flash.setCallerUrl(location.href),WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);for(var a=0;a<WebSocket.__tasks.length;++a)WebSocket.__tasks[a]();WebSocket.__tasks=[]},0)},WebSocket.__onFlashEvent=function(){return setTimeout(function(){try{var b=WebSocket.__flash.receiveEvents();for(var c=0;c<b.length;++c)WebSocket.__instances[b[c].webSocketId].__handleEvent(b[c])}catch(d){a.error(d)}},0),!0},WebSocket.__log=function(b){a.log(decodeURIComponent(b))},WebSocket.__error=function(b){a.error(decodeURIComponent(b))},WebSocket.__addTask=function(a){WebSocket.__flash?a():WebSocket.__tasks.push(a)},WebSocket.__isFlashLite=function(){if(!window.navigator||!window.navigator.mimeTypes)return!1;var a=window.navigator.mimeTypes["application/x-shockwave-flash"];return!a||!a.enabledPlugin||!a.enabledPlugin.filename?!1:a.enabledPlugin.filename.match(/flashlite/i)?!0:!1},window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION||(window.addEventListener?window.addEventListener("load",function(){WebSocket.__initialize()},!1):window.attachEvent("onload",function(){WebSocket.__initialize()}))})(),function(a,b,c){function d(a){if(!a)return;b.Transport.apply(this,arguments),this.sendBuffer=[]}function e(){}a.XHR=d,b.util.inherit(d,b.Transport),d.prototype.open=function(){return this.socket.setBuffer(!1),this.onOpen(),this.get(),this.setCloseTimeout(),this},d.prototype.payload=function(a){var c=[];for(var d=0,e=a.length;d<e;d++)c.push(b.parser.encodePacket(a[d]));this.send(b.parser.encodePayload(c))},d.prototype.send=function(a){return this.post(a),this},d.prototype.post=function(a){function d(){this.readyState==4&&(this.onreadystatechange=e,b.posting=!1,this.status==200?b.socket.setBuffer(!1):b.onClose())}function f(){this.onload=e,b.socket.setBuffer(!1)}var b=this;this.socket.setBuffer(!0),this.sendXHR=this.request("POST"),c.XDomainRequest&&this.sendXHR instanceof XDomainRequest?this.sendXHR.onload=this.sendXHR.onerror=f:this.sendXHR.onreadystatechange=d,this.sendXHR.send(a)},d.prototype.close=function(){return this.onClose(),this},d.prototype.request=function(a){var c=b.util.request(this.socket.isXDomain()),d=b.util.query(this.socket.options.query,"t="+ +(new Date));c.open(a||"GET",this.prepareUrl()+d,!0);if(a=="POST")try{c.setRequestHeader?c.setRequestHeader("Content-type","text/plain;charset=UTF-8"):c.contentType="text/plain"}catch(e){}return c},d.prototype.scheme=function(){return this.socket.options.secure?"https":"http"},d.check=function(a,d){try{var e=b.util.request(d),f=c.XDomainRequest&&e instanceof XDomainRequest,g=a&&a.options&&a.options.secure?"https:":"http:",h=c.location&&g!=c.location.protocol;if(e&&(!f||!h))return!0}catch(i){}return!1},d.xdomainCheck=function(a){return d.check(a,!0)}}("undefined"!=typeof io?io.Transport:module.exports,"undefined"!=typeof io?io:module.parent.exports,this),function(a,b){function c(a){b.Transport.XHR.apply(this,arguments)}a.htmlfile=c,b.util.inherit(c,b.Transport.XHR),c.prototype.name="htmlfile",c.prototype.get=function(){this.doc=new(window[["Active"].concat("Object").join("X")])("htmlfile"),this.doc.open(),this.doc.write("<html></html>"),this.doc.close(),this.doc.parentWindow.s=this;var a=this.doc.createElement("div");a.className="socketio",this.doc.body.appendChild(a),this.iframe=this.doc.createElement("iframe"),a.appendChild(this.iframe);var c=this,d=b.util.query(this.socket.options.query,"t="+ +(new Date));this.iframe.src=this.prepareUrl()+d,b.util.on(window,"unload",function(){c.destroy()})},c.prototype._=function(a,b){this.onData(a);try{var c=b.getElementsByTagName("script")[0];c.parentNode.removeChild(c)}catch(d){}},c.prototype.destroy=function(){if(this.iframe){try{this.iframe.src="about:blank"}catch(a){}this.doc=null,this.iframe.parentNode.removeChild(this.iframe),this.iframe=null,CollectGarbage()}},c.prototype.close=function(){return this.destroy(),b.Transport.XHR.prototype.close.call(this)},c.check=function(a){if(typeof window!="undefined"&&["Active"].concat("Object").join("X")in window)try{var c=new(window[["Active"].concat("Object").join("X")])("htmlfile");return c&&b.Transport.XHR.check(a)}catch(d){}return!1},c.xdomainCheck=function(){return!1},b.transports.push("htmlfile")}("undefined"!=typeof io?io.Transport:module.exports,"undefined"!=typeof io?io:module.parent.exports),function(a,b,c){function d(){b.Transport.XHR.apply(this,arguments)}function e(){}a["xhr-polling"]=d,b.util.inherit(d,b.Transport.XHR),b.util.merge(d,b.Transport.XHR),d.prototype.name="xhr-polling",d.prototype.heartbeats=function(){return!1},d.prototype.open=function(){var a=this;return b.Transport.XHR.prototype.open.call(a),!1},d.prototype.get=function(){function b(){this.readyState==4&&(this.onreadystatechange=e,this.status==200?(a.onData(this.responseText),a.get()):a.onClose())}function d(){this.onload=e,this.onerror=e,a.retryCounter=1,a.onData(this.responseText),a.get()}function f(){a.retryCounter++,!a.retryCounter||a.retryCounter>3?a.onClose():a.get()}if(!this.isOpen)return;var a=this;this.xhr=this.request(),c.XDomainRequest&&this.xhr instanceof XDomainRequest?(this.xhr.onload=d,this.xhr.onerror=f):this.xhr.onreadystatechange=b,this.xhr.send(null)},d.prototype.onClose=function(){b.Transport.XHR.prototype.onClose.call(this);if(this.xhr){this.xhr.onreadystatechange=this.xhr.onload=this.xhr.onerror=e;try{this.xhr.abort()}catch(a){}this.xhr=null}},d.prototype.ready=function(a,c){var d=this;b.util.defer(function(){c.call(d)})},b.transports.push("xhr-polling")}("undefined"!=typeof io?io.Transport:module.exports,"undefined"!=typeof io?io:module.parent.exports,this),function(a,b,c){function e(a){b.Transport["xhr-polling"].apply(this,arguments),this.index=b.j.length;var c=this;b.j.push(function(a){c._(a)})}var d=c.document&&"MozAppearance"in c.document.documentElement.style;a["jsonp-polling"]=e,b.util.inherit(e,b.Transport["xhr-polling"]),e.prototype.name="jsonp-polling",e.prototype.post=function(a){function i(){j(),c.socket.setBuffer(!1)}function j(){c.iframe&&c.form.removeChild(c.iframe);try{h=document.createElement('<iframe name="'+c.iframeId+'">')}catch(a){h=document.createElement("iframe"),h.name=c.iframeId}h.id=c.iframeId,c.form.appendChild(h),c.iframe=h}var c=this,d=b.util.query(this.socket.options.query,"t="+ +(new Date)+"&i="+this.index);if(!this.form){var e=document.createElement("form"),f=document.createElement("textarea"),g=this.iframeId="socketio_iframe_"+this.index,h;e.className="socketio",e.style.position="absolute",e.style.top="0px",e.style.left="0px",e.style.display="none",e.target=g,e.method="POST",e.setAttribute("accept-charset","utf-8"),f.name="d",e.appendChild(f),document.body.appendChild(e),this.form=e,this.area=f}this.form.action=this.prepareUrl()+d,j(),this.area.value=b.JSON.stringify(a);try{this.form.submit()}catch(k){}this.iframe.attachEvent?h.onreadystatechange=function(){c.iframe.readyState=="complete"&&i()}:this.iframe.onload=i,this.socket.setBuffer(!0)},e.prototype.get=function(){var a=this,c=document.createElement("script"),e=b.util.query(this.socket.options.query,"t="+ +(new Date)+"&i="+this.index);this.script&&(this.script.parentNode.removeChild(this.script),this.script=null),c.async=!0,c.src=this.prepareUrl()+e,c.onerror=function(){a.onClose()};var f=document.getElementsByTagName("script")[0];f.parentNode.insertBefore(c,f),this.script=c,d&&setTimeout(function(){var a=document.createElement("iframe");document.body.appendChild(a),document.body.removeChild(a)},100)},e.prototype._=function(a){return this.onData(a),this.isOpen&&this.get(),this},e.prototype.ready=function(a,c){var e=this;if(!d)return c.call(this);b.util.load(function(){c.call(e)})},e.check=function(){return"document"in c},e.xdomainCheck=function(){return!0},b.transports.push("jsonp-polling")}("undefined"!=typeof io?io.Transport:module.exports,"undefined"!=typeof io?io:module.parent.exports,this),typeof define=="function"&&define.amd&&define([],function(){return io})})()
},{}],3:[function(require,module,exports){
'use strict';

var _ = require('underscore');
var player = null;

var KEY = 'player';

function load() {
  player = JSON.parse(window.localStorage.getItem(KEY) || '{}');
}

function save() {
  window.localStorage.setItem(KEY, JSON.stringify(player));
}

exports.get = function() {
  if (!player) {
    load();
  }
  return player;
};

exports.set = function(attrs) {
  player = _.extend(player || {}, attrs);
  save();
};

exports.reset = function() {
  player = null;
  window.localStorage.removeItem(KEY);
};
},{"underscore":14}],14:[function(require,module,exports){
(function(){//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

})()
},{}],4:[function(require,module,exports){
'use strict';

var routie = require('../../../3rdparty/routie');
var player = require('../player');
var _ = require('underscore');
var view = require('../../views/register-simple.hbs');

function go(data) {
  player.set({
    id: data.id,
    name: data.name
  });
  routie.navigate('/wait');
}

function error(res) {
  alert('Error: ' + res);
}

function validate(data){
  return _.every(data, function(field){
    return field[2];
  });
}

function mapData(data){
  return _.inject(data, function(memo, control, key){
    var isInvalid = control.val() === '' || control.val() === 'Select Country' || control.val() === 'Select Role';
    memo[key] = [control, control.val(), !isInvalid];
    return memo;
  }, {});
}

function giveFeedback(data){
  _.each(data, function(field){
    field[0].parent().removeClass('error');
    if (field[2] === false){
      field[0].parent().addClass('error');
      field[0].parent().get(0).scrollIntoView();
    }
  });
}

function register(e) {
  e.preventDefault();

  var data = {
    firstName:    $('#firstName'),
    lastName:     $('#lastName'),
    company:      $('#company'),
    country:      $('#country'),
    role:         $('#role'),
    email:        $('#email')
  };

  var mappedData = mapData(data);
  var dataIsValid = validate(mappedData);

  if (dataIsValid){
    var formData = _.inject(mappedData, function(m, field, key){ m[key] = field[1]; return m; }, {});
    console.log('FIELDS', formData);
    
    $.ajax({
      type: 'POST',
      url: '/player',
      data: JSON.stringify(formData),
      dataType: 'json',
      contentType: 'application/json; charset=utf-8'
    }).then(go).fail(error);
  
  }
  else {
    giveFeedback(mappedData);
  }
}

module.exports = function() {
  
  if (player.get().id) {
    return routie.navigate('/wait');
  }
  
  $('#page').attr('class', 'register');
  $('#page').html(view());
  
  $('button').on('click', register);
  
};

},{"../../views/register-simple.hbs":15,"../../../3rdparty/routie":2,"../player":3,"underscore":14}],5:[function(require,module,exports){
'use strict';

var rx = require('rxjs');
var routie = require('../../../3rdparty/routie');
var player = require('../player');
var view = require('../../views/wait.hbs');
require('../../../3rdparty/rx.zepto');

function observableLobby() {
  return $.getJSONAsObservable('/game/status');
}

function gameInProgress(res) {
  return res.data.inProgress === true;
}

function switchState() {
  routie.navigate('/join');
}

function onError() {
  console.log('Game not responding');
}

module.exports = function() {
  
  if (player.get().id === undefined) {
    routie.navigate('/connect');
  }
  
  $('#page').attr('class', 'wait');
  $('#page').html(view());

  rx.Observable
    .interval(3000)
    .startWith(-1)
    .selectMany(observableLobby)
    .skipWhile(gameInProgress)
    .take(1)
    .subscribe(switchState, onError);
};
},{"../../views/wait.hbs":16,"../../../3rdparty/routie":2,"../player":3,"../../../3rdparty/rx.zepto":17,"rxjs":18}],7:[function(require,module,exports){
'use strict';

var rx = require('rxjs');
var routie = require('../../../3rdparty/routie');
var player = require('../player');
var view = require('../../views/lobby.hbs');
require('../../../3rdparty/rx.zepto');

function observableLobby() {
  return $.getJSONAsObservable('/game/status');
}

function waitingForOtherPlayer(res) {
  return res.data.inProgress === false;
}

function startMatch() {
  routie.navigate('/gamepad');
}

function onError() {
  console.log('Game not responding');
}

function backToWait() {
  routie.navigate('/wait');
}

function exitLobby() {
  $.ajax({
    type: 'DELETE',
    url: '/game/players/' + player.get().id
  }).then(backToWait);
}

module.exports = function() {
  
  if (player.get().id === undefined) {
    routie.navigate('/connect');
  }
  
  $('#page').attr('class', 'lobby');
  $('#page').html(view());
  $('#cancel').on('click', exitLobby);

  rx.Observable
    .interval(1000)
    .startWith(-1)
    .selectMany(observableLobby)
    .skipWhile(waitingForOtherPlayer)
    .take(1)
    .subscribe(startMatch, onError);

};
},{"../../views/lobby.hbs":19,"../../../3rdparty/routie":2,"../player":3,"../../../3rdparty/rx.zepto":17,"rxjs":18}],8:[function(require,module,exports){
'use strict';

var rx = require('rxjs');
var config = require('../../../../config');
var routie = require('../../../3rdparty/routie');
var player = require('../player');
var view = require('../../views/gamepad.hbs');
var io = require('../../../3rdparty/socket.io.min');
var observable = null;
var socket = null;

function sendAction(actionName) {
  socket.emit('move', { player: player.get().id, action: actionName });
}

function goUp(e) {
  e.preventDefault();
  $(e.currentTarget).addClass('pressed');
  sendAction('up');
}

function goDown(e) {
  e.preventDefault();
  $(e.currentTarget).addClass('pressed');
  sendAction('down');
}

function stop(e) {
  e.preventDefault();
  $(e.currentTarget).removeClass('pressed');
}

function observableGame() {
  return $.getJSONAsObservable('/game/status');
}

function currentPlayerIndex(players) {
  if (players[0].id === player.get().id) { return 0; }
  if (players[1].id === player.get().id) { return 1; }
  return null;
}

function checkGameStatus(res) {
  if (res.data.inProgress) {
    var idx = currentPlayerIndex(res.data.players);
    if (idx === null) {
      observable.dispose();
      routie.navigate('/wait');
    } else {
      $('#page .player').addClass('p' + (idx+1));
    }
  } else {
    observable.dispose();
    if (config.ask_about_social_networking === true) {
      routie.navigate('/thanks');
    }
    else {
      routie.navigate('/join');
    }
  }
}

function onError() {
  console.log('Game not responding');
}

module.exports = function() {

  if (player.get().id === undefined) {
    routie.navigate('/connect');
  }

  socket = io.connect('/');
  
  $('#page').attr('class', 'gamepad');
  $('#page').html(view());

  $('.device').height(screen.height - 90);

  observable = rx.Observable
    .interval(2000)
    .startWith(-1)
    .selectMany(observableGame)
    .subscribe(checkGameStatus, onError);

  if ('ontouchstart' in window) {
    $('.up').on('touchstart', goUp);
    $('.up').on('touchend', stop);
    $('.down').on('touchstart', goDown);
    $('.down').on('touchend', stop);
  } else {
    $('.up').on('mousedown', goUp);
    $('.up').on('mouseup', stop);
    $('.down').on('mousedown', goDown);
    $('.down').on('mouseup', stop);
  }
};

},{"../../views/gamepad.hbs":20,"../../../../config":12,"../../../3rdparty/routie":2,"../player":3,"../../../3rdparty/socket.io.min":13,"rxjs":18}],17:[function(require,module,exports){
(function(){// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.
(function (root, factory) {
    module.exports = factory(root, module.exports, require('rxjs'), $);
}(this, function (global, exp, root, $, undefined) {
        // Headers
    var root = global.Rx,
        observable = root.Observable,
        observableProto = observable.prototype,
        AsyncSubject = root.AsyncSubject,
        observableCreate = observable.create,
        observableCreateWithDisposable = observable.createWithDisposable,
        disposableEmpty = root.Disposable.empty,
        slice = Array.prototype.slice,
        proto = $.fn;
        
    $.Deferred.prototype.toObservable = function () {
        var subject = new AsyncSubject();
        this.done(function () {
            subject.onNext(slice.call(arguments));
            subject.onCompleted();
        }).fail(function () {
            subject.onError(slice.call(arguments));
        });
        return subject;
    };

    observableProto.toDeferred = function () {
        var deferred = $.Deferred();
        this.subscribe(function (value) {
            deferred.resolve(value);
        }, function (e) { 
            deferred.reject(e);
        });
        return deferred;
    };

    var ajaxAsObservable = $.ajaxAsObservable = function(settings) {
        var subject = new AsyncSubject();

        var internalSettings = {
            success: function(data, textStatus, jqXHR) {
                subject.onNext({ data: data, textStatus: textStatus, jqXHR: jqXHR });
                subject.onCompleted();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                subject.onError({ jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown });
            }
        };
        
        $.extend(true, internalSettings, settings);

        $.ajax(internalSettings);

        return subject;
    };

    $.getAsObservable = function(url, data, dataType) {
        return ajaxAsObservable({ url: url, dataType: dataType, data: data });
    };

    $.getJSONAsObservable = function(url, data) {
        return ajaxAsObservable({ url: url, dataType: 'json', data: data });
    };


    $.postAsObservable = function(url, data, dataType) {
        return ajaxAsObservable({ url: url, dataType: dataType, data: data, type: 'POST'});	
    };

    return root;

}));

})()
},{"rxjs":18}],15:[function(require,module,exports){
var Handlebars = require('handlebars-runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "\n<h1>Register To Play</h1>\n\n<form>\n  \n  <div class=\"field\">\n    <label>\n    	First name\n    	<span class=\"required\">*</span>\n    </label>\n    <input id=\"firstName\" type=\"text\" value=\"\" autocorrect=\"off\" />\n  </div>\n  \n  <div class=\"field\">\n    <label>\n   		 Last name\n   	 	<span class=\"required\">*</span>\n    </label>\n    <input id=\"lastName\" type=\"text\" value=\"\" autocorrect=\"off\" />\n  </div>\n\n  <div class=\"field\">\n    <label>\n    	Email\n    	<span class=\"required\">*</span>\n    </label>\n    <input id=\"email\" type=\"email\" value=\"\" autocorrect=\"off\" />\n  </div>\n  \n  <button>Play!</button>\n</form>\n";
  });

},{"handlebars-runtime":21}],16:[function(require,module,exports){
var Handlebars = require('handlebars-runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "\n<h1>match in progress</h1>\n\n<div class='wait-message'>\n	<p>\n	  As soon as the current match is finished,\n	  you'll be able to join the action!\n	</p>\n</div>";
  });

},{"handlebars-runtime":21}],10:[function(require,module,exports){
var Handlebars = require('handlebars-runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "\n<h1>Press start to join the game</h1>\n\n<button id=\"join\" ontouchstart=\"\">Start</button>\n";
  });

},{"handlebars-runtime":21}],19:[function(require,module,exports){
var Handlebars = require('handlebars-runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "\n<h1>waiting for 2nd player</h1>\n\n<button id=\"cancel\" ontouchstart=\"\">cancel</button>\n";
  });

},{"handlebars-runtime":21}],20:[function(require,module,exports){
var Handlebars = require('handlebars-runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"player\">\n\n<div class=\"device-background\"></div>\n \n  <div class=\"device clearfix\">\n    <div class=\"controller clearfix\">\n      <div class=\"button\">\n        <div class=\"up\"><i class=\"icon-caret-up\"></i></div>\n      </div>\n      <div class=\"button\">\n        <div class=\"down\"><i class=\"icon-caret-down\"></i></div>\n      </div>\n    </div>\n  </div>\n\n</div>\n\n";
  });

},{"handlebars-runtime":21}],11:[function(require,module,exports){
var Handlebars = require('handlebars-runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "\n<h1>thanks for playing!</h1>\n<p class=\"twitter-teaser\">\n	Tweet your score and ThoughtWorks will donate $1 to [CAUSE].\n</p>\n<p>\n	<a href=\"https://twitter.com/intent/tweet?button_hashtag="
    + escapeExpression(((stack1 = ((stack1 = depth0.twitter),stack1 == null || stack1 === false ? stack1 : stack1.hashtag)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "&text="
    + escapeExpression(((stack1 = ((stack1 = depth0.twitter),stack1 == null || stack1 === false ? stack1 : stack1.message)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"twitter-hashtag-button\" data-size=\"large\" data-related=\"ThoughtWorks\">Tweet "
    + escapeExpression(((stack1 = ((stack1 = depth0.twitter),stack1 == null || stack1 === false ? stack1 : stack1.hashtag)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</a>\n\n	<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>\n</p>\n<p>\n  be sure to ask about what we do&hellip; and how we built this game\n</p>\n<p>\nThoughtWorks is a software company and community of passionate individuals whose purpose is to revolutionise software design, creation and delivery, while advocating for positive social change.\n</p>\n\n<button id=\"done\">I'm Done</button>";
  return buffer;
  });

},{"handlebars-runtime":21}],21:[function(require,module,exports){
/*

Copyright (C) 2011 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

// lib/handlebars/browser-prefix.js
var Handlebars = {};
module.exports = Handlebars;

(function(Handlebars, undefined) {
;
// lib/handlebars/base.js

Handlebars.VERSION = "1.0.0";
Handlebars.COMPILER_REVISION = 4;

Handlebars.REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};

Handlebars.helpers  = {};
Handlebars.partials = {};

var toString = Object.prototype.toString,
    functionType = '[object Function]',
    objectType = '[object Object]';

Handlebars.registerHelper = function(name, fn, inverse) {
  if (toString.call(name) === objectType) {
    if (inverse || fn) { throw new Handlebars.Exception('Arg not supported with multiple helpers'); }
    Handlebars.Utils.extend(this.helpers, name);
  } else {
    if (inverse) { fn.not = inverse; }
    this.helpers[name] = fn;
  }
};

Handlebars.registerPartial = function(name, str) {
  if (toString.call(name) === objectType) {
    Handlebars.Utils.extend(this.partials,  name);
  } else {
    this.partials[name] = str;
  }
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Missing helper: '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;

  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  methodMap: {0: 'debug', 1: 'info', 2: 'warn', 3: 'error'},

  // can be overridden in the host environment
  log: function(level, obj) {
    if (Handlebars.logger.level <= level) {
      var method = Handlebars.logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};

Handlebars.log = function(level, obj) { Handlebars.logger.log(level, obj); };

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
        ret = ret + fn(context[i], { data: data });
      }
    } else {
      for(var key in context) {
        if(context.hasOwnProperty(key)) {
          if(data) { data.key = key; }
          ret = ret + fn(context[key], {data: data});
          i++;
        }
      }
    }
  }

  if(i === 0){
    ret = inverse(this);
  }

  return ret;
});

Handlebars.registerHelper('if', function(conditional, options) {
  var type = toString.call(conditional);
  if(type === functionType) { conditional = conditional.call(this); }

  if(!conditional || Handlebars.Utils.isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
  return Handlebars.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
});

Handlebars.registerHelper('with', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (!Handlebars.Utils.isEmpty(context)) return options.fn(context);
});

Handlebars.registerHelper('log', function(context, options) {
  var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
  Handlebars.log(level, context);
});
;
// lib/handlebars/utils.js

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

var escapeChar = function(chr) {
  return escape[chr] || "&amp;";
};

Handlebars.Utils = {
  extend: function(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  },

  escapeExpression: function(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof Handlebars.SafeString) {
      return string.toString();
    } else if (string == null || string === false) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = string.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  },

  isEmpty: function(value) {
    if (!value && value !== 0) {
      return true;
    } else if(toString.call(value) === "[object Array]" && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }
};
;
// lib/handlebars/runtime.js

Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          Handlebars.Utils.extend(ret, common);
          Handlebars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var result = templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);

      var compilerInfo = container.compilerInfo || [],
          compilerRevision = compilerInfo[0] || 1,
          currentRevision = Handlebars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = Handlebars.REVISION_CHANGES[currentRevision],
              compilerVersions = Handlebars.REVISION_CHANGES[compilerRevision];
          throw "Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").";
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw "Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").";
        }
      }

      return result;
    };
  },

  programWithDepth: function(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var program = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    program.program = i;
    program.depth = args.length;
    return program;
  },
  program: function(i, fn, data) {
    var program = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    program.program = i;
    program.depth = 0;
    return program;
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;
;
// lib/handlebars/browser-suffix.js
})(Handlebars);
;

},{}],18:[function(require,module,exports){
(function(global){require("./rx.min.js")(global);
require("./rx.aggregates.min.js")(global);
require("./rx.coincidence.min.js")(global);
require("./rx.joinpatterns.min.js")(global);
require("./rx.time.min.js")(global);

module.exports = Rx

})(window)
},{"./rx.min.js":22,"./rx.aggregates.min.js":23,"./rx.coincidence.min.js":24,"./rx.joinpatterns.min.js":25,"./rx.time.min.js":26}],23:[function(require,module,exports){
/*
 Copyright (c) Microsoft Corporation.  All rights reserved.
 This code is licensed by Microsoft Corporation under the terms
 of the MICROSOFT REACTIVE EXTENSIONS FOR JAVASCRIPT AND .NET LIBRARIES License.
 See http://go.microsoft.com/fwlink/?LinkID=220762.
*/
module.exports = function(k,t){var l;l=k.Rx;var n=l.Observable,d=n.prototype,m=n.createWithDisposable,u=l.CompositeDisposable,o=function(a,b){return a===b},p=function(a){return a},q=function(a,b){return a>b?1:a===b?0:-1},r=function(a,b,d){return m(function(c){var f=!1,g=null,h=[];return a.subscribe(function(a){var e,i;try{i=b(a)}catch(v){c.onError(v);return}e=0;if(f)try{e=d(i,g)}catch(w){c.onError(w);return}else f=!0,g=
i;0<e&&(g=i,h=[]);0<=e&&h.push(a)},function(a){c.onError(a)},function(){c.onNext(h);c.onCompleted()})})};d.aggregate=function(a,b){return this.scan(a,b).startWith(a).finalValue()};d.aggregate1=function(a){return this.scan1(a).finalValue()};d.any=function(a){var b=this;return a!==t?b.where(a).any():m(function(a){return b.subscribe(function(){a.onNext(!0);a.onCompleted()},function(b){a.onError(b)},function(){a.onNext(!1);a.onCompleted()})})};d.all=function(a){return this.where(function(b){return!a(b)}).any().select(function(a){return!a})};
d.contains=function(a,b){b||(b=o);return this.where(function(d){return b(d,a)}).any()};d.count=function(){return this.aggregate(0,function(a){return a+1})};d.sum=function(){return this.aggregate(0,function(a,b){return a+b})};d.minBy=function(a,b){b||(b=q);return r(this,a,function(a,c){return-1*b(a,c)})};var s=function(a){if(0==a.length)throw Error("Sequence contains no elements.");return a[0]};d.min=function(a){return this.minBy(p,a).select(function(a){return s(a)})};d.maxBy=function(a,b){b||(b=q);
return r(this,a,b)};d.max=function(a){return this.maxBy(p,a).select(function(a){return s(a)})};d.average=function(){return this.scan({sum:0,count:0},function(a,b){return{sum:a.sum+b,count:a.count+1}}).finalValue().select(function(a){return a.sum/a.count})};d.sequenceEqual=function(a,b){var d=this;b||(b=o);return m(function(c){var f=!1,g=!1,h=[],j=[],e=d.subscribe(function(a){var d,f;if(0<j.length){f=j.shift();try{d=b(f,a)}catch(e){c.onError(e);return}d||(c.onNext(!1),c.onCompleted())}else g?(c.onNext(!1),
c.onCompleted()):h.push(a)},function(a){c.onError(a)},function(){f=!0;0===h.length&&(0<j.length?(c.onNext(!1),c.onCompleted()):g&&(c.onNext(!0),c.onCompleted()))}),i=a.subscribe(function(a){var d,e;if(0<h.length){e=h.shift();try{d=b(e,a)}catch(g){c.onError(g);return}d||(c.onNext(!1),c.onCompleted())}else f?(c.onNext(!1),c.onCompleted()):j.push(a)},function(a){c.onError(a)},function(){g=!0;0===j.length&&(0<h.length?(c.onNext(!1),c.onCompleted()):f&&(c.onNext(!0),c.onCompleted()))});return new u(e,
i)})}};

},{}],22:[function(require,module,exports){
/*
 Copyright (c) Microsoft Corporation.  All rights reserved.
 This code is licensed by Microsoft Corporation under the terms
 of the MICROSOFT REACTIVE EXTENSIONS FOR JAVASCRIPT AND .NET LIBRARIES License.
 See http://go.microsoft.com/fwlink/?LinkID=220762.
*/
module.exports = function(x,n){var m,ia=function(){},J=function(){return(new Date).getTime()},V=function(a,b){return a===b},Q=function(a){return a},W=function(a){return a.toString()},X=Object.prototype.hasOwnProperty,o=function(a,b){function c(){this.constructor=a}for(var d in b)X.call(b,d)&&(a[d]=b[d]);c.prototype=b.prototype;a.prototype=new c;a.base=b.prototype;return a},E=function(a,b){for(var c in b)X.call(b,c)&&(a[c]=b[c])},y=Array.prototype.slice,K="Object has been disposed";m=x.Rx={Internals:{}};m.VERSION="1.0.10621";var ja=function(a,b){return i(function(c){return new p(b.getDisposable(),a.subscribe(c))})},F=function(a,b,c){return i(function(d){var e=new v,g=new v,d=c(d,e,g);e.disposable(a.materialize().select(function(b){return{switchValue:function(a){return a(b)}}}).subscribe(d));g.disposable(b.materialize().select(function(b){return{switchValue:function(a,c){return c(b)}}}).subscribe(d));return new p(e,g)})},u=m.Internals.List=
function(){function a(b){this.comparer=b||V;this.size=0;this.items=[]}a.fromArray=function(b,c){var d,e=b.length,g=new a(c);for(d=0;d<e;d++)g.add(b[d]);return g};a.prototype.count=function(){return this.size};a.prototype.add=function(b){this.items[this.size]=b;this.size++};a.prototype.removeAt=function(b){if(0>b||b>=this.size)throw Error("Argument out of range");0===b?this.items.shift():this.items.splice(b,1);this.size--};a.prototype.indexOf=function(b){var a,d;for(a=0;a<this.items.length;a++)if(d=
this.items[a],this.comparer(b,d))return a;return-1};a.prototype.remove=function(b){b=this.indexOf(b);if(-1===b)return!1;this.removeAt(b);return!0};a.prototype.clear=function(){this.items=[];this.size=0};a.prototype.item=function(b,a){if(0>b||b>=count)throw Error("Argument out of range");if(a===n)return this.items[b];this.items[b]=a};a.prototype.toArray=function(){var b=[],a;for(a=0;a<this.items.length;a++)b.push(this.items[a]);return b};a.prototype.contains=function(b){for(var a=0;a<this.items.length;a++)if(this.comparer(b,
this.items[a]))return!0;return!1};return a}(),ka=function(){function a(b,a){this.id=b;this.value=a}a.prototype.compareTo=function(b){var a=this.value.compareTo(b.value);0===a&&(a=this.id-b.id);return a};return a}(),Y=function(){function a(b){this.items=Array(b);this.size=0}a.prototype.count=function(){return this.size};a.prototype.isHigherPriority=function(b,a){return 0>this.items[b].compareTo(this.items[a])};a.prototype.percolate=function(b){var a,d;if(!(b>=this.size||0>b))if(a=Math.floor((b-1)/
2),!(0>a||a===b)&&this.isHigherPriority(b,a))d=this.items[b],this.items[b]=this.items[a],this.items[a]=d,this.percolate(a)};a.prototype.heapify=function(b){var a,d,e;b===n&&(b=0);b>=this.size||0>b||(d=2*b+1,e=2*b+2,a=b,d<this.size&&this.isHigherPriority(d,a)&&(a=d),e<this.size&&this.isHigherPriority(e,a)&&(a=e),a!==b&&(d=this.items[b],this.items[b]=this.items[a],this.items[a]=d,this.heapify(a)))};a.prototype.peek=function(){return this.items[0].value};a.prototype.removeAt=function(b){this.items[b]=
this.items[--this.size];delete this.items[this.size];this.heapify();if(this.size<this.items.length>>2)for(var b=this.items,a=this.items=Array(this.items.length>>1),d=this.size;0<d;)a[d+0-1]=b[d+0-1],d--};a.prototype.dequeue=function(){var b=this.peek();this.removeAt(0);return b};a.prototype.enqueue=function(b){var c;if(this.size>=this.items.length){c=this.items;for(var d=this.items=Array(2*this.items.length),e=c.length;0<e;)d[e+0-1]=c[e+0-1],e--}c=this.size++;this.items[c]=new ka(a.count++,b);this.percolate(c)};
a.prototype.remove=function(b){var a;for(a=0;a<this.size;a++)if(this.items[a].value===b)return this.removeAt(a),!0;return!1};a.count=0;return a}(),p=m.CompositeDisposable=function(){function a(){var b=!1,a=u.fromArray(y.call(arguments));this.count=function(){return a.count()};this.add=function(d){b?d.dispose():a.add(d)};this.remove=function(d){var e=!1;b||(e=a.remove(d));e&&d.dispose();return e};this.dispose=function(){var d,e;b||(b=!0,d=a.toArray(),a.clear());if(d!==n)for(e=0;e<d.length;e++)d[e].dispose()};
this.clear=function(){var b,e;b=a.toArray();a.clear();for(e=0;e<b.length;e++)b[e].dispose()};this.contains=function(b){return a.contains(b)};this.isDisposed=function(){return b};this.toArray=function(){return a.toArray()}}a.prototype.count=function(){return this.count()};a.prototype.add=function(b){this.add(b)};a.prototype.remove=function(b){this.remove(b)};a.prototype.dispose=function(){this.dispose()};a.prototype.clear=function(){this.clear()};a.prototype.contains=function(b){return this.contains(b)};
a.prototype.isDisposed=function(){return this.isDisposed()};a.prototype.toArray=function(){return this.toArray()};return a}(),L=m.Disposable=function(){function a(b){var a=!1;this.dispose=function(){a||(b(),a=!0)}}a.prototype.dispose=function(){this.dispose()};return a}(),A=L.create=function(a){return new L(a)},w=L.empty=new L(function(){}),v=m.SingleAssignmentDisposable=function(){function a(){var b=!1,a=null;this.isDisposed=function(){return b};this.getDisposable=function(){return a};this.setDisposable=
function(d){if(null!==a)throw Error("Disposable has already been assigned");var e=b;e||(a=d);e&&null!==d&&d.dispose()};this.dispose=function(){var d=null;b||(b=!0,d=a,a=null);null!==d&&d.dispose()}}a.prototype.isDisposed=function(){return this.isDisposed()};a.prototype.disposable=function(b){if(b===n)return this.getDisposable();this.setDisposable(b)};a.prototype.dispose=function(){this.dispose()};return a}(),C=m.SerialDisposable=function(){function a(){var b=!1,a=null;this.isDisposed=function(){return b};
this.getDisposable=function(){return a};this.setDisposable=function(d){var e=b,g=null;e||(g=a,a=d);null!==g&&g.dispose();e&&null!==d&&d.dispose()};this.dispose=function(){var d=null;b||(b=!0,d=a,a=null);null!==d&&d.dispose()}}a.prototype.isDisposed=function(){return this.isDisposed()};a.prototype.disposable=function(a){if(a===n)return this.getDisposable();this.setDisposable(a)};a.prototype.dispose=function(){this.dispose()};a.prototype.dispose=function(){this.dispose()};return a}(),Z=m.RefCountDisposable=
function(){function a(a){var c=!1,d=!1,e=0;this.dispose=function(){var g=!1;!c&&!d&&(d=!0,0===e&&(g=c=!0));g&&a.dispose()};this.getDisposable=function(){if(c)return w;e++;var g=!1;return{dispose:function(){var h=!1;!c&&!g&&(g=!0,e--,0===e&&d&&(h=c=!0));h&&a.dispose()}}};this.isDisposed=function(){return c}}a.prototype.dispose=function(){this.dispose()};a.prototype.getDisposable=function(){return this.getDisposable()};a.prototype.isDisposed=function(){return this.isDisposed()};return a}(),R;R=function(){function a(a,
c,d,e,g){this.scheduler=a;this.state=c;this.action=d;this.dueTime=e;this.comparer=g||function(a,b){return a-b};this.disposable=new v}a.prototype.invoke=function(){return this.disposable.disposable(this.invokeCore())};a.prototype.compareTo=function(a){return this.comparer(this.dueTime,a.dueTime)};a.prototype.isCancelled=function(){return this.disposable.isDisposed()};a.prototype.invokeCore=function(){return this.action(this.scheduler,this.state)};return a}();var s=m.Scheduler=function(){function a(a,
b,c,d){this.now=a;this._schedule=b;this._scheduleRelative=c;this._scheduleAbsolute=d}var b=function(a,b){var c,d,e,k;d=new p;k=b.first;c=b.second;e=null;e=function(b){c(b,function(b){var c,h,l;l=h=!1;c=null;c=a.scheduleWithState(b,function(a,b){h?d.remove(c):l=!0;e(b);return w});l||(d.add(c),h=!0)})};e(k);return d},c=function(a,b){var c,d,e,k;d=new p;k=b.first;c=b.second;e=function(b){c(b,function(b,c){var h,l,k;k=l=!1;h=a.scheduleWithRelativeAndState(b,c,function(a,b){l?d.remove(h):k=!0;e(b);return w});
k||(d.add(h),l=!0)})};e(k);return d},d=function(a,b){var c,d,e,k;d=new p;k=b.first;c=b.second;e=function(b){c(b,function(b,c){var h=!1,l=!1,k=a.scheduleWithAbsoluteAndState(b,c,function(a,b){h?d.remove(k):l=!0;e(b);return w});l||(d.add(k),h=!0)})};e(k);return d},e=function(a,b){b();return w};a.prototype.schedule=function(a){return this._schedule(a,e)};a.prototype.scheduleWithState=function(a,b){return this._schedule(a,b)};a.prototype.scheduleWithRelative=function(a,b){return this._scheduleRelative(b,
a,e)};a.prototype.scheduleWithRelativeAndState=function(a,b,c){return this._scheduleRelative(a,b,c)};a.prototype.scheduleWithAbsolute=function(a,b){return this._scheduleAbsolute(b,a,e)};a.prototype.scheduleWithAbsoluteAndState=function(a,b,c){return this._scheduleAbsolute(a,b,c)};a.prototype.scheduleRecursive=function(a){return this.scheduleRecursiveWithState(a,function(a,b){a(function(){b(a)})})};a.prototype.scheduleRecursiveWithState=function(a,c){return this.scheduleWithState({first:a,second:c},
function(a,c){return b(a,c)})};a.prototype.scheduleRecursiveWithRelative=function(a,b){return this.scheduleRecursiveWithRelativeAndState(b,a,function(a,b){a(function(c){b(a,c)})})};a.prototype.scheduleRecursiveWithRelativeAndState=function(a,b,d){return this._scheduleRelative({first:a,second:d},b,function(a,b){return c(a,b)})};a.prototype.scheduleRecursiveWithAbsolute=function(a,b){return this.scheduleRecursiveWithAbsoluteAndState(b,a,function(a,b){a(function(c){b(a,c)})})};a.prototype.scheduleRecursiveWithAbsoluteAndState=
function(a,b,c){return this._scheduleAbsolute({first:a,second:c},b,function(a,b){return d(a,b)})};a.now=J;a.normalize=function(a){0>a&&(a=0);return a};return a}(),f=function(){function a(){var b=this;a.base.constructor.call(this,J,function(a,d){return d(b,a)},function(a,d,e){for(;0<s.normalize(d););return e(b,a)},function(a,d,e){return b.scheduleWithRelativeAndState(a,d-b.now(),e)})}o(a,s);return a}(),B=s.Immediate=new f,la=function(){function a(){M.queue=new Y(4)}a.prototype.dispose=function(){M.queue=
null};a.prototype.run=function(){for(var a,c=M.queue;0<c.count();)if(a=c.dequeue(),!a.isCancelled()){for(;0<a.dueTime-s.now(););a.isCancelled()||a.invoke()}};return a}(),M=function(){function a(){var b=this;a.base.constructor.call(this,J,function(a,d){return b.scheduleWithRelativeAndState(a,0,d)},function(c,d,e){var g=b.now()+s.normalize(d),d=a.queue,c=new R(b,c,e,g);if(null===d){e=new la;try{a.queue.enqueue(c),e.run()}finally{e.dispose()}}else d.enqueue(c);return c.disposable},function(a,d,e){return b.scheduleWithRelativeAndState(a,
d-b.now(),e)})}o(a,s);a.prototype.scheduleRequired=function(){return null===a.queue};a.prototype.ensureTrampoline=function(a){return this.scheduleRequired()?this.schedule(a):a()};a.queue=null;return a}(),D=s.CurrentThread=new M;m.VirtualTimeScheduler=function(){function a(b,c){var d=this;this.clock=b;this.comparer=c;this.isEnabled=!1;a.base.constructor.call(this,function(){return d.toDateTimeOffset(d.clock)},function(a,b){return d.scheduleAbsolute(a,d.clock,b)},function(a,b,c){return d.scheduleRelative(a,
d.toRelative(b),c)},function(a,b,c){return d.scheduleRelative(a,d.toRelative(b-d.now()),c)});this.queue=new Y(1024)}o(a,s);a.prototype.scheduleRelative=function(a,c,d){c=this.add(this.clock,c);return this.scheduleAbsolute(a,c,d)};a.prototype.start=function(){var a;if(!this.isEnabled){this.isEnabled=!0;do if(a=this.getNext(),null!==a){if(0<this.comparer(a.dueTime,this.clock))this.clock=a.dueTime;a.invoke()}else this.isEnabled=!1;while(this.isEnabled)}};a.prototype.stop=function(){return this.isEnabled=
!1};a.prototype.advanceTo=function(a){var c;if(0<=this.comparer(this.clock,a))throw Error("Argument out of range");if(!this.isEnabled){this.isEnabled=!0;do if(c=this.getNext(),null!==c&&0>=this.comparer(c.dueTime,a)){if(0<this.comparer(c.dueTime,this.clock))this.clock=c.dueTime;c.invoke()}else this.isEnabled=!1;while(this.isEnabled);return this.clock=a}};a.prototype.advanceBy=function(a){a=this.add(this.clock,a);if(0<=this.comparer(this.clock,a))throw Error("Argument out of range");return this.advanceTo(a)};
a.prototype.getNext=function(){for(var a;0<this.queue.count();)if(a=this.queue.peek(),a.isCancelled())this.queue.dequeue();else return a;return null};a.prototype.scheduleAbsolute=function(a,c,d){var e=this,g=new R(e,a,function(a,b){e.queue.remove(g);return d(a,b)},c,e.comparer);e.queue.enqueue(g);return g.disposable};return a}();var f=function(){function a(){var b=this;a.base.constructor.call(this,J,function(a,d){var e=x.setTimeout(function(){d(b,a)},0);return A(function(){x.clearTimeout(e)})},function(a,
d,e){var g,d=s.normalize(d);g=x.setTimeout(function(){e(b,a)},d);return A(function(){x.clearTimeout(g)})},function(a,d,e){return b.scheduleWithRelativeAndState(a,d-b.now(),e)})}o(a,s);return a}(),ma=s.Timeout=new f,t=m.Notification=function(){function a(){}a.prototype.accept=function(a,c,d){return 1<arguments.length||"function"===typeof a?this._accept(a,c,d):this._acceptObservable(a)};a.prototype.toObservable=function(a){var c=this,a=a||s.Immediate;return i(function(d){return a.schedule(function(){c._acceptObservable(d);
if("N"===c.kind)d.onCompleted()})})};a.prototype.hasValue=!1;a.prototype.equals=function(a){return this.toString()===(a===n||null===a?"":a.toString())};return a}();t.createOnNext=function(a){var b=new t;b.value=a;b.hasValue=!0;b.kind="N";b._accept=function(a){return a(this.value)};b._acceptObservable=function(a){return a.onNext(this.value)};b.toString=function(){return"OnNext("+this.value+")"};return b};t.createOnError=function(a){var b=new t;b.exception=a;b.kind="E";b._accept=function(a,b){return b(this.exception)};
b._acceptObservable=function(a){return a.onError(this.exception)};b.toString=function(){return"OnError("+this.exception+")"};return b};t.createOnCompleted=function(){var a=new t;a.kind="C";a._accept=function(a,c,d){return d()};a._acceptObservable=function(a){return a.onCompleted()};a.toString=function(){return"OnCompleted()"};return a};var G=function(){},f=G.prototype;f.concat=function(){var a=this;return i(function(b){var c,d=a.getEnumerator(),e=!1,g=new C;c=B.scheduleRecursive(function(a){var c,
z,q=!1;if(!e){try{if(q=d.moveNext())c=d.current}catch(k){z=k}if(void 0!==z)b.onError(z);else if(q)z=new v,g.disposable(z),z.disposable(c.subscribe(function(a){b.onNext(a)},function(a){b.onError(a)},function(){a()}));else b.onCompleted()}});return new p(g,c,A(function(){e=!0}))})};f.catchException=function(){var a=this;return i(function(b){var c,d=a.getEnumerator(),e=!1,g,h;g=new C;c=B.scheduleRecursive(function(a){var c,q,k;k=!1;if(!e){try{if(k=d.moveNext())c=d.current}catch(f){q=f}if(void 0!==q)b.onError(q);
else if(k)q=new v,g.disposable(q),q.disposable(c.subscribe(function(a){b.onNext(a)},function(b){h=b;a()},function(){b.onCompleted()}));else if(void 0!==h)b.onError(h);else b.onCompleted()}});return new p(g,c,A(function(){e=!0}))})};var $=G.repeat=function(a,b){b===n&&(b=-1);var c=new G;c.getEnumerator=function(){return{left:b,current:null,moveNext:function(){if(0===this.left)return this.current=null,!1;0<this.left&&this.left--;this.current=a;return!0}}};return c},S=G.forEnumerator=function(a){var b=
new G;b.getEnumerator=function(){return{_index:-1,current:null,moveNext:function(){if(++this._index<a.length)return this.current=a[this._index],!0;this._index=-1;this.current=null;return!1}}};return b},r=m.Observer=function(){},T=m.Internals.AbstractObserver=function(){function a(){this.isStopped=!1}o(a,r);a.prototype.onNext=function(a){this.isStopped||this.next(a)};a.prototype.onError=function(a){if(!this.isStopped)this.isStopped=!0,this.error(a)};a.prototype.onCompleted=function(){if(!this.isStopped)this.isStopped=
!0,this.completed()};a.prototype.dispose=function(){this.isStopped=!0};return a}(),N=function(){function a(b,c,d){a.base.constructor.call(this);this._onNext=b;this._onError=c;this._onCompleted=d}o(a,T);a.prototype.next=function(a){this._onNext(a)};a.prototype.error=function(a){this._onError(a)};a.prototype.completed=function(){this._onCompleted()};return a}(),H=m.Internals.BinaryObserver=function(){function a(a,c){"function"===typeof a&&"function"===typeof c?(this.leftObserver=aa(a),this.rightObserver=
aa(c)):(this.leftObserver=a,this.rightObserver=c)}o(a,r);a.prototype.onNext=function(a){var c=this;return a.switchValue(function(a){return a.accept(c.leftObserver)},function(a){return a.accept(c.rightObserver)})};a.prototype.onError=function(){};a.prototype.onCompleted=function(){};return a}(),na=function(){function a(a,c){this.scheduler=a;this.observer=c;this.hasFaulted=this.isAcquired=!1;this.queue=[];this.disposable=new C}o(a,T);a.prototype.ensureActive=function(){var a=!1,c=this;if(!this.hasFaulted&&
0<this.queue.length)a=!this.isAcquired,this.isAcquired=!0;a&&this.disposable.disposable(this.scheduler.scheduleRecursive(function(a){var b;if(0<c.queue.length){b=c.queue.shift();try{b()}catch(g){throw c.queue=[],c.hasFaulted=!0,g;}a()}else c.isAcquired=!1}))};a.prototype.next=function(a){var c=this;this.queue.push(function(){c.observer.onNext(a)})};a.prototype.error=function(a){var c=this;this.queue.push(function(){c.observer.onError(a)})};a.prototype.completed=function(){var a=this;this.queue.push(function(){a.observer.onCompleted()})};
a.prototype.dispose=function(){a.base.dispose.call(this);this.disposable.dispose()};return a}(),I=r.create=function(a,b,c){b||(b=function(a){throw a;});c||(c=function(){});return new N(a,b,c)};r.fromNotifier=function(a){return new N(function(b){return a(t.createOnNext(b))},function(b){return a(t.createOnError(b))},function(){return a(t.createOnCompleted())})};var aa=function(a){return new N(function(b){a(t.createOnNext(b))},function(b){a(t.createOnError(b))},function(){a(t.createOnCompleted())})};
r.prototype.toNotifier=function(){var a=this;return function(b){return b.accept(a)}};r.prototype.asObserver=function(){var a=this;return new N(function(b){return a.onNext(b)},function(b){return a.onError(b)},function(){return a.onCompleted()})};var j=m.Observable=function(){function a(){}a.prototype.subscribe=function(a,c,d){return this._subscribe(0===arguments.length||1<arguments.length||"function"===typeof a?I(a,c,d):a)};return a}(),f=j.prototype,pa=function(){function a(b){a.base.constructor.call(this);
this._subscribe=function(a){var d=new oa(a);D.scheduleRequired()?D.schedule(function(){d.disposable(b(d))}):d.disposable(b(d));return d}}o(a,j);a.prototype._subscribe=function(a){return this._subscribe(a)};return a}(),oa=function(){function a(b){a.base.constructor.call(this);this.observer=b;this.m=new v}o(a,T);a.prototype.disposable=function(a){return this.m.disposable(a)};a.prototype.next=function(a){this.observer.onNext(a)};a.prototype.error=function(a){this.observer.onError(a);this.m.dispose()};
a.prototype.completed=function(){this.observer.onCompleted();this.m.dispose()};a.prototype.dispose=function(){a.base.dispose.call(this);this.m.dispose()};return a}(),ba=function(){function a(b,c,d){a.base.constructor.call(this);this.key=b;this.underlyingObservable=!d?c:i(function(a){return new p(d.getDisposable(),c.subscribe(a))})}o(a,j);a.prototype._subscribe=function(a){return this.underlyingObservable.subscribe(a)};return a}(),qa=m.ConnectableObservable=function(){function a(a,c){var d=a.asObservable(),
e=!1,g=null;this.connect=function(){e||(e=!0,g=new p(d.subscribe(c),A(function(){e=!1})));return g};this._subscribe=function(a){return c.subscribe(a)}}o(a,j);a.prototype.connect=function(){return this.connect()};a.prototype.refCount=function(){var a=null,c=0,d=this;return i(function(e){var g,h;c++;g=1===c;h=d.subscribe(e);g&&(a=d.connect());return A(function(){h.dispose();c--;0===c&&a.dispose()})})};a.prototype._subscribe=function(a){return this._subscribe(a)};return a}(),O=m.Subject=function(){function a(){a.base.constructor.call(this);
var b=!1,c=!1,d=new u,e=n,g=function(){if(b)throw Error(K);};this.onCompleted=function(){var a,b;g();c||(a=d.toArray(),d=new u,c=!0);if(a!==n)for(b=0;b<a.length;b++)a[b].onCompleted()};this.onError=function(a){var b,z;g();c||(b=d.toArray(),d=new u,c=!0,e=a);if(b!==n)for(z=0;z<b.length;z++)b[z].onError(a)};this.onNext=function(a){var b,e;g();c||(b=d.toArray());if(void 0!==b)for(e=0;e<b.length;e++)b[e].onNext(a)};this._subscribe=function(a){g();if(!c)return d.add(a),function(a){return{observer:a,dispose:function(){if(null!==
this.observer&&!b)d.remove(this.observer),this.observer=null}}}(a);if(e!==n)return a.onError(e),w;a.onCompleted();return w};this.dispose=function(){b=!0;d=null}}o(a,j);E(a,r);a.prototype.onCompleted=function(){this.onCompleted()};a.prototype.onError=function(a){this.onError(a)};a.prototype.onNext=function(a){this.onNext(a)};a.prototype._subscribe=function(a){return this._subscribe(a)};a.prototype.dispose=function(){this.dispose()};a.create=function(a,c){return new ra(a,c)};return a}(),U=m.AsyncSubject=
function(){function a(){a.base.constructor.call(this);var b=!1,c=!1,d=null,e=!1,g=new u,h=null,l=function(){if(b)throw Error(K);};this.onCompleted=function(){var a=!1,b,h,f;l();c||(b=g.toArray(),g=new u,c=!0,h=d,a=e);if(b!==n)if(a)for(f=0;f<b.length;f++)a=b[f],a.onNext(h),a.onCompleted();else for(f=0;f<b.length;f++)b[f].onCompleted()};this.onError=function(a){var b,d;l();c||(b=g.toArray(),g=new u,c=!0,h=a);if(b!==n)for(d=0;d<b.length;d++)b[d].onError(a)};this.onNext=function(a){l();c||(d=a,e=!0)};
this._subscribe=function(a){var q,k,f;l();if(!c)return g.add(a),function(a){return{observer:a,dispose:function(){if(null!==this.observer&&!b)g.remove(this.observer),this.observer=null}}}(a);q=h;k=e;f=d;if(null!==q)a.onError(q);else{if(k)a.onNext(f);a.onCompleted()}return w};this.dispose=function(){b=!0;d=h=g=null}}o(a,j);E(a,r);a.prototype.onCompleted=function(){this.onCompleted()};a.prototype.onError=function(a){this.onError(a)};a.prototype.onNext=function(a){this.onNext(a)};a.prototype._subscribe=
function(a){return this._subscribe(a)};a.prototype.dispose=function(){this.dispose()};return a}(),P=m.BehaviorSubject=function(){function a(b){a.base.constructor.call(this);var c=b,d=new u,e=!1,g=!1,h=null,l=function(){if(e)throw Error(K);};this.onCompleted=function(){var a,b;a=null;l();g||(a=d.toArray(),d=new u,g=!0);if(null!==a)for(b=0;b<a.length;b++)a[b].onCompleted()};this.onError=function(a){var b,c;c=null;l();g||(c=d.toArray(),d=new u,g=!0,h=a);if(null!==c)for(b=0;b<c.length;b++)c[b].onError(a)};
this.onNext=function(a){var b,e;b=null;l();g||(c=a,b=d.toArray());if(null!==b)for(e=0;e<b.length;e++)b[e].onNext(a)};this._subscribe=function(a){var b;l();if(!g)return d.add(a),a.onNext(c),function(a){return{observer:a,dispose:function(){if(null!==this.observer&&!e)d.remove(this.observer),this.observer=null}}}(a);b=h;if(null!==b)a.onError(b);else a.onCompleted();return w};this.dispose=function(){e=!0;h=c=d=null}}o(a,j);E(a,r);a.prototype.onCompleted=function(){this.onCompleted()};a.prototype.onError=
function(a){this.onError(a)};a.prototype.onNext=function(a){this.onNext(a)};a.prototype._subscribe=function(a){return this._subscribe(a)};a.prototype.dispose=function(){this.dispose()};return a}();P.prototype.toNotifier=r.prototype.toNotifier;P.prototype.asObserver=r.prototype.AsObserver;var ca=m.ReplaySubject=function(){function a(a,c,d){var e=a===n?Number.MAX_VALUE:a,g=c===n?Number.MAX_VALUE:c,h=d||s.currentThread,l=[],f=new u,q=!1,k=!1,i=function(a){var b=q?1:0,c=b+e;for(c<e&&(c=e);l.length>c;)l.shift();
for(;l.length>b&&a-l[0].timestamp>g;)l.shift()},j=function(a){var b=h.now();l.push({value:a,timestamp:b});i(b)},m=function(){if(k)throw Error(K);};this.onNext=function(a){var b=null,c,d;m();if(!q){b=f.toArray();j(t.createOnNext(a));for(d=0;d<b.length;d++)c=b[d],c.onNext(a)}if(null!==b)for(d=0;d<b.length;d++)c=b[d],c.ensureActive()};this.onError=function(a){var b=null,c;m();if(!q){q=!0;j(t.createOnError(a));b=f.toArray();for(c=0;c<b.length;c++)b[c].onError(a);f=new u}if(null!==b)for(c=0;c<b.length;c++)b[c].ensureActive()};
this.onCompleted=function(){var a=null,b;m();if(!q){q=!0;j(t.createOnCompleted());a=f.toArray();for(b=0;b<a.length;b++)a[b].onCompleted();f=new u}if(null!==a)for(b=0;b<a.length;b++)a[b].ensureActive()};this._subscribe=function(a){var a=new na(h,a),b=function(a){return{observer:a,dispose:function(){this.observer.dispose();null!==this.observer&&!k&&f.remove(this.observer)}}}(a),c;m();i(h.now());f.add(a);for(c=0;c<l.length;c++)l[c].value.accept(a);a.ensureActive();return b};this.dispose=function(){k=
!0;f=null}}o(a,j);E(a,j);a.prototype.onNext=function(a){this.onNext(a)};a.prototype.onError=function(a){this.onError(a)};a.prototype.onCompleted=function(){this.onCompleted()};a.prototype._subscribe=function(a){return this._subscribe(a)};a.prototype.dispose=function(){this.dispose()};return a}(),ra=function(){function a(a,c){this.observer=a;this.observable=c}o(a,j);E(a,r);a.prototype.onCompleted=function(){return this.observer.onCompleted()};a.prototype.onError=function(a){return this.observer.onError(a)};
a.prototype.onNext=function(a){return this.observer.onNext(a)};a.prototype._Subscribe=function(a){return this.observable.Subscribe(a)};return a}();j.start=function(a,b,c,d){c||(c=[]);return sa(a,d).apply(b,c)};var sa=j.toAsync=function(a,b){b||(b=ma);return function(){var c=new U,d=function(){var b;try{b=a.apply(this,arguments)}catch(d){c.onError(d);return}c.onNext(b);c.onCompleted()},e=y.call(arguments),g=this;b.schedule(function(){d.apply(g,e)});return c}};f.multicast=function(a,b){var c=this;return"function"===
typeof a?i(function(d){var e=c.multicast(a());return new p(b(e).subscribe(d),e.connect())}):new qa(c,a)};f.publish=function(a){return!a?this.multicast(new O):this.multicast(function(){return new O},a)};f.publishLast=function(a){return!a?this.multicast(new U):this.multicast(function(){return new U},a)};f.replay=function(a,b,c,d){return!a||null===a?this.multicast(new ca(b,c,d)):this.multicast(function(){return new ca(b,c,d)},a)};f.publishValue=function(a,b){return"function"===typeof a?this.multicast(function(){return new P(b)},
a):this.multicast(new P(a))};var da=j.never=function(){return i(function(){return w})},ta=j.empty=function(a){a||(a=B);return i(function(b){return a.schedule(function(){return b.onCompleted()})})},ua=j.returnValue=function(a,b){b||(b=B);return i(function(c){return b.schedule(function(){c.onNext(a);return c.onCompleted()})})},ea=j.throwException=function(a,b){b||(b=B);return i(function(c){return b.schedule(function(){return c.onError(a)})})},va=j.generate=function(a,b,c,d,e){e||(e=D);return i(function(g){var h=
!0,f=a;return e.scheduleRecursive(function(a){var e,k;try{h?h=!1:f=c(f),(e=b(f))&&(k=d(f))}catch(i){g.onError(i);return}if(e)g.onNext(k),a();else g.onCompleted()})})},fa=j.defer=function(a){return i(function(b){var c;try{c=a()}catch(d){return ea(d).subscribe(b)}return c.subscribe(b)})};j.using=function(a,b){return i(function(c){var d=w,e,g;try{e=a(),null!==e&&(d=e),g=b(e)}catch(h){return new p(ea(h).subscribe(c),d)}return new p(g.subscribe(c),d)})};var ga=j.fromArray=function(a,b){b||(b=D);return i(function(c){var d=
0;return b.scheduleRecursive(function(b){if(d<a.length)c.onNext(a[d++]),b();else c.onCompleted()})})},i=j.createWithDisposable=function(a){return new pa(a)};j.create=function(a){return i(function(b){return A(a(b))})};j.range=function(a,b,c){c||(c=D);var d=a+b-1;return va(a,function(a){return a<=d},function(a){return a+1},function(a){return a},c)};f.repeat=function(a){return $(this,a).concat()};f.retry=function(a){return $(this,a).catchException()};j.repeat=function(a,b,c){c||(c=D);b===n&&(b=-1);return ua(a,
c).repeat(b)};f.select=function(a){var b=this;return i(function(c){var d=0;return b.subscribe(function(b){var g;try{g=a(b,d++)}catch(h){c.onError(h);return}c.onNext(g)},function(a){c.onError(a)},function(){c.onCompleted()})})};f.where=function(a){var b=this;return i(function(c){var d=0;return b.subscribe(function(b){var g;try{g=a(b,d++)}catch(h){c.onError(h);return}if(g)c.onNext(b)},function(a){c.onError(a)},function(){c.onCompleted()})})};f.groupByUntil=function(a,b,c,d){var e=this;b||(b=Q);d||(d=
W);return i(function(g){var h={},f=new p,i=new Z(f);f.add(e.subscribe(function(e){var k,j,m,t,o,p,u,s,r;try{j=a(e),p=d(j)}catch(w){for(r in h)h[r].onError(w);g.onError(w);return}o=!1;try{s=h[p],s||(s=new O,h[p]=s,o=!0)}catch(x){for(r in h)h[r].onError(x);g.onError(x);return}if(o){o=new ba(j,s,i);j=new ba(j,s);try{k=c(j)}catch(y){for(r in h)h[r].onError(y);g.onError(y);return}g.onNext(o);u=new v;f.add(u);t=function(){h[p]!==n&&(delete h[p],s.onCompleted());f.remove(u)};u.disposable(k.take(1).subscribe(function(){},
function(a){for(r in h)h[r].onError(a);g.onError(a)},function(){t()}))}try{m=b(e)}catch(A){for(r in h)h[r].onError(A);g.onError(A);return}s.onNext(m)},function(a){for(var b in h)h[b].onError(a);g.onError(a)},function(){for(var a in h)h[a].onCompleted();g.onCompleted()}));return i})};f.groupBy=function(a,b,c){return this.groupByUntil(a,b,function(){return da()},c)};f.take=function(a,b){if(0>a)throw Error("Argument out of range");if(0==a)return ta(b);var c=this;return i(function(b){var e=a;return c.subscribe(function(a){if(0<
e&&(e--,b.onNext(a),0===e))b.onCompleted()},function(a){return b.onError(a)},function(){return b.onCompleted()})})};f.skip=function(a){if(0>a)throw Error("Argument out of range");var b=this;return i(function(c){var d=a;return b.subscribe(function(a){if(0>=d)c.onNext(a);else d--},function(a){return c.onError(a)},function(){return c.onCompleted()})})};f.takeWhile=function(a){var b=this;return i(function(c){var d=0,e=!0;return b.subscribe(function(b){if(e){try{e=a(b,d++)}catch(h){c.onError(h);return}if(e)c.onNext(b);
else c.onCompleted()}},function(a){return c.onError(a)},function(){return c.onCompleted()})})};f.skipWhile=function(a){var b=this;return i(function(c){var d=0,e=!1;return b.subscribe(function(b){if(!e)try{e=!a(b,d++)}catch(h){c.onError(h);return}if(e)c.onNext(b)},function(a){c.onError(a)},function(){c.onCompleted()})})};f.selectMany=function(a,b){return b!==n?this.selectMany(function(c){return a(c).select(function(a){return b(c,a)})}):"function"===typeof a?this.select(a).mergeObservable():this.select(function(){return a}).mergeObservable()};
f.finalValue=function(){var a=this;return i(function(b){var c=!1,d;return a.subscribe(function(a){c=!0;d=a},function(a){b.onError(a)},function(){if(c)b.onNext(d),b.onCompleted();else b.onError(Error("Sequence contains no elements."))})})};f.toArray=function(){return this.scan([],function(a,b){a.push(b);return a}).startWith([]).finalValue()};f.materialize=function(){var a=this;return i(function(b){return a.subscribe(function(a){b.onNext(t.createOnNext(a))},function(a){b.onNext(t.createOnError(a));
b.onCompleted()},function(){b.onNext(t.createOnCompleted());b.onCompleted()})})};f.dematerialize=function(){var a=this;return i(function(b){return a.subscribe(function(a){return a.accept(b)},function(a){b.onError(a)},function(){b.onCompleted()})})};f.asObservable=function(){var a=this;return i(function(b){return a.subscribe(b)})};f.windowWithCount=function(a,b){var c=this;if(0>=a)throw Error("Argument out of range");b===n&&(b=a);if(0>=b)throw Error("Argument out of range");return i(function(d){var e=
new v,g=new Z(e),h=0,f=[],i=function(){var a=new O;f.push(a);d.onNext(ja(a,g))};i();e.disposable(c.subscribe(function(c){var d;for(d=0;d<f.length;d++)f[d].onNext(c);c=h-a+1;0<=c&&0===c%b&&(c=f.shift(),c.onCompleted());h++;0===h%b&&i()},function(a){for(;0<f.length;)f.shift().onError(a);d.onError(a)},function(){for(;0<f.length;)f.shift().onCompleted();d.onCompleted()}));return g})};f.bufferWithCount=function(a,b){b===n&&(b=a);return this.windowWithCount(a,b).selectMany(function(a){return a.toArray()}).where(function(a){return 0<
a.length})};f.startWith=function(){var a,b;a=0;0<arguments.length&&void 0!==arguments[0].now?(b=arguments[0],a=1):b=B;a=y.call(arguments,a);return S([ga(a,b),this]).concat()};f.scan=function(a,b){var c=this;return fa(function(){var d=!1,e;return c.select(function(c){d?e=b(e,c):(e=b(a,c),d=!0);return e})})};f.scan1=function(a){var b=this;return fa(function(){var c=!1,d;return b.select(function(b){c?d=a(d,b):(d=b,c=!0);return d})})};f.distinctUntilChanged=function(a,b){var c=this;a||(a=Q);b||(b=V);
return i(function(d){var e=!1,g;return c.subscribe(function(c){var f=!1,i;try{i=a(c)}catch(j){d.onError(j);return}if(e)try{f=b(g,i)}catch(k){d.onError(k);return}if(!e||!f)e=!0,g=i,d.onNext(c)},function(a){d.onError(a)},function(){d.onCompleted()})})};f.finallyAction=function(a){var b=this;return i(function(c){var d=b.subscribe(c);return A(function(){try{d.dispose()}finally{a()}})})};f.doAction=function(a,b,c){var d=this,e;0==arguments.length||1<arguments.length||"function"==typeof a?e=a:(e=function(b){a.onNext(b)},
b=function(b){a.onError(b)},c=function(){a.onCompleted()});return i(function(a){return d.subscribe(function(b){try{e(b)}catch(c){a.onError(c)}a.onNext(b)},function(c){if(b)try{b(c)}catch(d){a.onError(d)}a.onError(c)},function(){if(c)try{c()}catch(b){a.onError(b)}a.onCompleted()})})};f.skipLast=function(a){var b=this;return i(function(c){var d=[];return b.subscribe(function(b){d.push(b);if(d.length>a)c.onNext(d.shift())},function(a){c.onError(a)},function(){c.onCompleted()})})};f.takeLast=function(a){var b=
this;return i(function(c){var d=[];return b.subscribe(function(b){d.push(b);d.length>a&&d.shift()},function(a){c.onError(a)},function(){for(;0<d.length;)c.onNext(d.shift());c.onCompleted()})})};f.ignoreElements=function(){var a=this;return i(function(b){return a.subscribe(ia,function(a){b.onError(a)},function(){b.onCompleted()})})};f.elementAt=function(a){if(0>a)throw Error("Argument out of range");var b=this;return i(function(c){var d=a;return b.subscribe(function(a){0===d&&(c.onNext(a),c.onCompleted());
d--},function(a){c.onError(a)},function(){c.onError(Error("Argument out of range"))})})};f.elementAtOrDefault=function(a,b){var c=this;if(0>a)throw Error("Argument out of range");b===n&&(b=null);return i(function(d){var e=a;return c.subscribe(function(a){0===e&&(d.onNext(a),d.onCompleted());e--},function(a){d.onError(a)},function(){d.onNext(b);d.onCompleted()})})};f.defaultIfEmpty=function(a){var b=this;a===n&&(a=null);return i(function(c){var d=!1;return b.subscribe(function(a){d=!0;c.onNext(a)},
function(a){c.onError(a)},function(){if(!d)c.onNext(a);c.onCompleted()})})};f.distinct=function(a,b){var c=this;a||(a=Q);b||(b=W);return i(function(d){var e={};return c.subscribe(function(c){var f,i,j,q=!1;try{f=a(c),i=b(f)}catch(k){d.onError(k);return}for(j in e)if(i===j){q=!0;break}q||(e[i]=null,d.onNext(c))},function(a){d.onError(a)},function(){d.onCompleted()})})};f.mergeObservable=function(){var a=this;return i(function(b){var c=new p,d=!1,e=new v;c.add(e);e.disposable(a.subscribe(function(a){var e=
new v;c.add(e);e.disposable(a.subscribe(function(a){b.onNext(a)},function(a){b.onError(a)},function(){c.remove(e);if(d&&1===c.count())b.onCompleted()}))},function(a){b.onError(a)},function(){d=!0;if(1===c.count())b.onCompleted()}));return c})};f.merge=function(a){var b=this;return i(function(c){var d=0,e=new p,g=!1,f=[],i=function(a){var b=new v;e.add(b);b.disposable(a.subscribe(function(a){c.onNext(a)},function(a){c.onError(a)},function(){var a;e.remove(b);if(0<f.length)a=f.shift(),i(a);else if(d--,
g&&0===d)c.onCompleted()}))};e.add(b.subscribe(function(b){d<a?(d++,i(b)):f.push(b)},function(a){c.onError(a)},function(){g=!0;if(0===d)c.onCompleted()}));return e})};f.switchLatest=function(){var a=this;return i(function(b){var c=!1,d=new C,e=!1,g=0,f=a.subscribe(function(a){var f=new v,h=++g;c=!0;d.disposable(f);return f.disposable(a.subscribe(function(a){if(g===h)b.onNext(a)},function(a){if(g===h)b.onError(a)},function(){if(g===h&&(c=!1,e))b.onCompleted()}))},function(a){b.onError(a)},function(){e=
!0;if(!c)b.onCompleted()});return new p(f,d)})};j.merge=function(a){a||(a=B);var b=1<arguments.length&&arguments[1]instanceof Array?arguments[1]:y.call(arguments,1);return ga(b,a).mergeObservable()};f.concat=function(){var a=wa,b;b=arguments;var c,d;c=[];for(d=0;d<b.length;d++)c.push(b[d]);b=c;b.unshift(this);return a.apply(this,b)};f.concatObservable=function(){return this.merge(1)};var wa=j.concat=function(){var a=1===arguments.length&&arguments[0]instanceof Array?arguments[0]:y.call(arguments);
return S(a).concat()};f.catchException=function(a){return"function"===typeof a?xa(this,a):ya([this,a])};var xa=function(a,b){return i(function(c){var d=new v,e=new C;d.disposable(a.subscribe(function(a){c.onNext(a)},function(a){var d;try{d=b(a)}catch(f){c.onError(f);return}a=new v;e.disposable(a);a.disposable(d.subscribe(c))},function(){c.onCompleted()}));return e})},ya=j.catchException=function(){var a=1===arguments.length&&arguments[0]instanceof Array?arguments[0]:y.call(arguments);return S(a).catchException()};
f.onErrorResumeNext=function(a){return za([this,a])};var za=j.onErrorResumeNext=function(){var a=1===arguments.length&&arguments[0]instanceof Array?arguments[0]:y.call(arguments);return i(function(b){var c=0,d=new C,e=B.scheduleRecursive(function(e){var f,i;if(c<a.length)f=a[c++],i=new v,d.disposable(i),i.disposable(f.subscribe(function(a){b.onNext(a)},function(){e()},function(){e()}));else b.onCompleted()});return new p(d,e)})},Aa=function(){function a(a,c){var d=this;this.selector=a;this.observer=
c;this.leftQ=[];this.rightQ=[];this.left=I(function(a){if("E"===a.kind)d.observer.onError(a.exception);else if(0===d.rightQ.length)d.leftQ.push(a);else d.onNext(a,d.rightQ.shift())});this.right=I(function(a){if("E"===a.kind)d.observer.onError(a.exception);else if(0===d.leftQ.length)d.rightQ.push(a);else d.onNext(d.leftQ.shift(),a)})}a.prototype.onNext=function(a,c){var d;if("C"===a.kind||"C"===c.kind)this.observer.onCompleted();else{try{d=this.selector(a.value,c.value)}catch(e){this.observer.onError(e);
return}this.observer.onNext(d)}};return a}();f.zip=function(a,b){return F(this,a,function(a){var d=new Aa(b,a);return new H(function(a){return d.left.onNext(a)},function(a){return d.right.onNext(a)})})};var ha;ha=function(){function a(a,c){var d=this;this.selector=a;this.observer=c;this.rightStopped=this.leftStopped=!1;this.left=I(function(a){if("N"===a.kind)if(d.leftValue=a,d.rightValue!==n)d.onNext();else{if(d.rightStopped)d.observer.onCompleted()}else if("E"===a.kind)d.observer.onError(a.exception);
else if(d.leftStopped=!0,d.rightStopped)d.observer.onCompleted()});this.right=I(function(a){if("N"===a.kind)if(d.rightValue=a,d.leftValue!==n)d.onNext();else{if(d.leftStopped)d.observer.onCompleted()}else if("E"===a.kind)d.observer.onError(a.exception);else if(d.rightStopped=!0,d.leftStopped)d.observer.onCompleted()})}a.prototype.onNext=function(){var a;try{a=this.selector(this.leftValue.value,this.rightValue.value)}catch(c){this.observer.onError(c);return}this.observer.onNext(a)};return a}();f.combineLatest=
function(a,b){return F(this,a,function(a){var d=new ha(b,a);return new H(function(a){return d.left.onNext(a)},function(a){return d.right.onNext(a)})})};f.takeUntil=function(a){return F(a,this,function(a,c){var d=!1,e=!1;return new H(function(c){!e&&!d&&("C"===c.kind?d=!0:"E"===c.kind?(e=d=!0,a.onError(c.exception)):(e=!0,a.onCompleted()))},function(d){e||(d.accept(a),(e="N"!==d.kind)&&c.dispose())})})};f.skipUntil=function(a){return F(this,a,function(a,c,d){var e=!1,f=!1;return new H(function(c){if("E"==
c.kind)a.onError(c.exception);else e&&c.accept(a)},function(c){if(!f){if("N"===c.kind)e=!0;else if("E"===c.kind)a.onError(c.exception);f=!0;d.dispose()}})})};j.amb=function(){var a=da(),b,c=1===arguments.length&&arguments[0]instanceof Array?arguments[0]:y.call(arguments);for(b=0;b<c.length;b++)a=a.amb(c[b]);return a};f.amb=function(a){return F(this,a,function(a,c,d){var e="N";return new H(function(c){"N"===e&&(e="L",d.dispose());"L"===e&&c.accept(a)},function(d){"N"===e&&(e="R",c.dispose());"R"===
e&&d.accept(a)})})}};

},{}],24:[function(require,module,exports){
/*
 Copyright (c) Microsoft Corporation.  All rights reserved.
 This code is licensed by Microsoft Corporation under the terms
 of the MICROSOFT REACTIVE EXTENSIONS FOR JAVASCRIPT AND .NET LIBRARIES License.
 See http://go.microsoft.com/fwlink/?LinkID=220762.
*/
module.exports = function(q,h){var f;f=q.Rx;var z=f.Observable,u=f.CompositeDisposable,E=f.RefCountDisposable,s=f.SingleAssignmentDisposable,K=f.SerialDisposable,A=f.Subject;f=z.prototype;var L=z.empty,v=z.createWithDisposable,M=function(b,a){return b===a},N=function(){},B=function(b,a){return v(function(c){return new u(a.getDisposable(),b.subscribe(c))})},C,F,o,G,w,x;o=[1,3,7,13,31,61,127,251,509,1021,2039,4093,8191,16381,
32749,65521,131071,262139,524287,1048573,2097143,4194301,8388593,16777213,33554393,67108859,134217689,268435399,536870909,1073741789,2147483647];F=function(b){var a,c;if(b&0)return 2===b;a=Math.sqrt(b);for(c=3;c<=a;){if(0===b%c)return!1;c+=2}return!0};C=function(b){var a,c;for(a=0;a<o.length;++a)if(c=o[a],c>=b)return c;for(a=b|1;a<o[o.length-1];){if(F(a))return a;a+=2}return b};G=0;w=function(b){var a;if(b===h)throw"no such key";if(b.getHashCode!==h)return b.getHashCode();a=17*G++;b.getHashCode=function(){return a};
return a};x=function(){return{key:null,value:null,next:0,hashCode:0}};var y=function(){function b(a,c){this._initialize(a);this.comparer=c||M;this.size=this.freeCount=0;this.freeList=-1}b.prototype._initialize=function(a){var a=C(a),c;this.buckets=Array(a);this.entries=Array(a);for(c=0;c<a;c++)this.buckets[c]=-1,this.entries[c]=x();this.freeList=-1};b.prototype.count=function(){return this.size};b.prototype.add=function(a,c){return this._insert(a,c,!0)};b.prototype._insert=function(a,c,b){var e,d,
g;this.buckets===h&&this._initialize(0);g=w(a)&2147483647;e=g%this.buckets.length;for(d=this.buckets[e];0<=d;d=this.entries[d].next)if(this.entries[d].hashCode===g&&this.comparer(this.entries[d].key,a)){if(b)throw"duplicate key";this.entries[d].value=c;return}0<this.freeCount?(b=this.freeList,this.freeList=this.entries[b].next,--this.freeCount):(this.size===this.entries.length&&(this._resize(),e=g%this.buckets.length),b=this.size,++this.size);this.entries[b].hashCode=g;this.entries[b].next=this.buckets[e];
this.entries[b].key=a;this.entries[b].value=c;this.buckets[e]=b};b.prototype._resize=function(){var a,c,b,e,d;d=C(2*this.size);b=Array(d);for(a=0;a<b.length;++a)b[a]=-1;e=Array(d);for(a=0;a<this.size;++a)e[a]=this.entries[a];for(a=this.size;a<d;++a)e[a]=x();for(a=0;a<this.size;++a)c=e[a].hashCode%d,e[a].next=b[c],b[c]=a;this.buckets=b;this.entries=e};b.prototype.remove=function(a){var b,k,e,d;if(this.buckets!==h){d=w(a)&2147483647;b=d%this.buckets.length;k=-1;for(e=this.buckets[b];0<=e;e=this.entries[e].next){if(this.entries[e].hashCode===
d&&this.comparer(this.entries[e].key,a))return 0>k?this.buckets[b]=this.entries[e].next:this.entries[k].next=this.entries[e].next,this.entries[e].hashCode=-1,this.entries[e].next=this.freeList,this.entries[e].key=null,this.entries[e].value=null,this.freeList=e,++this.freeCount,!0;k=e}}return!1};b.prototype.clear=function(){var a;if(!(0>=this.size)){for(a=0;a<this.buckets.length;++a)this.buckets[a]=-1;for(a=0;a<this.size;++a)this.entries[a]=x();this.freeList=-1;this.size=0}};b.prototype._findEntry=
function(a){var b,k;if(this.buckets!==h){k=w(a)&2147483647;for(b=this.buckets[k%this.buckets.length];0<=b;b=this.entries[b].next)if(this.entries[b].hashCode===k&&this.comparer(this.entries[b].key,a))return b}return-1};b.prototype.count=function(){return this.size-this.freeCount};b.prototype.tryGetEntry=function(a){a=this._findEntry(a);return 0<=a?{key:this.entries[a].key,value:this.entries[a].value}:h};b.prototype.getValues=function(){var a=0,b,k=[];if(this.entries!==h)for(b=0;b<this.size;b++)if(0<=
this.entries[b].hashCode)k[a++]=this.entries[b].value;return k};b.prototype.get=function(a){a=this._findEntry(a);if(0<=a)return this.entries[a].value;throw Error("no such key");};b.prototype.set=function(a,b){this._insert(a,b,!1)};b.prototype.containskey=function(a){return 0<=this._findEntry(a)};return b}();f.join=function(b,a,c,k){var e=this;return v(function(d){var g=new u,j=!1,f=0,l=new y,h=!1,r=0,t=new y;g.add(e.subscribe(function(b){var c,e,p=f++,i=new s,H;l.add(p,b);g.add(i);e=function(){if(l.remove(p)&&
0===l.count()&&j)d.onCompleted();return g.remove(i)};try{c=a(b)}catch(h){d.onError(h);return}i.disposable(c.take(1).subscribe(function(){},function(a){d.onError(a)},function(){e()}));c=t.getValues();for(var n=0;n<c.length;n++){try{H=k(b,c[n])}catch(r){d.onError(r);break}d.onNext(H)}},function(a){d.onError(a)},function(){j=!0;if(h||0===l.count())d.onCompleted()}));g.add(b.subscribe(function(a){var b,e,p=r++,i=new s,j;t.add(p,a);g.add(i);e=function(){if(t.remove(p)&&0===t.count()&&h)d.onCompleted();
return g.remove(i)};try{b=c(a)}catch(f){d.onError(f);return}i.disposable(b.take(1).subscribe(function(){},function(a){d.onError(a)},function(){e()}));b=l.getValues();for(var n=0;n<b.length;n++){try{j=k(b[n],a)}catch(O){d.onError(O);break}d.onNext(j)}},function(a){d.onError(a)},function(){h=!0;if(j||0===t.count())d.onCompleted()}));return g})};f.groupJoin=function(b,a,c,k){var e=this;return v(function(d){var g=new u,j=new E(g),f=0,l=new y,h=0,r=new y;g.add(e.subscribe(function(b){var c,e,m,p=f++,i,
h,D,n=new A;l.add(p,n);try{m=k(b,B(n,j))}catch(o){i=l.getValues();for(m=0;m<i.length;m++)i[m].onError(o);d.onError(o);return}d.onNext(m);D=r.getValues();for(m=0;m<D.length;m++)n.onNext(D[m]);h=new s;g.add(h);e=function(){if(l.remove(p))n.onCompleted();g.remove(h)};try{c=a(b)}catch(q){i=l.getValues();for(m=0;m<i.length;m++)i[m].onError(q);d.onError(q);return}h.disposable(c.take(1).subscribe(function(){},function(a){var b;i=l.getValues();for(b=0;b<i.length;b++)i[b].onError(a);d.onError(a)},function(){e()}))},
function(a){var b,c;c=l.getValues();for(b=0;b<c.length;b++)c[b].onError(a);d.onError(a)},function(){d.onCompleted()}));g.add(b.subscribe(function(a){var b,e,k,f,i;k=h++;r.add(k,a);i=new s;g.add(i);e=function(){r.remove(k);g.remove(i)};try{b=c(a)}catch(j){f=l.getValues();for(b=0;b<f.length;b++)f[b].onError(j);d.onError(j);return}i.disposable(b.take(1).subscribe(function(){},function(a){var b;f=l.getValues();for(b=0;b<f.length;b++)f[b].onError(a);d.onError(a)},function(){e()}));f=l.getValues();for(b=
0;b<f.length;b++)f[b].onNext(a)},function(b){var a,c;c=l.getValues();for(a=0;a<c.length;a++)c[a].onError(b);d.onError(b)}));return j})};f.buffer=function(b,a){return"function"===typeof b?I(b).selectMany(function(a){return observableToArray(a)}):J(this,b,a).selectMany(function(a){return observableToArray(a)})};f.window=function(b,a){return"function"===typeof b?I.call(this,b):J.call(this,b,a)};var J=function(b,a){return b.groupJoin(this,a,function(){return L()},function(a,b){return b})},I=function(b){var a=
this;return v(function(c){var f,e=new K,d=new u(e),g=new E(d),j=new A;c.onNext(B(j,g));d.add(a.subscribe(function(a){j.onNext(a)},function(a){j.onError(a);c.onError(a)},function(){j.onCompleted();c.onCompleted()}));f=function(){var a,d;try{d=b()}catch(h){c.onError(h);return}a=new s;e.disposable(a);a.disposable(d.take(1).subscribe(N,function(a){j.onError(a);c.onError(a)},function(){j.onCompleted();j=new A;c.onNext(B(j,g));f()}))};f();return g})}};

},{}],25:[function(require,module,exports){
/*
 Copyright (c) Microsoft Corporation.  All rights reserved.
 This code is licensed by Microsoft Corporation under the terms
 of the MICROSOFT REACTIVE EXTENSIONS FOR JAVASCRIPT AND .NET LIBRARIES License.
 See http://go.microsoft.com/fwlink/?LinkID=220762.
*/
module.exports = function(k,h){var i;i=k.Rx;var w=Array.prototype.slice,x=Object.prototype.hasOwnProperty,y=function(b,a){function c(){this.constructor=b}for(var f in a)x.call(a,f)&&(b[f]=a[f]);c.prototype=a.prototype;b.prototype=new c;b.base=a.prototype;return b},l=i.Observable,p=l.prototype,z=l.createWithDisposable,A=l.throwException,B=i.Observer.create,q=i.Internals.List,C=i.SingleAssignmentDisposable,D=i.CompositeDisposable,
E=i.Internals.AbstractObserver,F=function(b,a){return b===a},o,r,j,s,m,n;j=[1,3,7,13,31,61,127,251,509,1021,2039,4093,8191,16381,32749,65521,131071,262139,524287,1048573,2097143,4194301,8388593,16777213,33554393,67108859,134217689,268435399,536870909,1073741789,2147483647];r=function(b){var a,c;if(b&0)return 2===b;a=Math.sqrt(b);for(c=3;c<=a;){if(0===b%c)return!1;c+=2}return!0};o=function(b){var a,c;for(a=0;a<j.length;++a)if(c=j[a],c>=b)return c;for(a=b|1;a<j[j.length-1];){if(r(a))return a;a+=2}return b};
s=0;m=function(b){var a;if(b===h)throw"no such key";if(b.getHashCode!==h)return b.getHashCode();a=17*s++;b.getHashCode=function(){return a};return a};n=function(){return{key:null,value:null,next:0,hashCode:0}};var t=function(){function b(a,c){this._initialize(a);this.comparer=c||F;this.size=this.freeCount=0;this.freeList=-1}b.prototype._initialize=function(a){var a=o(a),c;this.buckets=Array(a);this.entries=Array(a);for(c=0;c<a;c++)this.buckets[c]=-1,this.entries[c]=n();this.freeList=-1};b.prototype.count=
function(){return this.size};b.prototype.add=function(a,c){return this._insert(a,c,!0)};b.prototype._insert=function(a,c,b){var d,e,g;this.buckets===h&&this._initialize(0);g=m(a)&2147483647;d=g%this.buckets.length;for(e=this.buckets[d];0<=e;e=this.entries[e].next)if(this.entries[e].hashCode===g&&this.comparer(this.entries[e].key,a)){if(b)throw"duplicate key";this.entries[e].value=c;return}0<this.freeCount?(b=this.freeList,this.freeList=this.entries[b].next,--this.freeCount):(this.size===this.entries.length&&
(this._resize(),d=g%this.buckets.length),b=this.size,++this.size);this.entries[b].hashCode=g;this.entries[b].next=this.buckets[d];this.entries[b].key=a;this.entries[b].value=c;this.buckets[d]=b};b.prototype._resize=function(){var a,c,b,d,e;e=o(2*this.size);b=Array(e);for(a=0;a<b.length;++a)b[a]=-1;d=Array(e);for(a=0;a<this.size;++a)d[a]=this.entries[a];for(a=this.size;a<e;++a)d[a]=n();for(a=0;a<this.size;++a)c=d[a].hashCode%e,d[a].next=b[c],b[c]=a;this.buckets=b;this.entries=d};b.prototype.remove=
function(a){var c,b,d,e;if(this.buckets!==h){e=m(a)&2147483647;c=e%this.buckets.length;b=-1;for(d=this.buckets[c];0<=d;d=this.entries[d].next){if(this.entries[d].hashCode===e&&this.comparer(this.entries[d].key,a))return 0>b?this.buckets[c]=this.entries[d].next:this.entries[b].next=this.entries[d].next,this.entries[d].hashCode=-1,this.entries[d].next=this.freeList,this.entries[d].key=null,this.entries[d].value=null,this.freeList=d,++this.freeCount,!0;b=d}}return!1};b.prototype.clear=function(){var a;
if(!(0>=this.size)){for(a=0;a<this.buckets.length;++a)this.buckets[a]=-1;for(a=0;a<this.size;++a)this.entries[a]=n();this.freeList=-1;this.size=0}};b.prototype._findEntry=function(a){var c,b;if(this.buckets!==h){b=m(a)&2147483647;for(c=this.buckets[b%this.buckets.length];0<=c;c=this.entries[c].next)if(this.entries[c].hashCode===b&&this.comparer(this.entries[c].key,a))return c}return-1};b.prototype.count=function(){return this.size-this.freeCount};b.prototype.tryGetEntry=function(a){a=this._findEntry(a);
return 0<=a?{key:this.entries[a].key,value:this.entries[a].value}:h};b.prototype.getValues=function(){var a=0,c,b=[];if(this.entries!==h)for(c=0;c<this.size;c++)if(0<=this.entries[c].hashCode)b[a++]=this.entries[c].value;return b};b.prototype.get=function(a){a=this._findEntry(a);if(0<=a)return this.entries[a].value;throw Error("no such key");};b.prototype.set=function(a,b){this._insert(a,b,!1)};b.prototype.containskey=function(a){return 0<=this._findEntry(a)};return b}(),u=function(){function b(a){this.patterns=
a}b.prototype.and=function(a){var c=this.patterns,f,d;d=[];for(f=0;f<c.length;f++)d.push(c[f]);d.push(a);return new b(d)};b.prototype.then=function(a){return new G(this,a)};return b}(),G=function(){function b(a,b){this.expression=a;this.selector=b}b.prototype.activate=function(a,b,f){var d,e,g,h;h=this;g=[];for(e=0;e<this.expression.patterns.length;e++)g.push(H(a,this.expression.patterns[e],function(a){b.onError(a)}));d=new v(g,function(){var a;try{a=h.selector.apply(h,arguments)}catch(d){b.onError(d);
return}b.onNext(a)},function(){var a;for(a=0;a<g.length;a++)g[a].removeActivePlan(d);f(d)});for(e=0;e<g.length;e++)g[e].addActivePlan(d);return d};return b}(),H=function(b,a,c){var f;f=b.tryGetEntry(a);return f===h?(c=new I(a,c),b.add(a,c),c):f.value},v;v=function(){function b(a,b,f){this.joinObserverArray=a;this.onNext=b;this.onCompleted=f;this.joinObservers=new t;for(a=0;a<this.joinObserverArray.length;a++)b=this.joinObserverArray[a],this.joinObservers.add(b,b)}b.prototype.dequeue=function(){var a,
b;b=this.joinObservers.getValues();for(a=0;a<b.length;a++)b[a].queue.shift()};b.prototype.match=function(){var a,b,f;a=!0;for(b=0;b<this.joinObserverArray.length;b++)if(0===this.joinObserverArray[b].queue.length){a=!1;break}if(a){a=[];f=!1;for(b=0;b<this.joinObserverArray.length;b++)a.push(this.joinObserverArray[b].queue[0]),"C"===this.joinObserverArray[b].queue[0].kind&&(f=!0);if(f)this.onCompleted();else{this.dequeue();f=[];for(b=0;b<a.length;b++)f.push(a[b].value);this.onNext.apply(this,f)}}};
return b}();var I=function(){function b(a,b){this.source=a;this.onError=b;this.queue=[];this.activePlans=new q;this.subscription=new C;this.isDisposed=!1}y(b,E);b.prototype.addActivePlan=function(a){this.activePlans.add(a)};b.prototype.subscribe=function(){this.subscription.disposable(this.source.materialize().subscribe(this))};b.prototype.next=function(a){var b;if(!this.isDisposed)if("E"===a.kind)this.onError(a.exception);else{this.queue.push(a);a=this.activePlans.toArray();for(b=0;b<a.length;b++)a[b].match()}};
b.prototype.error=function(){};b.prototype.completed=function(){};b.prototype.removeActivePlan=function(a){this.activePlans.remove(a);0===this.activePlans.count()&&this.dispose()};b.prototype.dispose=function(){b.base.dispose.call(this);if(!this.isDisposed)this.isDisposed=!0,this.subscription.dispose()};return b}();p.and=function(b){return new u([this,b])};p.then=function(b){return(new u([this])).then(b)};l.when=function(){var b=1===arguments.length&&arguments[0]instanceof Array?arguments[0]:w.call(arguments);
return z(function(a){var c=new q,f=new t,d,e,g,h,i;i=B(function(b){a.onNext(b)},function(b){for(var c=f.getValues(),d=0;d<c.length;d++)c[d].onError(b);a.onError(b)},function(){a.onCompleted()});try{for(e=0;e<b.length;e++)c.add(b[e].activate(f,i,function(a){c.remove(a);if(0===c.count())i.onCompleted()}))}catch(j){A(j).subscribe(a)}d=new D;h=f.getValues();for(e=0;e<h.length;e++)g=h[e],g.subscribe(),d.add(g);return d})}};

},{}],26:[function(require,module,exports){
/*
 Copyright (c) Microsoft Corporation.  All rights reserved.
 This code is licensed by Microsoft Corporation under the terms
 of the MICROSOFT REACTIVE EXTENSIONS FOR JAVASCRIPT AND .NET LIBRARIES License.
 See http://go.microsoft.com/fwlink/?LinkID=220762.
*/
module.exports = function(w,n){var p;p=w.Rx;var q=p.Observable,o=q.prototype,m=q.createWithDisposable,y=q.defer,F=q.throwException,l=p.Scheduler.Timeout,r=p.SingleAssignmentDisposable,t=p.SerialDisposable,s=p.CompositeDisposable,z=p.RefCountDisposable,u=p.Subject,G=p.Internals.BinaryObserver,v=function(a,b){return m(function(c){return new s(b.getDisposable(),a.subscribe(c))})},H=function(a,b,c){return m(function(d){var f=
new r,e=new r,d=c(d,f,e);f.disposable(a.materialize().select(function(b){return{switchValue:function(c){return c(b)}}}).subscribe(d));e.disposable(b.materialize().select(function(b){return{switchValue:function(c,a){return a(b)}}}).subscribe(d));return new s(f,e)})},I=function(a,b){return m(function(c){return b.scheduleWithAbsolute(a,function(){c.onNext(0);c.onCompleted()})})},A=function(a,b,c){var d=0>b?0:b;return m(function(b){var e=0,g=a;return c.scheduleRecursiveWithAbsolute(g,function(a){var i;
0<d&&(i=c.now(),g+=d,g<=i&&(g=i+d));b.onNext(e++);a(g)})})},J=function(a,b){var c=0>a?0:a;return m(function(a){return b.scheduleWithRelative(c,function(){a.onNext(0);a.onCompleted()})})},B=function(a,b,c){return y(function(){return A(c.now()+a,b,c)})},K=q.interval=function(a,b){b||(b=l);return B(a,a,b)};q.timer=function(a,b,c){var d;c||(c=l);b!==n&&"number"===typeof b?d=b:b!==n&&"object"===typeof b&&(c=b);return a instanceof Date&&d===n?I(a.getTime(),c):a instanceof Date&&d!==n?A(a.getTime(),b,c):
d===n?J(a,c):B(a,d,c)};var D=function(a,b,c){return m(function(d){var f=!1,e=new t,g=null,h=[],i=!1,j;j=a.materialize().timestamp(c).subscribe(function(a){"E"===a.value.kind?(h=[],h.push(a),g=a.value.exception,a=!i):(h.push({value:a.value,timestamp:a.timestamp+b}),a=!f,f=!0);if(a)if(null!==g)d.onError(g);else a=new r,e.disposable(a),a.disposable(c.scheduleRecursiveWithRelative(b,function(a){var b,e,j;if(null===g){i=!0;do{b=null;if(0<h.length&&0>=h[0].timestamp-c.now())b=h.shift().value;null!==b&&
b.accept(d)}while(null!==b);j=!1;e=0;0<h.length?(j=!0,e=Math.max(0,h[0].timestamp-c.now())):f=!1;b=g;i=!1;if(null!==b)d.onError(b);else j&&a(e)}}))});return new s(j,e)})},L=function(a,b,c){return y(function(){var a=b-c.now();return D(a,c)})};o.delay=function(a,b){b||(b=l);return a instanceof Date?L(this,a.getTime(),b):D(this,a,b)};o.throttle=function(a,b){b||(b=l);var c=this;return m(function(d){var f=new t,e=!1,g=0,h,i=null;h=c.subscribe(function(c){var k;e=!0;i=c;g++;k=g;c=new r;f.disposable(c);
c.disposable(b.scheduleWithRelative(a,function(){if(e&&g===k)d.onNext(i);e=!1}))},function(a){f.dispose();d.onError(a);e=!1;g++},function(){f.dispose();if(e)d.onNext(i);d.onCompleted();e=!1;g++});return new s(h,f)})};o.windowWithTime=function(a,b,c){var d=this,f;b===n&&(f=a);c===n&&(c=l);"number"===typeof b?f=b:"object"===typeof b&&(f=a,c=b);return m(function(b){var g,h,i=f,j=a,k=[],x,C=new t,l=0;h=new s(C);x=new z(h);g=function(){var a,d,h,m,n;h=new r;C.disposable(h);a=d=!1;j===i?a=d=!0:j<i?d=!0:
a=!0;m=d?j:i;n=m-l;l=m;d&&(j+=f);a&&(i+=f);h.disposable(c.scheduleWithRelative(n,function(){var c;a&&(c=new u,k.push(c),b.onNext(v(c,x)));d&&(c=k.shift(),c.onCompleted());g()}))};k.push(new u);b.onNext(v(k[0],x));g();h.add(d.subscribe(function(a){var b,c;for(b=0;b<k.length;b++)c=k[b],c.onNext(a)},function(a){var c,d;for(c=0;c<k.length;c++)d=k[c],d.onError(a);b.onError(a)},function(){var a,c;for(a=0;a<k.length;a++)c=k[a],c.onCompleted();b.onCompleted()}));return x})};o.windowWithTimeOrCount=function(a,
b,c){var d=this;c||(c=l);return m(function(f){var e,g,h=0,i,j,k=new t,l=0;g=new s(k);i=new z(g);e=function(b){var d=new r;k.disposable(d);d.disposable(c.scheduleWithRelative(a,function(){var a;b===l&&(h=0,a=++l,j.onCompleted(),j=new u,f.onNext(v(j,i)),e(a))}))};j=new u;f.onNext(v(j,i));e(0);g.add(d.subscribe(function(a){var c=0,d=!1;j.onNext(a);h++;h===b&&(d=!0,h=0,c=++l,j.onCompleted(),j=new u,f.onNext(v(j,i)));d&&e(c)},function(a){j.onError(a);f.onError(a)},function(){j.onCompleted();f.onCompleted()}));
return i})};o.bufferWithTime=function(a,b,c){var d;b===n&&(d=a);c||(c=l);"number"===typeof b?d=b:"object"===typeof b&&(d=a,c=b);return this.windowWithTime(a,d,c).selectMany(function(a){return a.toArray()})};o.bufferWithTimeOrCount=function(a,b,c){c||(c=l);return this.windowWithTimeOrCount(a,b,c).selectMany(function(a){return a.toArray()})};o.timeInterval=function(a){var b=this;a||(a=l);return y(function(){var c=a.now();return b.select(function(b){var f=a.now(),e=f-c;c=f;return{value:b,interval:e}})})};
o.timestamp=function(a){a||(a=l);return this.select(function(b){return{value:b,timestamp:a.now()}})};var E=function(a,b){return H(a,b,function(a){var b=!1,f;return new G(function(e){"N"===e.kind&&(f=e);"E"===e.kind&&e.accept(a);"C"===e.kind&&(b=!0)},function(){var e=f;f=n;e!==n&&e.accept(a);if(b)a.onCompleted()})})};o.sample=function(a,b){b||(b=l);return"number"===typeof a?E(this,K(a,b)):E(this,a)};o.timeout=function(a,b,c){var d,f=this;b===n&&(b=F(Error("Timeout")));c||(c=l);d=a instanceof Date?
function(a,b){c.scheduleWithAbsolute(a,b)}:function(a,b){c.scheduleWithRelative(a,b)};return m(function(c){var g,h=0,i=new r,j=new t,k=!1,l=new t;j.disposable(i);g=function(){var f=h;l.disposable(d(a,function(){(k=h===f)&&j.disposable(b.subscribe(c))}))};g();i.disposable(f.subscribe(function(a){k||(h++,c.onNext(a),g())},function(a){k||(h++,c.onError(a))},function(){k||(h++,c.onCompleted())}));return new s(j,l)})};q.generateWithAbsoluteTime=function(a,b,c,d,f,e){e||(e=l);return m(function(g){var h=
!0,i=!1,j,k=a,l;return e.scheduleRecursiveWithAbsolute(e.now(),function(a){if(i)g.onNext(j);try{if(h?h=!1:k=c(k),i=b(k))j=d(k),l=f(k)}catch(e){g.onError(e);return}if(i)a(l);else g.onCompleted()})})};q.generateWithRelativeTime=function(a,b,c,d,f,e){e||(e=l);return m(function(g){var h=!0,i=!1,j,k=a,l;return e.scheduleRecursiveWithRelative(0,function(a){if(i)g.onNext(j);try{if(h?h=!1:k=c(k),i=b(k))j=d(k),l=f(k)}catch(e){g.onError(e);return}if(i)a(l);else g.onCompleted()})})}};

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvZGV2aWNlL2pzL2RldmljZS5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2Fzc2V0cy8zcmRwYXJ0eS9yb3V0aWUuanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvZGV2aWNlL2pzL2NvbnRyb2xsZXJzL2pvaW4uanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvZGV2aWNlL2pzL2NvbnRyb2xsZXJzL3RoYW5rcy5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2NvbmZpZy5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2Fzc2V0cy8zcmRwYXJ0eS9zb2NrZXQuaW8ubWluLmpzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvYXNzZXRzL2RldmljZS9qcy9wbGF5ZXIuanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvYXNzZXRzL2RldmljZS9qcy9jb250cm9sbGVycy9yZWdpc3Rlci5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2Fzc2V0cy9kZXZpY2UvanMvY29udHJvbGxlcnMvd2FpdC5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2Fzc2V0cy9kZXZpY2UvanMvY29udHJvbGxlcnMvbG9iYnkuanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvZGV2aWNlL2pzL2NvbnRyb2xsZXJzL2dhbWVwYWQuanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvM3JkcGFydHkvcnguemVwdG8uanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvZGV2aWNlL3ZpZXdzL3JlZ2lzdGVyLXNpbXBsZS5oYnMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9hc3NldHMvZGV2aWNlL3ZpZXdzL3dhaXQuaGJzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvYXNzZXRzL2RldmljZS92aWV3cy9qb2luLmhicyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2Fzc2V0cy9kZXZpY2Uvdmlld3MvbG9iYnkuaGJzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvYXNzZXRzL2RldmljZS92aWV3cy9nYW1lcGFkLmhicyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL2Fzc2V0cy9kZXZpY2Uvdmlld3MvdGhhbmtzLmhicyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzLXJ1bnRpbWUvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvbm9kZV9tb2R1bGVzL3J4anMvbGliL3J4LmpzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvbm9kZV9tb2R1bGVzL3J4anMvbGliL3J4LmFnZ3JlZ2F0ZXMubWluLmpzIiwiL1VzZXJzL2ttY25laWxsL2pldHBldHMvbm9kZV9tb2R1bGVzL3J4anMvbGliL3J4Lm1pbi5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL25vZGVfbW9kdWxlcy9yeGpzL2xpYi9yeC5jb2luY2lkZW5jZS5taW4uanMiLCIvVXNlcnMva21jbmVpbGwvamV0cGV0cy9ub2RlX21vZHVsZXMvcnhqcy9saWIvcnguam9pbnBhdHRlcm5zLm1pbi5qcyIsIi9Vc2Vycy9rbWNuZWlsbC9qZXRwZXRzL25vZGVfbW9kdWxlcy9yeGpzL2xpYi9yeC50aW1lLm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcm91dGllID0gcmVxdWlyZSgnLi4vLi4vM3JkcGFydHkvcm91dGllJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcblxud2luZG93LkRldmljZSA9IGZ1bmN0aW9uKCkge1xuICBcbiAgcm91dGllKHtcbiAgICAnJzogICAgICAgICAgICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3JlZ2lzdGVyJyksXG4gICAgJy9yZWdpc3Rlcic6ICAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9yZWdpc3RlcicpLFxuICAgICcvd2FpdCc6ICAgICAgIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvd2FpdCcpLFxuICAgICcvam9pbic6ICAgICAgIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvam9pbicpLFxuICAgICcvbG9iYnknOiAgICAgIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvbG9iYnknKSxcbiAgICAnL2dhbWVwYWQnOiAgICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2dhbWVwYWQnKSxcbiAgICAnL3RoYW5rcyc6ICAgICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3RoYW5rcycpXG4gIH0pO1xuICBcbiAgJCgnI21lbnUnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LmNvbmZpcm0oJ2Rpc2Nvbm5lY3QgcGxheWVyPycpKSB7XG4gICAgICBwbGF5ZXIucmVzZXQoKTtcbiAgICAgIHJvdXRpZS5uYXZpZ2F0ZSgnLycpO1xuICAgIH1cbiAgfSk7XG4gIFxufTsiLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSh3aW5kb3cpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIChyb290LnJvdXRpZSA9IGZhY3Rvcnkod2luZG93KSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5yb3V0aWUgPSBmYWN0b3J5KHdpbmRvdyk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKHcpIHtcblxuICB2YXIgcm91dGVzID0gW107XG4gIHZhciBtYXAgPSB7fTtcbiAgdmFyIHJlZmVyZW5jZSA9IFwicm91dGllXCI7XG4gIHZhciBvbGRSZWZlcmVuY2UgPSB3W3JlZmVyZW5jZV07XG5cbiAgdmFyIFJvdXRlID0gZnVuY3Rpb24ocGF0aCwgbmFtZSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmtleXMgPSBbXTtcbiAgICB0aGlzLmZucyA9IFtdO1xuICAgIHRoaXMucGFyYW1zID0ge307XG4gICAgdGhpcy5yZWdleCA9IHBhdGhUb1JlZ2V4cCh0aGlzLnBhdGgsIHRoaXMua2V5cywgZmFsc2UsIGZhbHNlKTtcblxuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24oZm4pIHtcbiAgICB0aGlzLmZucy5wdXNoKGZuKTtcbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUucmVtb3ZlSGFuZGxlciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMgPSB0aGlzLmZucy5sZW5ndGg7IGkgPCBjOyBpKyspIHtcbiAgICAgIHZhciBmID0gdGhpcy5mbnNbaV07XG4gICAgICBpZiAoZm4gPT0gZikge1xuICAgICAgICB0aGlzLmZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIGZvciAodmFyIGkgPSAwLCBjID0gdGhpcy5mbnMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICB0aGlzLmZuc1tpXS5hcHBseSh0aGlzLCBwYXJhbXMpO1xuICAgIH1cbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbihwYXRoLCBwYXJhbXMpe1xuICAgIHZhciBtID0gdGhpcy5yZWdleC5leGVjKHBhdGgpO1xuXG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cblxuICAgIGZvciAodmFyIGkgPSAxLCBsZW4gPSBtLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB2YXIga2V5ID0gdGhpcy5rZXlzW2kgLSAxXTtcblxuICAgICAgdmFyIHZhbCA9ICgnc3RyaW5nJyA9PSB0eXBlb2YgbVtpXSkgPyBkZWNvZGVVUklDb21wb25lbnQobVtpXSkgOiBtW2ldO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHRoaXMucGFyYW1zW2tleS5uYW1lXSA9IHZhbDtcbiAgICAgIH1cbiAgICAgIHBhcmFtcy5wdXNoKHZhbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnRvVVJMID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIHBhdGggPSB0aGlzLnBhdGg7XG4gICAgZm9yICh2YXIgcGFyYW0gaW4gcGFyYW1zKSB7XG4gICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKCcvOicrcGFyYW0sICcvJytwYXJhbXNbcGFyYW1dKTtcbiAgICB9XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvOi4qXFw/L2csICcvJykucmVwbGFjZSgvXFw/L2csICcnKTtcbiAgICBpZiAocGF0aC5pbmRleE9mKCc6JykgIT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBwYXJhbWV0ZXJzIGZvciB1cmw6ICcrcGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9O1xuXG4gIHZhciBwYXRoVG9SZWdleHAgPSBmdW5jdGlvbihwYXRoLCBrZXlzLCBzZW5zaXRpdmUsIHN0cmljdCkge1xuICAgIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gcGF0aDtcbiAgICBpZiAocGF0aCBpbnN0YW5jZW9mIEFycmF5KSBwYXRoID0gJygnICsgcGF0aC5qb2luKCd8JykgKyAnKSc7XG4gICAgcGF0aCA9IHBhdGhcbiAgICAgIC5jb25jYXQoc3RyaWN0ID8gJycgOiAnLz8nKVxuICAgICAgLnJlcGxhY2UoL1xcL1xcKC9nLCAnKD86LycpXG4gICAgICAucmVwbGFjZSgvXFwrL2csICdfX3BsdXNfXycpXG4gICAgICAucmVwbGFjZSgvKFxcLyk/KFxcLik/OihcXHcrKSg/OihcXCguKj9cXCkpKT8oXFw/KT8vZywgZnVuY3Rpb24oXywgc2xhc2gsIGZvcm1hdCwga2V5LCBjYXB0dXJlLCBvcHRpb25hbCl7XG4gICAgICAgIGtleXMucHVzaCh7IG5hbWU6IGtleSwgb3B0aW9uYWw6ICEhIG9wdGlvbmFsIH0pO1xuICAgICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgICByZXR1cm4gJycgKyAob3B0aW9uYWwgPyAnJyA6IHNsYXNoKSArICcoPzonICsgKG9wdGlvbmFsID8gc2xhc2ggOiAnJykgKyAoZm9ybWF0IHx8ICcnKSArIChjYXB0dXJlIHx8IChmb3JtYXQgJiYgJyhbXi8uXSs/KScgfHwgJyhbXi9dKz8pJykpICsgJyknICsgKG9wdGlvbmFsIHx8ICcnKTtcbiAgICAgIH0pXG4gICAgICAucmVwbGFjZSgvKFtcXC8uXSkvZywgJ1xcXFwkMScpXG4gICAgICAucmVwbGFjZSgvX19wbHVzX18vZywgJyguKyknKVxuICAgICAgLnJlcGxhY2UoL1xcKi9nLCAnKC4qKScpO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKCdeJyArIHBhdGggKyAnJCcsIHNlbnNpdGl2ZSA/ICcnIDogJ2knKTtcbiAgfTtcblxuICB2YXIgYWRkSGFuZGxlciA9IGZ1bmN0aW9uKHBhdGgsIGZuKSB7XG4gICAgdmFyIHMgPSBwYXRoLnNwbGl0KCcgJyk7XG4gICAgdmFyIG5hbWUgPSAocy5sZW5ndGggPT0gMikgPyBzWzBdIDogbnVsbDtcbiAgICBwYXRoID0gKHMubGVuZ3RoID09IDIpID8gc1sxXSA6IHNbMF07XG5cbiAgICBpZiAoIW1hcFtwYXRoXSkge1xuICAgICAgbWFwW3BhdGhdID0gbmV3IFJvdXRlKHBhdGgsIG5hbWUpO1xuICAgICAgcm91dGVzLnB1c2gobWFwW3BhdGhdKTtcbiAgICB9XG4gICAgbWFwW3BhdGhdLmFkZEhhbmRsZXIoZm4pO1xuICB9O1xuXG4gIHZhciByb3V0aWUgPSBmdW5jdGlvbihwYXRoLCBmbikge1xuICAgIGlmICh0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWRkSGFuZGxlcihwYXRoLCBmbik7XG4gICAgICByb3V0aWUucmVsb2FkKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIgcCBpbiBwYXRoKSB7XG4gICAgICAgIGFkZEhhbmRsZXIocCwgcGF0aFtwXSk7XG4gICAgICB9XG4gICAgICByb3V0aWUucmVsb2FkKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByb3V0aWUubmF2aWdhdGUocGF0aCk7XG4gICAgfVxuICB9O1xuXG4gIHJvdXRpZS5sb29rdXAgPSBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgICBmb3IgKHZhciBpID0gMCwgYyA9IHJvdXRlcy5sZW5ndGg7IGkgPCBjOyBpKyspIHtcbiAgICAgIHZhciByb3V0ZSA9IHJvdXRlc1tpXTtcbiAgICAgIGlmIChyb3V0ZS5uYW1lID09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHJvdXRlLnRvVVJMKG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJvdXRpZS5yZW1vdmUgPSBmdW5jdGlvbihwYXRoLCBmbikge1xuICAgIHZhciByb3V0ZSA9IG1hcFtwYXRoXTtcbiAgICBpZiAoIXJvdXRlKVxuICAgICAgcmV0dXJuO1xuICAgIHJvdXRlLnJlbW92ZUhhbmRsZXIoZm4pO1xuICB9O1xuXG4gIHJvdXRpZS5yZW1vdmVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICBtYXAgPSB7fTtcbiAgICByb3V0ZXMgPSBbXTtcbiAgfTtcblxuICByb3V0aWUubmF2aWdhdGUgPSBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIHNpbGVudCA9IG9wdGlvbnMuc2lsZW50IHx8IGZhbHNlO1xuXG4gICAgaWYgKHNpbGVudCkge1xuICAgICAgcmVtb3ZlTGlzdGVuZXIoKTtcbiAgICB9XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcblxuICAgICAgaWYgKHNpbGVudCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgICBhZGRMaXN0ZW5lcigpO1xuICAgICAgICB9LCAxKTtcbiAgICAgIH1cblxuICAgIH0sIDEpO1xuICB9O1xuXG4gIHJvdXRpZS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgd1tyZWZlcmVuY2VdID0gb2xkUmVmZXJlbmNlO1xuICAgIHJldHVybiByb3V0aWU7XG4gIH07XG5cbiAgdmFyIGdldEhhc2ggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuICB9O1xuXG4gIHZhciBjaGVja1JvdXRlID0gZnVuY3Rpb24oaGFzaCwgcm91dGUpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgaWYgKHJvdXRlLm1hdGNoKGhhc2gsIHBhcmFtcykpIHtcbiAgICAgIHJvdXRlLnJ1bihwYXJhbXMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICB2YXIgaGFzaENoYW5nZWQgPSByb3V0aWUucmVsb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhc2ggPSBnZXRIYXNoKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGMgPSByb3V0ZXMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICB2YXIgcm91dGUgPSByb3V0ZXNbaV07XG4gICAgICBpZiAoY2hlY2tSb3V0ZShoYXNoLCByb3V0ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICB2YXIgYWRkTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAody5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICB3LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBoYXNoQ2hhbmdlZCwgZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3LmF0dGFjaEV2ZW50KCdvbmhhc2hjaGFuZ2UnLCBoYXNoQ2hhbmdlZCk7XG4gICAgfVxuICB9O1xuXG4gIHZhciByZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh3LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcbiAgICAgIHcucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIGhhc2hDaGFuZ2VkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdy5kZXRhY2hFdmVudCgnb25oYXNoY2hhbmdlJywgaGFzaENoYW5nZWQpO1xuICAgIH1cbiAgfTtcbiAgYWRkTGlzdGVuZXIoKTtcblxuICByZXR1cm4gcm91dGllO1xufSkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcm91dGllID0gcmVxdWlyZSgnLi4vLi4vLi4vM3JkcGFydHkvcm91dGllJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi4vcGxheWVyJyk7XG52YXIgdmlldyA9IHJlcXVpcmUoJy4uLy4uL3ZpZXdzL2pvaW4uaGJzJyk7XG5cbmZ1bmN0aW9uIGpvaW5lZCgpIHtcbiAgcm91dGllLm5hdmlnYXRlKCcvbG9iYnknKTtcbn1cblxuZnVuY3Rpb24gYmFja1RvV2FpdCgpIHtcbiAgcm91dGllLm5hdmlnYXRlKCcvd2FpdCcpO1xufVxuXG5mdW5jdGlvbiBqb2luTG9iYnkoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIHZhciBkYXRhID0geyBwbGF5ZXJJZDogcGxheWVyLmdldCgpLmlkIH07XG4gICQucG9zdCgnL2dhbWUvcGxheWVycycsIGRhdGEpLnRoZW4oam9pbmVkKS5mYWlsKGJhY2tUb1dhaXQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICBcbiAgaWYgKHBsYXllci5nZXQoKS5pZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcm91dGllLm5hdmlnYXRlKCcvY29ubmVjdCcpO1xuICB9XG4gIFxuICAkKCcjcGFnZScpLmF0dHIoJ2NsYXNzJywgJ2pvaW4nKTtcbiAgJCgnI3BhZ2UnKS5odG1sKHZpZXcoKSk7XG4gICQoJ2J1dHRvbicpLm9uKCdjbGljaycsIGpvaW5Mb2JieSk7XG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJvdXRpZSA9IHJlcXVpcmUoJy4uLy4uLy4uLzNyZHBhcnR5L3JvdXRpZScpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuLi8uLi92aWV3cy90aGFua3MuaGJzJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIFxuICAkKCcjcGFnZScpLmF0dHIoJ2NsYXNzJywgJ3RoYW5rcycpO1xuICAkKCcjcGFnZScpLmh0bWwodmlldyhjb25maWcpKTtcblxuICAkKCcjZG9uZScpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgIHJvdXRpZS5uYXZpZ2F0ZSgnL2pvaW4nKTtcbiAgfSk7XG5cbn07IiwidmFyIGNvbmZpZyA9IHt9O1xuXG5jb25maWcuYXNrX2Fib3V0X3NvY2lhbF9uZXR3b3JraW5nID0gdHJ1ZTtcblxuY29uZmlnLnR3aXR0ZXIgPSB7fTtcblxuY29uZmlnLnR3aXR0ZXIuaGFzaHRhZyA9IFwiI1Rob3VnaHRXb3Jrc1wiO1xuY29uZmlnLnR3aXR0ZXIubWVzc2FnZSA9IFwiSSBqdXN0IHNjb3JlZCB7MH0gcG9pbnRzIG9uIEpldFBldHMgYnkgQFRob3VnaHRXb3Jrcy4gI1lPVzIwMTNcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbmZpZzsiLCIvKiEgU29ja2V0LklPLm1pbi5qcyBidWlsZDowLjkuMTEsIHByb2R1Y3Rpb24uIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT4gTUlUIExpY2Vuc2VkICovXG52YXIgaW89XCJ1bmRlZmluZWRcIj09dHlwZW9mIG1vZHVsZT97fTptb2R1bGUuZXhwb3J0czsoZnVuY3Rpb24oKXsoZnVuY3Rpb24oYSxiKXt2YXIgYz1hO2MudmVyc2lvbj1cIjAuOS4xMVwiLGMucHJvdG9jb2w9MSxjLnRyYW5zcG9ydHM9W10sYy5qPVtdLGMuc29ja2V0cz17fSxjLmNvbm5lY3Q9ZnVuY3Rpb24oYSxkKXt2YXIgZT1jLnV0aWwucGFyc2VVcmkoYSksZixnO2ImJmIubG9jYXRpb24mJihlLnByb3RvY29sPWUucHJvdG9jb2x8fGIubG9jYXRpb24ucHJvdG9jb2wuc2xpY2UoMCwtMSksZS5ob3N0PWUuaG9zdHx8KGIuZG9jdW1lbnQ/Yi5kb2N1bWVudC5kb21haW46Yi5sb2NhdGlvbi5ob3N0bmFtZSksZS5wb3J0PWUucG9ydHx8Yi5sb2NhdGlvbi5wb3J0KSxmPWMudXRpbC51bmlxdWVVcmkoZSk7dmFyIGg9e2hvc3Q6ZS5ob3N0LHNlY3VyZTpcImh0dHBzXCI9PWUucHJvdG9jb2wscG9ydDplLnBvcnR8fChcImh0dHBzXCI9PWUucHJvdG9jb2w/NDQzOjgwKSxxdWVyeTplLnF1ZXJ5fHxcIlwifTtjLnV0aWwubWVyZ2UoaCxkKTtpZihoW1wiZm9yY2UgbmV3IGNvbm5lY3Rpb25cIl18fCFjLnNvY2tldHNbZl0pZz1uZXcgYy5Tb2NrZXQoaCk7cmV0dXJuIWhbXCJmb3JjZSBuZXcgY29ubmVjdGlvblwiXSYmZyYmKGMuc29ja2V0c1tmXT1nKSxnPWd8fGMuc29ja2V0c1tmXSxnLm9mKGUucGF0aC5sZW5ndGg+MT9lLnBhdGg6XCJcIil9fSkoXCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZT9tb2R1bGUuZXhwb3J0czp0aGlzLmlvPXt9LHRoaXMpLGZ1bmN0aW9uKGEsYil7dmFyIGM9YS51dGlsPXt9LGQ9L14oPzooPyFbXjpAXSs6W146QFxcL10qQCkoW146XFwvPyMuXSspOik/KD86XFwvXFwvKT8oKD86KChbXjpAXSopKD86OihbXjpAXSopKT8pP0ApPyhbXjpcXC8/I10qKSg/OjooXFxkKikpPykoKChcXC8oPzpbXj8jXSg/IVtePyNcXC9dKlxcLltePyNcXC8uXSsoPzpbPyNdfCQpKSkqXFwvPyk/KFtePyNcXC9dKikpKD86XFw/KFteI10qKSk/KD86IyguKikpPykvLGU9W1wic291cmNlXCIsXCJwcm90b2NvbFwiLFwiYXV0aG9yaXR5XCIsXCJ1c2VySW5mb1wiLFwidXNlclwiLFwicGFzc3dvcmRcIixcImhvc3RcIixcInBvcnRcIixcInJlbGF0aXZlXCIsXCJwYXRoXCIsXCJkaXJlY3RvcnlcIixcImZpbGVcIixcInF1ZXJ5XCIsXCJhbmNob3JcIl07Yy5wYXJzZVVyaT1mdW5jdGlvbihhKXt2YXIgYj1kLmV4ZWMoYXx8XCJcIiksYz17fSxmPTE0O3doaWxlKGYtLSljW2VbZl1dPWJbZl18fFwiXCI7cmV0dXJuIGN9LGMudW5pcXVlVXJpPWZ1bmN0aW9uKGEpe3ZhciBjPWEucHJvdG9jb2wsZD1hLmhvc3QsZT1hLnBvcnQ7cmV0dXJuXCJkb2N1bWVudFwiaW4gYj8oZD1kfHxkb2N1bWVudC5kb21haW4sZT1lfHwoYz09XCJodHRwc1wiJiZkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbCE9PVwiaHR0cHM6XCI/NDQzOmRvY3VtZW50LmxvY2F0aW9uLnBvcnQpKTooZD1kfHxcImxvY2FsaG9zdFwiLCFlJiZjPT1cImh0dHBzXCImJihlPTQ0MykpLChjfHxcImh0dHBcIikrXCI6Ly9cIitkK1wiOlwiKyhlfHw4MCl9LGMucXVlcnk9ZnVuY3Rpb24oYSxiKXt2YXIgZD1jLmNodW5rUXVlcnkoYXx8XCJcIiksZT1bXTtjLm1lcmdlKGQsYy5jaHVua1F1ZXJ5KGJ8fFwiXCIpKTtmb3IodmFyIGYgaW4gZClkLmhhc093blByb3BlcnR5KGYpJiZlLnB1c2goZitcIj1cIitkW2ZdKTtyZXR1cm4gZS5sZW5ndGg/XCI/XCIrZS5qb2luKFwiJlwiKTpcIlwifSxjLmNodW5rUXVlcnk9ZnVuY3Rpb24oYSl7dmFyIGI9e30sYz1hLnNwbGl0KFwiJlwiKSxkPTAsZT1jLmxlbmd0aCxmO2Zvcig7ZDxlOysrZClmPWNbZF0uc3BsaXQoXCI9XCIpLGZbMF0mJihiW2ZbMF1dPWZbMV0pO3JldHVybiBifTt2YXIgZj0hMTtjLmxvYWQ9ZnVuY3Rpb24oYSl7aWYoXCJkb2N1bWVudFwiaW4gYiYmZG9jdW1lbnQucmVhZHlTdGF0ZT09PVwiY29tcGxldGVcInx8ZilyZXR1cm4gYSgpO2Mub24oYixcImxvYWRcIixhLCExKX0sYy5vbj1mdW5jdGlvbihhLGIsYyxkKXthLmF0dGFjaEV2ZW50P2EuYXR0YWNoRXZlbnQoXCJvblwiK2IsYyk6YS5hZGRFdmVudExpc3RlbmVyJiZhLmFkZEV2ZW50TGlzdGVuZXIoYixjLGQpfSxjLnJlcXVlc3Q9ZnVuY3Rpb24oYSl7aWYoYSYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIFhEb21haW5SZXF1ZXN0JiYhYy51YS5oYXNDT1JTKXJldHVybiBuZXcgWERvbWFpblJlcXVlc3Q7aWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIFhNTEh0dHBSZXF1ZXN0JiYoIWF8fGMudWEuaGFzQ09SUykpcmV0dXJuIG5ldyBYTUxIdHRwUmVxdWVzdDtpZighYSl0cnl7cmV0dXJuIG5ldyh3aW5kb3dbW1wiQWN0aXZlXCJdLmNvbmNhdChcIk9iamVjdFwiKS5qb2luKFwiWFwiKV0pKFwiTWljcm9zb2Z0LlhNTEhUVFBcIil9Y2F0Y2goYil7fXJldHVybiBudWxsfSxcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93JiZjLmxvYWQoZnVuY3Rpb24oKXtmPSEwfSksYy5kZWZlcj1mdW5jdGlvbihhKXtpZighYy51YS53ZWJraXR8fFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbXBvcnRTY3JpcHRzKXJldHVybiBhKCk7Yy5sb2FkKGZ1bmN0aW9uKCl7c2V0VGltZW91dChhLDEwMCl9KX0sYy5tZXJnZT1mdW5jdGlvbihiLGQsZSxmKXt2YXIgZz1mfHxbXSxoPXR5cGVvZiBlPT1cInVuZGVmaW5lZFwiPzI6ZSxpO2ZvcihpIGluIGQpZC5oYXNPd25Qcm9wZXJ0eShpKSYmYy5pbmRleE9mKGcsaSk8MCYmKHR5cGVvZiBiW2ldIT1cIm9iamVjdFwifHwhaD8oYltpXT1kW2ldLGcucHVzaChkW2ldKSk6Yy5tZXJnZShiW2ldLGRbaV0saC0xLGcpKTtyZXR1cm4gYn0sYy5taXhpbj1mdW5jdGlvbihhLGIpe2MubWVyZ2UoYS5wcm90b3R5cGUsYi5wcm90b3R5cGUpfSxjLmluaGVyaXQ9ZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKCl7fWMucHJvdG90eXBlPWIucHJvdG90eXBlLGEucHJvdG90eXBlPW5ldyBjfSxjLmlzQXJyYXk9QXJyYXkuaXNBcnJheXx8ZnVuY3Rpb24oYSl7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKT09PVwiW29iamVjdCBBcnJheV1cIn0sYy5pbnRlcnNlY3Q9ZnVuY3Rpb24oYSxiKXt2YXIgZD1bXSxlPWEubGVuZ3RoPmIubGVuZ3RoP2E6YixmPWEubGVuZ3RoPmIubGVuZ3RoP2I6YTtmb3IodmFyIGc9MCxoPWYubGVuZ3RoO2c8aDtnKyspfmMuaW5kZXhPZihlLGZbZ10pJiZkLnB1c2goZltnXSk7cmV0dXJuIGR9LGMuaW5kZXhPZj1mdW5jdGlvbihhLGIsYyl7Zm9yKHZhciBkPWEubGVuZ3RoLGM9YzwwP2MrZDwwPzA6YytkOmN8fDA7YzxkJiZhW2NdIT09YjtjKyspO3JldHVybiBkPD1jPy0xOmN9LGMudG9BcnJheT1mdW5jdGlvbihhKXt2YXIgYj1bXTtmb3IodmFyIGM9MCxkPWEubGVuZ3RoO2M8ZDtjKyspYi5wdXNoKGFbY10pO3JldHVybiBifSxjLnVhPXt9LGMudWEuaGFzQ09SUz1cInVuZGVmaW5lZFwiIT10eXBlb2YgWE1MSHR0cFJlcXVlc3QmJmZ1bmN0aW9uKCl7dHJ5e3ZhciBhPW5ldyBYTUxIdHRwUmVxdWVzdH1jYXRjaChiKXtyZXR1cm4hMX1yZXR1cm4gYS53aXRoQ3JlZGVudGlhbHMhPXVuZGVmaW5lZH0oKSxjLnVhLndlYmtpdD1cInVuZGVmaW5lZFwiIT10eXBlb2YgbmF2aWdhdG9yJiYvd2Via2l0L2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSxjLnVhLmlEZXZpY2U9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG5hdmlnYXRvciYmL2lQYWR8aVBob25lfGlQb2QvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpfShcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLmV4cG9ydHMsdGhpcyksZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKCl7fWEuRXZlbnRFbWl0dGVyPWMsYy5wcm90b3R5cGUub249ZnVuY3Rpb24oYSxjKXtyZXR1cm4gdGhpcy4kZXZlbnRzfHwodGhpcy4kZXZlbnRzPXt9KSx0aGlzLiRldmVudHNbYV0/Yi51dGlsLmlzQXJyYXkodGhpcy4kZXZlbnRzW2FdKT90aGlzLiRldmVudHNbYV0ucHVzaChjKTp0aGlzLiRldmVudHNbYV09W3RoaXMuJGV2ZW50c1thXSxjXTp0aGlzLiRldmVudHNbYV09Yyx0aGlzfSxjLnByb3RvdHlwZS5hZGRMaXN0ZW5lcj1jLnByb3RvdHlwZS5vbixjLnByb3RvdHlwZS5vbmNlPWZ1bmN0aW9uKGEsYil7ZnVuY3Rpb24gZCgpe2MucmVtb3ZlTGlzdGVuZXIoYSxkKSxiLmFwcGx5KHRoaXMsYXJndW1lbnRzKX12YXIgYz10aGlzO3JldHVybiBkLmxpc3RlbmVyPWIsdGhpcy5vbihhLGQpLHRoaXN9LGMucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyPWZ1bmN0aW9uKGEsYyl7aWYodGhpcy4kZXZlbnRzJiZ0aGlzLiRldmVudHNbYV0pe3ZhciBkPXRoaXMuJGV2ZW50c1thXTtpZihiLnV0aWwuaXNBcnJheShkKSl7dmFyIGU9LTE7Zm9yKHZhciBmPTAsZz1kLmxlbmd0aDtmPGc7ZisrKWlmKGRbZl09PT1jfHxkW2ZdLmxpc3RlbmVyJiZkW2ZdLmxpc3RlbmVyPT09Yyl7ZT1mO2JyZWFrfWlmKGU8MClyZXR1cm4gdGhpcztkLnNwbGljZShlLDEpLGQubGVuZ3RofHxkZWxldGUgdGhpcy4kZXZlbnRzW2FdfWVsc2UoZD09PWN8fGQubGlzdGVuZXImJmQubGlzdGVuZXI9PT1jKSYmZGVsZXRlIHRoaXMuJGV2ZW50c1thXX1yZXR1cm4gdGhpc30sYy5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzPWZ1bmN0aW9uKGEpe3JldHVybiBhPT09dW5kZWZpbmVkPyh0aGlzLiRldmVudHM9e30sdGhpcyk6KHRoaXMuJGV2ZW50cyYmdGhpcy4kZXZlbnRzW2FdJiYodGhpcy4kZXZlbnRzW2FdPW51bGwpLHRoaXMpfSxjLnByb3RvdHlwZS5saXN0ZW5lcnM9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuJGV2ZW50c3x8KHRoaXMuJGV2ZW50cz17fSksdGhpcy4kZXZlbnRzW2FdfHwodGhpcy4kZXZlbnRzW2FdPVtdKSxiLnV0aWwuaXNBcnJheSh0aGlzLiRldmVudHNbYV0pfHwodGhpcy4kZXZlbnRzW2FdPVt0aGlzLiRldmVudHNbYV1dKSx0aGlzLiRldmVudHNbYV19LGMucHJvdG90eXBlLmVtaXQ9ZnVuY3Rpb24oYSl7aWYoIXRoaXMuJGV2ZW50cylyZXR1cm4hMTt2YXIgYz10aGlzLiRldmVudHNbYV07aWYoIWMpcmV0dXJuITE7dmFyIGQ9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGMpYy5hcHBseSh0aGlzLGQpO2Vsc2V7aWYoIWIudXRpbC5pc0FycmF5KGMpKXJldHVybiExO3ZhciBlPWMuc2xpY2UoKTtmb3IodmFyIGY9MCxnPWUubGVuZ3RoO2Y8ZztmKyspZVtmXS5hcHBseSh0aGlzLGQpfXJldHVybiEwfX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvOm1vZHVsZS5leHBvcnRzLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbz9pbzptb2R1bGUucGFyZW50LmV4cG9ydHMpLGZ1bmN0aW9uKGV4cG9ydHMsbmF0aXZlSlNPTil7ZnVuY3Rpb24gZihhKXtyZXR1cm4gYTwxMD9cIjBcIithOmF9ZnVuY3Rpb24gZGF0ZShhLGIpe3JldHVybiBpc0Zpbml0ZShhLnZhbHVlT2YoKSk/YS5nZXRVVENGdWxsWWVhcigpK1wiLVwiK2YoYS5nZXRVVENNb250aCgpKzEpK1wiLVwiK2YoYS5nZXRVVENEYXRlKCkpK1wiVFwiK2YoYS5nZXRVVENIb3VycygpKStcIjpcIitmKGEuZ2V0VVRDTWludXRlcygpKStcIjpcIitmKGEuZ2V0VVRDU2Vjb25kcygpKStcIlpcIjpudWxsfWZ1bmN0aW9uIHF1b3RlKGEpe3JldHVybiBlc2NhcGFibGUubGFzdEluZGV4PTAsZXNjYXBhYmxlLnRlc3QoYSk/J1wiJythLnJlcGxhY2UoZXNjYXBhYmxlLGZ1bmN0aW9uKGEpe3ZhciBiPW1ldGFbYV07cmV0dXJuIHR5cGVvZiBiPT1cInN0cmluZ1wiP2I6XCJcXFxcdVwiKyhcIjAwMDBcIithLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtNCl9KSsnXCInOidcIicrYSsnXCInfWZ1bmN0aW9uIHN0cihhLGIpe3ZhciBjLGQsZSxmLGc9Z2FwLGgsaT1iW2FdO2kgaW5zdGFuY2VvZiBEYXRlJiYoaT1kYXRlKGEpKSx0eXBlb2YgcmVwPT1cImZ1bmN0aW9uXCImJihpPXJlcC5jYWxsKGIsYSxpKSk7c3dpdGNoKHR5cGVvZiBpKXtjYXNlXCJzdHJpbmdcIjpyZXR1cm4gcXVvdGUoaSk7Y2FzZVwibnVtYmVyXCI6cmV0dXJuIGlzRmluaXRlKGkpP1N0cmluZyhpKTpcIm51bGxcIjtjYXNlXCJib29sZWFuXCI6Y2FzZVwibnVsbFwiOnJldHVybiBTdHJpbmcoaSk7Y2FzZVwib2JqZWN0XCI6aWYoIWkpcmV0dXJuXCJudWxsXCI7Z2FwKz1pbmRlbnQsaD1bXTtpZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KGkpPT09XCJbb2JqZWN0IEFycmF5XVwiKXtmPWkubGVuZ3RoO2ZvcihjPTA7YzxmO2MrPTEpaFtjXT1zdHIoYyxpKXx8XCJudWxsXCI7cmV0dXJuIGU9aC5sZW5ndGg9PT0wP1wiW11cIjpnYXA/XCJbXFxuXCIrZ2FwK2guam9pbihcIixcXG5cIitnYXApK1wiXFxuXCIrZytcIl1cIjpcIltcIitoLmpvaW4oXCIsXCIpK1wiXVwiLGdhcD1nLGV9aWYocmVwJiZ0eXBlb2YgcmVwPT1cIm9iamVjdFwiKXtmPXJlcC5sZW5ndGg7Zm9yKGM9MDtjPGY7Yys9MSl0eXBlb2YgcmVwW2NdPT1cInN0cmluZ1wiJiYoZD1yZXBbY10sZT1zdHIoZCxpKSxlJiZoLnB1c2gocXVvdGUoZCkrKGdhcD9cIjogXCI6XCI6XCIpK2UpKX1lbHNlIGZvcihkIGluIGkpT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGksZCkmJihlPXN0cihkLGkpLGUmJmgucHVzaChxdW90ZShkKSsoZ2FwP1wiOiBcIjpcIjpcIikrZSkpO3JldHVybiBlPWgubGVuZ3RoPT09MD9cInt9XCI6Z2FwP1wie1xcblwiK2dhcCtoLmpvaW4oXCIsXFxuXCIrZ2FwKStcIlxcblwiK2crXCJ9XCI6XCJ7XCIraC5qb2luKFwiLFwiKStcIn1cIixnYXA9ZyxlfX1cInVzZSBzdHJpY3RcIjtpZihuYXRpdmVKU09OJiZuYXRpdmVKU09OLnBhcnNlKXJldHVybiBleHBvcnRzLkpTT049e3BhcnNlOm5hdGl2ZUpTT04ucGFyc2Usc3RyaW5naWZ5Om5hdGl2ZUpTT04uc3RyaW5naWZ5fTt2YXIgSlNPTj1leHBvcnRzLkpTT049e30sY3g9L1tcXHUwMDAwXFx1MDBhZFxcdTA2MDAtXFx1MDYwNFxcdTA3MGZcXHUxN2I0XFx1MTdiNVxcdTIwMGMtXFx1MjAwZlxcdTIwMjgtXFx1MjAyZlxcdTIwNjAtXFx1MjA2ZlxcdWZlZmZcXHVmZmYwLVxcdWZmZmZdL2csZXNjYXBhYmxlPS9bXFxcXFxcXCJcXHgwMC1cXHgxZlxceDdmLVxceDlmXFx1MDBhZFxcdTA2MDAtXFx1MDYwNFxcdTA3MGZcXHUxN2I0XFx1MTdiNVxcdTIwMGMtXFx1MjAwZlxcdTIwMjgtXFx1MjAyZlxcdTIwNjAtXFx1MjA2ZlxcdWZlZmZcXHVmZmYwLVxcdWZmZmZdL2csZ2FwLGluZGVudCxtZXRhPXtcIlxcYlwiOlwiXFxcXGJcIixcIlxcdFwiOlwiXFxcXHRcIixcIlxcblwiOlwiXFxcXG5cIixcIlxcZlwiOlwiXFxcXGZcIixcIlxcclwiOlwiXFxcXHJcIiwnXCInOidcXFxcXCInLFwiXFxcXFwiOlwiXFxcXFxcXFxcIn0scmVwO0pTT04uc3RyaW5naWZ5PWZ1bmN0aW9uKGEsYixjKXt2YXIgZDtnYXA9XCJcIixpbmRlbnQ9XCJcIjtpZih0eXBlb2YgYz09XCJudW1iZXJcIilmb3IoZD0wO2Q8YztkKz0xKWluZGVudCs9XCIgXCI7ZWxzZSB0eXBlb2YgYz09XCJzdHJpbmdcIiYmKGluZGVudD1jKTtyZXA9YjtpZighYnx8dHlwZW9mIGI9PVwiZnVuY3Rpb25cInx8dHlwZW9mIGI9PVwib2JqZWN0XCImJnR5cGVvZiBiLmxlbmd0aD09XCJudW1iZXJcIilyZXR1cm4gc3RyKFwiXCIse1wiXCI6YX0pO3Rocm93IG5ldyBFcnJvcihcIkpTT04uc3RyaW5naWZ5XCIpfSxKU09OLnBhcnNlPWZ1bmN0aW9uKHRleHQscmV2aXZlcil7ZnVuY3Rpb24gd2FsayhhLGIpe3ZhciBjLGQsZT1hW2JdO2lmKGUmJnR5cGVvZiBlPT1cIm9iamVjdFwiKWZvcihjIGluIGUpT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGUsYykmJihkPXdhbGsoZSxjKSxkIT09dW5kZWZpbmVkP2VbY109ZDpkZWxldGUgZVtjXSk7cmV0dXJuIHJldml2ZXIuY2FsbChhLGIsZSl9dmFyIGo7dGV4dD1TdHJpbmcodGV4dCksY3gubGFzdEluZGV4PTAsY3gudGVzdCh0ZXh0KSYmKHRleHQ9dGV4dC5yZXBsYWNlKGN4LGZ1bmN0aW9uKGEpe3JldHVyblwiXFxcXHVcIisoXCIwMDAwXCIrYS5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTQpfSkpO2lmKC9eW1xcXSw6e31cXHNdKiQvLnRlc3QodGV4dC5yZXBsYWNlKC9cXFxcKD86W1wiXFxcXFxcL2JmbnJ0XXx1WzAtOWEtZkEtRl17NH0pL2csXCJAXCIpLnJlcGxhY2UoL1wiW15cIlxcXFxcXG5cXHJdKlwifHRydWV8ZmFsc2V8bnVsbHwtP1xcZCsoPzpcXC5cXGQqKT8oPzpbZUVdWytcXC1dP1xcZCspPy9nLFwiXVwiKS5yZXBsYWNlKC8oPzpefDp8LCkoPzpcXHMqXFxbKSsvZyxcIlwiKSkpcmV0dXJuIGo9ZXZhbChcIihcIit0ZXh0K1wiKVwiKSx0eXBlb2YgcmV2aXZlcj09XCJmdW5jdGlvblwiP3dhbGsoe1wiXCI6an0sXCJcIik6ajt0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJKU09OLnBhcnNlXCIpfX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvOm1vZHVsZS5leHBvcnRzLHR5cGVvZiBKU09OIT1cInVuZGVmaW5lZFwiP0pTT046dW5kZWZpbmVkKSxmdW5jdGlvbihhLGIpe3ZhciBjPWEucGFyc2VyPXt9LGQ9Yy5wYWNrZXRzPVtcImRpc2Nvbm5lY3RcIixcImNvbm5lY3RcIixcImhlYXJ0YmVhdFwiLFwibWVzc2FnZVwiLFwianNvblwiLFwiZXZlbnRcIixcImFja1wiLFwiZXJyb3JcIixcIm5vb3BcIl0sZT1jLnJlYXNvbnM9W1widHJhbnNwb3J0IG5vdCBzdXBwb3J0ZWRcIixcImNsaWVudCBub3QgaGFuZHNoYWtlblwiLFwidW5hdXRob3JpemVkXCJdLGY9Yy5hZHZpY2U9W1wicmVjb25uZWN0XCJdLGc9Yi5KU09OLGg9Yi51dGlsLmluZGV4T2Y7Yy5lbmNvZGVQYWNrZXQ9ZnVuY3Rpb24oYSl7dmFyIGI9aChkLGEudHlwZSksYz1hLmlkfHxcIlwiLGk9YS5lbmRwb2ludHx8XCJcIixqPWEuYWNrLGs9bnVsbDtzd2l0Y2goYS50eXBlKXtjYXNlXCJlcnJvclwiOnZhciBsPWEucmVhc29uP2goZSxhLnJlYXNvbik6XCJcIixtPWEuYWR2aWNlP2goZixhLmFkdmljZSk6XCJcIjtpZihsIT09XCJcInx8bSE9PVwiXCIpaz1sKyhtIT09XCJcIj9cIitcIittOlwiXCIpO2JyZWFrO2Nhc2VcIm1lc3NhZ2VcIjphLmRhdGEhPT1cIlwiJiYoaz1hLmRhdGEpO2JyZWFrO2Nhc2VcImV2ZW50XCI6dmFyIG49e25hbWU6YS5uYW1lfTthLmFyZ3MmJmEuYXJncy5sZW5ndGgmJihuLmFyZ3M9YS5hcmdzKSxrPWcuc3RyaW5naWZ5KG4pO2JyZWFrO2Nhc2VcImpzb25cIjprPWcuc3RyaW5naWZ5KGEuZGF0YSk7YnJlYWs7Y2FzZVwiY29ubmVjdFwiOmEucXMmJihrPWEucXMpO2JyZWFrO2Nhc2VcImFja1wiOms9YS5hY2tJZCsoYS5hcmdzJiZhLmFyZ3MubGVuZ3RoP1wiK1wiK2cuc3RyaW5naWZ5KGEuYXJncyk6XCJcIil9dmFyIG89W2IsYysoaj09XCJkYXRhXCI/XCIrXCI6XCJcIiksaV07cmV0dXJuIGshPT1udWxsJiZrIT09dW5kZWZpbmVkJiZvLnB1c2goayksby5qb2luKFwiOlwiKX0sYy5lbmNvZGVQYXlsb2FkPWZ1bmN0aW9uKGEpe3ZhciBiPVwiXCI7aWYoYS5sZW5ndGg9PTEpcmV0dXJuIGFbMF07Zm9yKHZhciBjPTAsZD1hLmxlbmd0aDtjPGQ7YysrKXt2YXIgZT1hW2NdO2IrPVwiXFx1ZmZmZFwiK2UubGVuZ3RoK1wiXFx1ZmZmZFwiK2FbY119cmV0dXJuIGJ9O3ZhciBpPS8oW146XSspOihbMC05XSspPyhcXCspPzooW146XSspPzo/KFtcXHNcXFNdKik/LztjLmRlY29kZVBhY2tldD1mdW5jdGlvbihhKXt2YXIgYj1hLm1hdGNoKGkpO2lmKCFiKXJldHVybnt9O3ZhciBjPWJbMl18fFwiXCIsYT1iWzVdfHxcIlwiLGg9e3R5cGU6ZFtiWzFdXSxlbmRwb2ludDpiWzRdfHxcIlwifTtjJiYoaC5pZD1jLGJbM10/aC5hY2s9XCJkYXRhXCI6aC5hY2s9ITApO3N3aXRjaChoLnR5cGUpe2Nhc2VcImVycm9yXCI6dmFyIGI9YS5zcGxpdChcIitcIik7aC5yZWFzb249ZVtiWzBdXXx8XCJcIixoLmFkdmljZT1mW2JbMV1dfHxcIlwiO2JyZWFrO2Nhc2VcIm1lc3NhZ2VcIjpoLmRhdGE9YXx8XCJcIjticmVhaztjYXNlXCJldmVudFwiOnRyeXt2YXIgaj1nLnBhcnNlKGEpO2gubmFtZT1qLm5hbWUsaC5hcmdzPWouYXJnc31jYXRjaChrKXt9aC5hcmdzPWguYXJnc3x8W107YnJlYWs7Y2FzZVwianNvblwiOnRyeXtoLmRhdGE9Zy5wYXJzZShhKX1jYXRjaChrKXt9YnJlYWs7Y2FzZVwiY29ubmVjdFwiOmgucXM9YXx8XCJcIjticmVhaztjYXNlXCJhY2tcIjp2YXIgYj1hLm1hdGNoKC9eKFswLTldKykoXFwrKT8oLiopLyk7aWYoYil7aC5hY2tJZD1iWzFdLGguYXJncz1bXTtpZihiWzNdKXRyeXtoLmFyZ3M9YlszXT9nLnBhcnNlKGJbM10pOltdfWNhdGNoKGspe319YnJlYWs7Y2FzZVwiZGlzY29ubmVjdFwiOmNhc2VcImhlYXJ0YmVhdFwiOn1yZXR1cm4gaH0sYy5kZWNvZGVQYXlsb2FkPWZ1bmN0aW9uKGEpe2lmKGEuY2hhckF0KDApPT1cIlxcdWZmZmRcIil7dmFyIGI9W107Zm9yKHZhciBkPTEsZT1cIlwiO2Q8YS5sZW5ndGg7ZCsrKWEuY2hhckF0KGQpPT1cIlxcdWZmZmRcIj8oYi5wdXNoKGMuZGVjb2RlUGFja2V0KGEuc3Vic3RyKGQrMSkuc3Vic3RyKDAsZSkpKSxkKz1OdW1iZXIoZSkrMSxlPVwiXCIpOmUrPWEuY2hhckF0KGQpO3JldHVybiBifXJldHVybltjLmRlY29kZVBhY2tldChhKV19fShcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLmV4cG9ydHMsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvOm1vZHVsZS5wYXJlbnQuZXhwb3J0cyksZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKGEsYil7dGhpcy5zb2NrZXQ9YSx0aGlzLnNlc3NpZD1ifWEuVHJhbnNwb3J0PWMsYi51dGlsLm1peGluKGMsYi5FdmVudEVtaXR0ZXIpLGMucHJvdG90eXBlLmhlYXJ0YmVhdHM9ZnVuY3Rpb24oKXtyZXR1cm4hMH0sYy5wcm90b3R5cGUub25EYXRhPWZ1bmN0aW9uKGEpe3RoaXMuY2xlYXJDbG9zZVRpbWVvdXQoKSwodGhpcy5zb2NrZXQuY29ubmVjdGVkfHx0aGlzLnNvY2tldC5jb25uZWN0aW5nfHx0aGlzLnNvY2tldC5yZWNvbm5lY3RpbmcpJiZ0aGlzLnNldENsb3NlVGltZW91dCgpO2lmKGEhPT1cIlwiKXt2YXIgYz1iLnBhcnNlci5kZWNvZGVQYXlsb2FkKGEpO2lmKGMmJmMubGVuZ3RoKWZvcih2YXIgZD0wLGU9Yy5sZW5ndGg7ZDxlO2QrKyl0aGlzLm9uUGFja2V0KGNbZF0pfXJldHVybiB0aGlzfSxjLnByb3RvdHlwZS5vblBhY2tldD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5zb2NrZXQuc2V0SGVhcnRiZWF0VGltZW91dCgpLGEudHlwZT09XCJoZWFydGJlYXRcIj90aGlzLm9uSGVhcnRiZWF0KCk6KGEudHlwZT09XCJjb25uZWN0XCImJmEuZW5kcG9pbnQ9PVwiXCImJnRoaXMub25Db25uZWN0KCksYS50eXBlPT1cImVycm9yXCImJmEuYWR2aWNlPT1cInJlY29ubmVjdFwiJiYodGhpcy5pc09wZW49ITEpLHRoaXMuc29ja2V0Lm9uUGFja2V0KGEpLHRoaXMpfSxjLnByb3RvdHlwZS5zZXRDbG9zZVRpbWVvdXQ9ZnVuY3Rpb24oKXtpZighdGhpcy5jbG9zZVRpbWVvdXQpe3ZhciBhPXRoaXM7dGhpcy5jbG9zZVRpbWVvdXQ9c2V0VGltZW91dChmdW5jdGlvbigpe2Eub25EaXNjb25uZWN0KCl9LHRoaXMuc29ja2V0LmNsb3NlVGltZW91dCl9fSxjLnByb3RvdHlwZS5vbkRpc2Nvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pc09wZW4mJnRoaXMuY2xvc2UoKSx0aGlzLmNsZWFyVGltZW91dHMoKSx0aGlzLnNvY2tldC5vbkRpc2Nvbm5lY3QoKSx0aGlzfSxjLnByb3RvdHlwZS5vbkNvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zb2NrZXQub25Db25uZWN0KCksdGhpc30sYy5wcm90b3R5cGUuY2xlYXJDbG9zZVRpbWVvdXQ9ZnVuY3Rpb24oKXt0aGlzLmNsb3NlVGltZW91dCYmKGNsZWFyVGltZW91dCh0aGlzLmNsb3NlVGltZW91dCksdGhpcy5jbG9zZVRpbWVvdXQ9bnVsbCl9LGMucHJvdG90eXBlLmNsZWFyVGltZW91dHM9ZnVuY3Rpb24oKXt0aGlzLmNsZWFyQ2xvc2VUaW1lb3V0KCksdGhpcy5yZW9wZW5UaW1lb3V0JiZjbGVhclRpbWVvdXQodGhpcy5yZW9wZW5UaW1lb3V0KX0sYy5wcm90b3R5cGUucGFja2V0PWZ1bmN0aW9uKGEpe3RoaXMuc2VuZChiLnBhcnNlci5lbmNvZGVQYWNrZXQoYSkpfSxjLnByb3RvdHlwZS5vbkhlYXJ0YmVhdD1mdW5jdGlvbihhKXt0aGlzLnBhY2tldCh7dHlwZTpcImhlYXJ0YmVhdFwifSl9LGMucHJvdG90eXBlLm9uT3Blbj1mdW5jdGlvbigpe3RoaXMuaXNPcGVuPSEwLHRoaXMuY2xlYXJDbG9zZVRpbWVvdXQoKSx0aGlzLnNvY2tldC5vbk9wZW4oKX0sYy5wcm90b3R5cGUub25DbG9zZT1mdW5jdGlvbigpe3ZhciBhPXRoaXM7dGhpcy5pc09wZW49ITEsdGhpcy5zb2NrZXQub25DbG9zZSgpLHRoaXMub25EaXNjb25uZWN0KCl9LGMucHJvdG90eXBlLnByZXBhcmVVcmw9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLnNvY2tldC5vcHRpb25zO3JldHVybiB0aGlzLnNjaGVtZSgpK1wiOi8vXCIrYS5ob3N0K1wiOlwiK2EucG9ydCtcIi9cIithLnJlc291cmNlK1wiL1wiK2IucHJvdG9jb2wrXCIvXCIrdGhpcy5uYW1lK1wiL1wiK3RoaXMuc2Vzc2lkfSxjLnByb3RvdHlwZS5yZWFkeT1mdW5jdGlvbihhLGIpe2IuY2FsbCh0aGlzKX19KFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbz9pbzptb2R1bGUuZXhwb3J0cyxcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLnBhcmVudC5leHBvcnRzKSxmdW5jdGlvbihhLGIsYyl7ZnVuY3Rpb24gZChhKXt0aGlzLm9wdGlvbnM9e3BvcnQ6ODAsc2VjdXJlOiExLGRvY3VtZW50OlwiZG9jdW1lbnRcImluIGM/ZG9jdW1lbnQ6ITEscmVzb3VyY2U6XCJzb2NrZXQuaW9cIix0cmFuc3BvcnRzOmIudHJhbnNwb3J0cyxcImNvbm5lY3QgdGltZW91dFwiOjFlNCxcInRyeSBtdWx0aXBsZSB0cmFuc3BvcnRzXCI6ITAscmVjb25uZWN0OiEwLFwicmVjb25uZWN0aW9uIGRlbGF5XCI6NTAwLFwicmVjb25uZWN0aW9uIGxpbWl0XCI6SW5maW5pdHksXCJyZW9wZW4gZGVsYXlcIjozZTMsXCJtYXggcmVjb25uZWN0aW9uIGF0dGVtcHRzXCI6MTAsXCJzeW5jIGRpc2Nvbm5lY3Qgb24gdW5sb2FkXCI6ITEsXCJhdXRvIGNvbm5lY3RcIjohMCxcImZsYXNoIHBvbGljeSBwb3J0XCI6MTA4NDMsbWFudWFsRmx1c2g6ITF9LGIudXRpbC5tZXJnZSh0aGlzLm9wdGlvbnMsYSksdGhpcy5jb25uZWN0ZWQ9ITEsdGhpcy5vcGVuPSExLHRoaXMuY29ubmVjdGluZz0hMSx0aGlzLnJlY29ubmVjdGluZz0hMSx0aGlzLm5hbWVzcGFjZXM9e30sdGhpcy5idWZmZXI9W10sdGhpcy5kb0J1ZmZlcj0hMTtpZih0aGlzLm9wdGlvbnNbXCJzeW5jIGRpc2Nvbm5lY3Qgb24gdW5sb2FkXCJdJiYoIXRoaXMuaXNYRG9tYWluKCl8fGIudXRpbC51YS5oYXNDT1JTKSl7dmFyIGQ9dGhpcztiLnV0aWwub24oYyxcImJlZm9yZXVubG9hZFwiLGZ1bmN0aW9uKCl7ZC5kaXNjb25uZWN0U3luYygpfSwhMSl9dGhpcy5vcHRpb25zW1wiYXV0byBjb25uZWN0XCJdJiZ0aGlzLmNvbm5lY3QoKX1mdW5jdGlvbiBlKCl7fWEuU29ja2V0PWQsYi51dGlsLm1peGluKGQsYi5FdmVudEVtaXR0ZXIpLGQucHJvdG90eXBlLm9mPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLm5hbWVzcGFjZXNbYV18fCh0aGlzLm5hbWVzcGFjZXNbYV09bmV3IGIuU29ja2V0TmFtZXNwYWNlKHRoaXMsYSksYSE9PVwiXCImJnRoaXMubmFtZXNwYWNlc1thXS5wYWNrZXQoe3R5cGU6XCJjb25uZWN0XCJ9KSksdGhpcy5uYW1lc3BhY2VzW2FdfSxkLnByb3RvdHlwZS5wdWJsaXNoPWZ1bmN0aW9uKCl7dGhpcy5lbWl0LmFwcGx5KHRoaXMsYXJndW1lbnRzKTt2YXIgYTtmb3IodmFyIGIgaW4gdGhpcy5uYW1lc3BhY2VzKXRoaXMubmFtZXNwYWNlcy5oYXNPd25Qcm9wZXJ0eShiKSYmKGE9dGhpcy5vZihiKSxhLiRlbWl0LmFwcGx5KGEsYXJndW1lbnRzKSl9LGQucHJvdG90eXBlLmhhbmRzaGFrZT1mdW5jdGlvbihhKXtmdW5jdGlvbiBmKGIpe2IgaW5zdGFuY2VvZiBFcnJvcj8oYy5jb25uZWN0aW5nPSExLGMub25FcnJvcihiLm1lc3NhZ2UpKTphLmFwcGx5KG51bGwsYi5zcGxpdChcIjpcIikpfXZhciBjPXRoaXMsZD10aGlzLm9wdGlvbnMsZz1bXCJodHRwXCIrKGQuc2VjdXJlP1wic1wiOlwiXCIpK1wiOi9cIixkLmhvc3QrXCI6XCIrZC5wb3J0LGQucmVzb3VyY2UsYi5wcm90b2NvbCxiLnV0aWwucXVlcnkodGhpcy5vcHRpb25zLnF1ZXJ5LFwidD1cIisgKyhuZXcgRGF0ZSkpXS5qb2luKFwiL1wiKTtpZih0aGlzLmlzWERvbWFpbigpJiYhYi51dGlsLnVhLmhhc0NPUlMpe3ZhciBoPWRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic2NyaXB0XCIpWzBdLGk9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtpLnNyYz1nK1wiJmpzb25wPVwiK2Iuai5sZW5ndGgsaC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShpLGgpLGIuai5wdXNoKGZ1bmN0aW9uKGEpe2YoYSksaS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGkpfSl9ZWxzZXt2YXIgaj1iLnV0aWwucmVxdWVzdCgpO2oub3BlbihcIkdFVFwiLGcsITApLHRoaXMuaXNYRG9tYWluKCkmJihqLndpdGhDcmVkZW50aWFscz0hMCksai5vbnJlYWR5c3RhdGVjaGFuZ2U9ZnVuY3Rpb24oKXtqLnJlYWR5U3RhdGU9PTQmJihqLm9ucmVhZHlzdGF0ZWNoYW5nZT1lLGouc3RhdHVzPT0yMDA/ZihqLnJlc3BvbnNlVGV4dCk6ai5zdGF0dXM9PTQwMz9jLm9uRXJyb3Ioai5yZXNwb25zZVRleHQpOihjLmNvbm5lY3Rpbmc9ITEsIWMucmVjb25uZWN0aW5nJiZjLm9uRXJyb3Ioai5yZXNwb25zZVRleHQpKSl9LGouc2VuZChudWxsKX19LGQucHJvdG90eXBlLmdldFRyYW5zcG9ydD1mdW5jdGlvbihhKXt2YXIgYz1hfHx0aGlzLnRyYW5zcG9ydHMsZDtmb3IodmFyIGU9MCxmO2Y9Y1tlXTtlKyspaWYoYi5UcmFuc3BvcnRbZl0mJmIuVHJhbnNwb3J0W2ZdLmNoZWNrKHRoaXMpJiYoIXRoaXMuaXNYRG9tYWluKCl8fGIuVHJhbnNwb3J0W2ZdLnhkb21haW5DaGVjayh0aGlzKSkpcmV0dXJuIG5ldyBiLlRyYW5zcG9ydFtmXSh0aGlzLHRoaXMuc2Vzc2lvbmlkKTtyZXR1cm4gbnVsbH0sZC5wcm90b3R5cGUuY29ubmVjdD1mdW5jdGlvbihhKXtpZih0aGlzLmNvbm5lY3RpbmcpcmV0dXJuIHRoaXM7dmFyIGM9dGhpcztyZXR1cm4gYy5jb25uZWN0aW5nPSEwLHRoaXMuaGFuZHNoYWtlKGZ1bmN0aW9uKGQsZSxmLGcpe2Z1bmN0aW9uIGgoYSl7Yy50cmFuc3BvcnQmJmMudHJhbnNwb3J0LmNsZWFyVGltZW91dHMoKSxjLnRyYW5zcG9ydD1jLmdldFRyYW5zcG9ydChhKTtpZighYy50cmFuc3BvcnQpcmV0dXJuIGMucHVibGlzaChcImNvbm5lY3RfZmFpbGVkXCIpO2MudHJhbnNwb3J0LnJlYWR5KGMsZnVuY3Rpb24oKXtjLmNvbm5lY3Rpbmc9ITAsYy5wdWJsaXNoKFwiY29ubmVjdGluZ1wiLGMudHJhbnNwb3J0Lm5hbWUpLGMudHJhbnNwb3J0Lm9wZW4oKSxjLm9wdGlvbnNbXCJjb25uZWN0IHRpbWVvdXRcIl0mJihjLmNvbm5lY3RUaW1lb3V0VGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe2lmKCFjLmNvbm5lY3RlZCl7Yy5jb25uZWN0aW5nPSExO2lmKGMub3B0aW9uc1tcInRyeSBtdWx0aXBsZSB0cmFuc3BvcnRzXCJdKXt2YXIgYT1jLnRyYW5zcG9ydHM7d2hpbGUoYS5sZW5ndGg+MCYmYS5zcGxpY2UoMCwxKVswXSE9Yy50cmFuc3BvcnQubmFtZSk7YS5sZW5ndGg/aChhKTpjLnB1Ymxpc2goXCJjb25uZWN0X2ZhaWxlZFwiKX19fSxjLm9wdGlvbnNbXCJjb25uZWN0IHRpbWVvdXRcIl0pKX0pfWMuc2Vzc2lvbmlkPWQsYy5jbG9zZVRpbWVvdXQ9ZioxZTMsYy5oZWFydGJlYXRUaW1lb3V0PWUqMWUzLGMudHJhbnNwb3J0c3x8KGMudHJhbnNwb3J0cz1jLm9yaWdUcmFuc3BvcnRzPWc/Yi51dGlsLmludGVyc2VjdChnLnNwbGl0KFwiLFwiKSxjLm9wdGlvbnMudHJhbnNwb3J0cyk6Yy5vcHRpb25zLnRyYW5zcG9ydHMpLGMuc2V0SGVhcnRiZWF0VGltZW91dCgpLGgoYy50cmFuc3BvcnRzKSxjLm9uY2UoXCJjb25uZWN0XCIsZnVuY3Rpb24oKXtjbGVhclRpbWVvdXQoYy5jb25uZWN0VGltZW91dFRpbWVyKSxhJiZ0eXBlb2YgYT09XCJmdW5jdGlvblwiJiZhKCl9KX0pLHRoaXN9LGQucHJvdG90eXBlLnNldEhlYXJ0YmVhdFRpbWVvdXQ9ZnVuY3Rpb24oKXtjbGVhclRpbWVvdXQodGhpcy5oZWFydGJlYXRUaW1lb3V0VGltZXIpO2lmKHRoaXMudHJhbnNwb3J0JiYhdGhpcy50cmFuc3BvcnQuaGVhcnRiZWF0cygpKXJldHVybjt2YXIgYT10aGlzO3RoaXMuaGVhcnRiZWF0VGltZW91dFRpbWVyPXNldFRpbWVvdXQoZnVuY3Rpb24oKXthLnRyYW5zcG9ydC5vbkNsb3NlKCl9LHRoaXMuaGVhcnRiZWF0VGltZW91dCl9LGQucHJvdG90eXBlLnBhY2tldD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5jb25uZWN0ZWQmJiF0aGlzLmRvQnVmZmVyP3RoaXMudHJhbnNwb3J0LnBhY2tldChhKTp0aGlzLmJ1ZmZlci5wdXNoKGEpLHRoaXN9LGQucHJvdG90eXBlLnNldEJ1ZmZlcj1mdW5jdGlvbihhKXt0aGlzLmRvQnVmZmVyPWEsIWEmJnRoaXMuY29ubmVjdGVkJiZ0aGlzLmJ1ZmZlci5sZW5ndGgmJih0aGlzLm9wdGlvbnMubWFudWFsRmx1c2h8fHRoaXMuZmx1c2hCdWZmZXIoKSl9LGQucHJvdG90eXBlLmZsdXNoQnVmZmVyPWZ1bmN0aW9uKCl7dGhpcy50cmFuc3BvcnQucGF5bG9hZCh0aGlzLmJ1ZmZlciksdGhpcy5idWZmZXI9W119LGQucHJvdG90eXBlLmRpc2Nvbm5lY3Q9ZnVuY3Rpb24oKXtpZih0aGlzLmNvbm5lY3RlZHx8dGhpcy5jb25uZWN0aW5nKXRoaXMub3BlbiYmdGhpcy5vZihcIlwiKS5wYWNrZXQoe3R5cGU6XCJkaXNjb25uZWN0XCJ9KSx0aGlzLm9uRGlzY29ubmVjdChcImJvb3RlZFwiKTtyZXR1cm4gdGhpc30sZC5wcm90b3R5cGUuZGlzY29ubmVjdFN5bmM9ZnVuY3Rpb24oKXt2YXIgYT1iLnV0aWwucmVxdWVzdCgpLGM9W1wiaHR0cFwiKyh0aGlzLm9wdGlvbnMuc2VjdXJlP1wic1wiOlwiXCIpK1wiOi9cIix0aGlzLm9wdGlvbnMuaG9zdCtcIjpcIit0aGlzLm9wdGlvbnMucG9ydCx0aGlzLm9wdGlvbnMucmVzb3VyY2UsYi5wcm90b2NvbCxcIlwiLHRoaXMuc2Vzc2lvbmlkXS5qb2luKFwiL1wiKStcIi8/ZGlzY29ubmVjdD0xXCI7YS5vcGVuKFwiR0VUXCIsYywhMSksYS5zZW5kKG51bGwpLHRoaXMub25EaXNjb25uZWN0KFwiYm9vdGVkXCIpfSxkLnByb3RvdHlwZS5pc1hEb21haW49ZnVuY3Rpb24oKXt2YXIgYT1jLmxvY2F0aW9uLnBvcnR8fChcImh0dHBzOlwiPT1jLmxvY2F0aW9uLnByb3RvY29sPzQ0Mzo4MCk7cmV0dXJuIHRoaXMub3B0aW9ucy5ob3N0IT09Yy5sb2NhdGlvbi5ob3N0bmFtZXx8dGhpcy5vcHRpb25zLnBvcnQhPWF9LGQucHJvdG90eXBlLm9uQ29ubmVjdD1mdW5jdGlvbigpe3RoaXMuY29ubmVjdGVkfHwodGhpcy5jb25uZWN0ZWQ9ITAsdGhpcy5jb25uZWN0aW5nPSExLHRoaXMuZG9CdWZmZXJ8fHRoaXMuc2V0QnVmZmVyKCExKSx0aGlzLmVtaXQoXCJjb25uZWN0XCIpKX0sZC5wcm90b3R5cGUub25PcGVuPWZ1bmN0aW9uKCl7dGhpcy5vcGVuPSEwfSxkLnByb3RvdHlwZS5vbkNsb3NlPWZ1bmN0aW9uKCl7dGhpcy5vcGVuPSExLGNsZWFyVGltZW91dCh0aGlzLmhlYXJ0YmVhdFRpbWVvdXRUaW1lcil9LGQucHJvdG90eXBlLm9uUGFja2V0PWZ1bmN0aW9uKGEpe3RoaXMub2YoYS5lbmRwb2ludCkub25QYWNrZXQoYSl9LGQucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oYSl7YSYmYS5hZHZpY2UmJmEuYWR2aWNlPT09XCJyZWNvbm5lY3RcIiYmKHRoaXMuY29ubmVjdGVkfHx0aGlzLmNvbm5lY3RpbmcpJiYodGhpcy5kaXNjb25uZWN0KCksdGhpcy5vcHRpb25zLnJlY29ubmVjdCYmdGhpcy5yZWNvbm5lY3QoKSksdGhpcy5wdWJsaXNoKFwiZXJyb3JcIixhJiZhLnJlYXNvbj9hLnJlYXNvbjphKX0sZC5wcm90b3R5cGUub25EaXNjb25uZWN0PWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuY29ubmVjdGVkLGM9dGhpcy5jb25uZWN0aW5nO3RoaXMuY29ubmVjdGVkPSExLHRoaXMuY29ubmVjdGluZz0hMSx0aGlzLm9wZW49ITE7aWYoYnx8Yyl0aGlzLnRyYW5zcG9ydC5jbG9zZSgpLHRoaXMudHJhbnNwb3J0LmNsZWFyVGltZW91dHMoKSxiJiYodGhpcy5wdWJsaXNoKFwiZGlzY29ubmVjdFwiLGEpLFwiYm9vdGVkXCIhPWEmJnRoaXMub3B0aW9ucy5yZWNvbm5lY3QmJiF0aGlzLnJlY29ubmVjdGluZyYmdGhpcy5yZWNvbm5lY3QoKSl9LGQucHJvdG90eXBlLnJlY29ubmVjdD1mdW5jdGlvbigpe2Z1bmN0aW9uIGUoKXtpZihhLmNvbm5lY3RlZCl7Zm9yKHZhciBiIGluIGEubmFtZXNwYWNlcylhLm5hbWVzcGFjZXMuaGFzT3duUHJvcGVydHkoYikmJlwiXCIhPT1iJiZhLm5hbWVzcGFjZXNbYl0ucGFja2V0KHt0eXBlOlwiY29ubmVjdFwifSk7YS5wdWJsaXNoKFwicmVjb25uZWN0XCIsYS50cmFuc3BvcnQubmFtZSxhLnJlY29ubmVjdGlvbkF0dGVtcHRzKX1jbGVhclRpbWVvdXQoYS5yZWNvbm5lY3Rpb25UaW1lciksYS5yZW1vdmVMaXN0ZW5lcihcImNvbm5lY3RfZmFpbGVkXCIsZiksYS5yZW1vdmVMaXN0ZW5lcihcImNvbm5lY3RcIixmKSxhLnJlY29ubmVjdGluZz0hMSxkZWxldGUgYS5yZWNvbm5lY3Rpb25BdHRlbXB0cyxkZWxldGUgYS5yZWNvbm5lY3Rpb25EZWxheSxkZWxldGUgYS5yZWNvbm5lY3Rpb25UaW1lcixkZWxldGUgYS5yZWRvVHJhbnNwb3J0cyxhLm9wdGlvbnNbXCJ0cnkgbXVsdGlwbGUgdHJhbnNwb3J0c1wiXT1jfWZ1bmN0aW9uIGYoKXtpZighYS5yZWNvbm5lY3RpbmcpcmV0dXJuO2lmKGEuY29ubmVjdGVkKXJldHVybiBlKCk7aWYoYS5jb25uZWN0aW5nJiZhLnJlY29ubmVjdGluZylyZXR1cm4gYS5yZWNvbm5lY3Rpb25UaW1lcj1zZXRUaW1lb3V0KGYsMWUzKTthLnJlY29ubmVjdGlvbkF0dGVtcHRzKys+PWI/YS5yZWRvVHJhbnNwb3J0cz8oYS5wdWJsaXNoKFwicmVjb25uZWN0X2ZhaWxlZFwiKSxlKCkpOihhLm9uKFwiY29ubmVjdF9mYWlsZWRcIixmKSxhLm9wdGlvbnNbXCJ0cnkgbXVsdGlwbGUgdHJhbnNwb3J0c1wiXT0hMCxhLnRyYW5zcG9ydHM9YS5vcmlnVHJhbnNwb3J0cyxhLnRyYW5zcG9ydD1hLmdldFRyYW5zcG9ydCgpLGEucmVkb1RyYW5zcG9ydHM9ITAsYS5jb25uZWN0KCkpOihhLnJlY29ubmVjdGlvbkRlbGF5PGQmJihhLnJlY29ubmVjdGlvbkRlbGF5Kj0yKSxhLmNvbm5lY3QoKSxhLnB1Ymxpc2goXCJyZWNvbm5lY3RpbmdcIixhLnJlY29ubmVjdGlvbkRlbGF5LGEucmVjb25uZWN0aW9uQXR0ZW1wdHMpLGEucmVjb25uZWN0aW9uVGltZXI9c2V0VGltZW91dChmLGEucmVjb25uZWN0aW9uRGVsYXkpKX10aGlzLnJlY29ubmVjdGluZz0hMCx0aGlzLnJlY29ubmVjdGlvbkF0dGVtcHRzPTAsdGhpcy5yZWNvbm5lY3Rpb25EZWxheT10aGlzLm9wdGlvbnNbXCJyZWNvbm5lY3Rpb24gZGVsYXlcIl07dmFyIGE9dGhpcyxiPXRoaXMub3B0aW9uc1tcIm1heCByZWNvbm5lY3Rpb24gYXR0ZW1wdHNcIl0sYz10aGlzLm9wdGlvbnNbXCJ0cnkgbXVsdGlwbGUgdHJhbnNwb3J0c1wiXSxkPXRoaXMub3B0aW9uc1tcInJlY29ubmVjdGlvbiBsaW1pdFwiXTt0aGlzLm9wdGlvbnNbXCJ0cnkgbXVsdGlwbGUgdHJhbnNwb3J0c1wiXT0hMSx0aGlzLnJlY29ubmVjdGlvblRpbWVyPXNldFRpbWVvdXQoZix0aGlzLnJlY29ubmVjdGlvbkRlbGF5KSx0aGlzLm9uKFwiY29ubmVjdFwiLGYpfX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvOm1vZHVsZS5leHBvcnRzLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbz9pbzptb2R1bGUucGFyZW50LmV4cG9ydHMsdGhpcyksZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKGEsYil7dGhpcy5zb2NrZXQ9YSx0aGlzLm5hbWU9Ynx8XCJcIix0aGlzLmZsYWdzPXt9LHRoaXMuanNvbj1uZXcgZCh0aGlzLFwianNvblwiKSx0aGlzLmFja1BhY2tldHM9MCx0aGlzLmFja3M9e319ZnVuY3Rpb24gZChhLGIpe3RoaXMubmFtZXNwYWNlPWEsdGhpcy5uYW1lPWJ9YS5Tb2NrZXROYW1lc3BhY2U9YyxiLnV0aWwubWl4aW4oYyxiLkV2ZW50RW1pdHRlciksYy5wcm90b3R5cGUuJGVtaXQ9Yi5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQsYy5wcm90b3R5cGUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zb2NrZXQub2YuYXBwbHkodGhpcy5zb2NrZXQsYXJndW1lbnRzKX0sYy5wcm90b3R5cGUucGFja2V0PWZ1bmN0aW9uKGEpe3JldHVybiBhLmVuZHBvaW50PXRoaXMubmFtZSx0aGlzLnNvY2tldC5wYWNrZXQoYSksdGhpcy5mbGFncz17fSx0aGlzfSxjLnByb3RvdHlwZS5zZW5kPWZ1bmN0aW9uKGEsYil7dmFyIGM9e3R5cGU6dGhpcy5mbGFncy5qc29uP1wianNvblwiOlwibWVzc2FnZVwiLGRhdGE6YX07cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgYiYmKGMuaWQ9Kyt0aGlzLmFja1BhY2tldHMsYy5hY2s9ITAsdGhpcy5hY2tzW2MuaWRdPWIpLHRoaXMucGFja2V0KGMpfSxjLnByb3RvdHlwZS5lbWl0PWZ1bmN0aW9uKGEpe3ZhciBiPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKSxjPWJbYi5sZW5ndGgtMV0sZD17dHlwZTpcImV2ZW50XCIsbmFtZTphfTtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBjJiYoZC5pZD0rK3RoaXMuYWNrUGFja2V0cyxkLmFjaz1cImRhdGFcIix0aGlzLmFja3NbZC5pZF09YyxiPWIuc2xpY2UoMCxiLmxlbmd0aC0xKSksZC5hcmdzPWIsdGhpcy5wYWNrZXQoZCl9LGMucHJvdG90eXBlLmRpc2Nvbm5lY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5uYW1lPT09XCJcIj90aGlzLnNvY2tldC5kaXNjb25uZWN0KCk6KHRoaXMucGFja2V0KHt0eXBlOlwiZGlzY29ubmVjdFwifSksdGhpcy4kZW1pdChcImRpc2Nvbm5lY3RcIikpLHRoaXN9LGMucHJvdG90eXBlLm9uUGFja2V0PWZ1bmN0aW9uKGEpe2Z1bmN0aW9uIGQoKXtjLnBhY2tldCh7dHlwZTpcImFja1wiLGFyZ3M6Yi51dGlsLnRvQXJyYXkoYXJndW1lbnRzKSxhY2tJZDphLmlkfSl9dmFyIGM9dGhpcztzd2l0Y2goYS50eXBlKXtjYXNlXCJjb25uZWN0XCI6dGhpcy4kZW1pdChcImNvbm5lY3RcIik7YnJlYWs7Y2FzZVwiZGlzY29ubmVjdFwiOnRoaXMubmFtZT09PVwiXCI/dGhpcy5zb2NrZXQub25EaXNjb25uZWN0KGEucmVhc29ufHxcImJvb3RlZFwiKTp0aGlzLiRlbWl0KFwiZGlzY29ubmVjdFwiLGEucmVhc29uKTticmVhaztjYXNlXCJtZXNzYWdlXCI6Y2FzZVwianNvblwiOnZhciBlPVtcIm1lc3NhZ2VcIixhLmRhdGFdO2EuYWNrPT1cImRhdGFcIj9lLnB1c2goZCk6YS5hY2smJnRoaXMucGFja2V0KHt0eXBlOlwiYWNrXCIsYWNrSWQ6YS5pZH0pLHRoaXMuJGVtaXQuYXBwbHkodGhpcyxlKTticmVhaztjYXNlXCJldmVudFwiOnZhciBlPVthLm5hbWVdLmNvbmNhdChhLmFyZ3MpO2EuYWNrPT1cImRhdGFcIiYmZS5wdXNoKGQpLHRoaXMuJGVtaXQuYXBwbHkodGhpcyxlKTticmVhaztjYXNlXCJhY2tcIjp0aGlzLmFja3NbYS5hY2tJZF0mJih0aGlzLmFja3NbYS5hY2tJZF0uYXBwbHkodGhpcyxhLmFyZ3MpLGRlbGV0ZSB0aGlzLmFja3NbYS5hY2tJZF0pO2JyZWFrO2Nhc2VcImVycm9yXCI6YS5hZHZpY2U/dGhpcy5zb2NrZXQub25FcnJvcihhKTphLnJlYXNvbj09XCJ1bmF1dGhvcml6ZWRcIj90aGlzLiRlbWl0KFwiY29ubmVjdF9mYWlsZWRcIixhLnJlYXNvbik6dGhpcy4kZW1pdChcImVycm9yXCIsYS5yZWFzb24pfX0sZC5wcm90b3R5cGUuc2VuZD1mdW5jdGlvbigpe3RoaXMubmFtZXNwYWNlLmZsYWdzW3RoaXMubmFtZV09ITAsdGhpcy5uYW1lc3BhY2Uuc2VuZC5hcHBseSh0aGlzLm5hbWVzcGFjZSxhcmd1bWVudHMpfSxkLnByb3RvdHlwZS5lbWl0PWZ1bmN0aW9uKCl7dGhpcy5uYW1lc3BhY2UuZmxhZ3NbdGhpcy5uYW1lXT0hMCx0aGlzLm5hbWVzcGFjZS5lbWl0LmFwcGx5KHRoaXMubmFtZXNwYWNlLGFyZ3VtZW50cyl9fShcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLmV4cG9ydHMsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvOm1vZHVsZS5wYXJlbnQuZXhwb3J0cyksZnVuY3Rpb24oYSxiLGMpe2Z1bmN0aW9uIGQoYSl7Yi5UcmFuc3BvcnQuYXBwbHkodGhpcyxhcmd1bWVudHMpfWEud2Vic29ja2V0PWQsYi51dGlsLmluaGVyaXQoZCxiLlRyYW5zcG9ydCksZC5wcm90b3R5cGUubmFtZT1cIndlYnNvY2tldFwiLGQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXt2YXIgYT1iLnV0aWwucXVlcnkodGhpcy5zb2NrZXQub3B0aW9ucy5xdWVyeSksZD10aGlzLGU7cmV0dXJuIGV8fChlPWMuTW96V2ViU29ja2V0fHxjLldlYlNvY2tldCksdGhpcy53ZWJzb2NrZXQ9bmV3IGUodGhpcy5wcmVwYXJlVXJsKCkrYSksdGhpcy53ZWJzb2NrZXQub25vcGVuPWZ1bmN0aW9uKCl7ZC5vbk9wZW4oKSxkLnNvY2tldC5zZXRCdWZmZXIoITEpfSx0aGlzLndlYnNvY2tldC5vbm1lc3NhZ2U9ZnVuY3Rpb24oYSl7ZC5vbkRhdGEoYS5kYXRhKX0sdGhpcy53ZWJzb2NrZXQub25jbG9zZT1mdW5jdGlvbigpe2Qub25DbG9zZSgpLGQuc29ja2V0LnNldEJ1ZmZlcighMCl9LHRoaXMud2Vic29ja2V0Lm9uZXJyb3I9ZnVuY3Rpb24oYSl7ZC5vbkVycm9yKGEpfSx0aGlzfSxiLnV0aWwudWEuaURldmljZT9kLnByb3RvdHlwZS5zZW5kPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7cmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtiLndlYnNvY2tldC5zZW5kKGEpfSwwKSx0aGlzfTpkLnByb3RvdHlwZS5zZW5kPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLndlYnNvY2tldC5zZW5kKGEpLHRoaXN9LGQucHJvdG90eXBlLnBheWxvYWQ9ZnVuY3Rpb24oYSl7Zm9yKHZhciBiPTAsYz1hLmxlbmd0aDtiPGM7YisrKXRoaXMucGFja2V0KGFbYl0pO3JldHVybiB0aGlzfSxkLnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLndlYnNvY2tldC5jbG9zZSgpLHRoaXN9LGQucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oYSl7dGhpcy5zb2NrZXQub25FcnJvcihhKX0sZC5wcm90b3R5cGUuc2NoZW1lPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc29ja2V0Lm9wdGlvbnMuc2VjdXJlP1wid3NzXCI6XCJ3c1wifSxkLmNoZWNrPWZ1bmN0aW9uKCl7cmV0dXJuXCJXZWJTb2NrZXRcImluIGMmJiEoXCJfX2FkZFRhc2tcImluIFdlYlNvY2tldCl8fFwiTW96V2ViU29ja2V0XCJpbiBjfSxkLnhkb21haW5DaGVjaz1mdW5jdGlvbigpe3JldHVybiEwfSxiLnRyYW5zcG9ydHMucHVzaChcIndlYnNvY2tldFwiKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvLlRyYW5zcG9ydDptb2R1bGUuZXhwb3J0cyxcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLnBhcmVudC5leHBvcnRzLHRoaXMpLGZ1bmN0aW9uKGEsYil7ZnVuY3Rpb24gYygpe2IuVHJhbnNwb3J0LndlYnNvY2tldC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9YS5mbGFzaHNvY2tldD1jLGIudXRpbC5pbmhlcml0KGMsYi5UcmFuc3BvcnQud2Vic29ja2V0KSxjLnByb3RvdHlwZS5uYW1lPVwiZmxhc2hzb2NrZXRcIixjLnByb3RvdHlwZS5vcGVuPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcyxjPWFyZ3VtZW50cztyZXR1cm4gV2ViU29ja2V0Ll9fYWRkVGFzayhmdW5jdGlvbigpe2IuVHJhbnNwb3J0LndlYnNvY2tldC5wcm90b3R5cGUub3Blbi5hcHBseShhLGMpfSksdGhpc30sYy5wcm90b3R5cGUuc2VuZD1mdW5jdGlvbigpe3ZhciBhPXRoaXMsYz1hcmd1bWVudHM7cmV0dXJuIFdlYlNvY2tldC5fX2FkZFRhc2soZnVuY3Rpb24oKXtiLlRyYW5zcG9ydC53ZWJzb2NrZXQucHJvdG90eXBlLnNlbmQuYXBwbHkoYSxjKX0pLHRoaXN9LGMucHJvdG90eXBlLmNsb3NlPWZ1bmN0aW9uKCl7cmV0dXJuIFdlYlNvY2tldC5fX3Rhc2tzLmxlbmd0aD0wLGIuVHJhbnNwb3J0LndlYnNvY2tldC5wcm90b3R5cGUuY2xvc2UuY2FsbCh0aGlzKSx0aGlzfSxjLnByb3RvdHlwZS5yZWFkeT1mdW5jdGlvbihhLGQpe2Z1bmN0aW9uIGUoKXt2YXIgYj1hLm9wdGlvbnMsZT1iW1wiZmxhc2ggcG9saWN5IHBvcnRcIl0sZz1bXCJodHRwXCIrKGIuc2VjdXJlP1wic1wiOlwiXCIpK1wiOi9cIixiLmhvc3QrXCI6XCIrYi5wb3J0LGIucmVzb3VyY2UsXCJzdGF0aWMvZmxhc2hzb2NrZXRcIixcIldlYlNvY2tldE1haW5cIisoYS5pc1hEb21haW4oKT9cIkluc2VjdXJlXCI6XCJcIikrXCIuc3dmXCJdO2MubG9hZGVkfHwodHlwZW9mIFdFQl9TT0NLRVRfU1dGX0xPQ0FUSU9OPT1cInVuZGVmaW5lZFwiJiYoV0VCX1NPQ0tFVF9TV0ZfTE9DQVRJT049Zy5qb2luKFwiL1wiKSksZSE9PTg0MyYmV2ViU29ja2V0LmxvYWRGbGFzaFBvbGljeUZpbGUoXCJ4bWxzb2NrZXQ6Ly9cIitiLmhvc3QrXCI6XCIrZSksV2ViU29ja2V0Ll9faW5pdGlhbGl6ZSgpLGMubG9hZGVkPSEwKSxkLmNhbGwoZil9dmFyIGY9dGhpcztpZihkb2N1bWVudC5ib2R5KXJldHVybiBlKCk7Yi51dGlsLmxvYWQoZSl9LGMuY2hlY2s9ZnVuY3Rpb24oKXtyZXR1cm4gdHlwZW9mIFdlYlNvY2tldCE9XCJ1bmRlZmluZWRcIiYmXCJfX2luaXRpYWxpemVcImluIFdlYlNvY2tldCYmISFzd2ZvYmplY3Q/c3dmb2JqZWN0LmdldEZsYXNoUGxheWVyVmVyc2lvbigpLm1ham9yPj0xMDohMX0sYy54ZG9tYWluQ2hlY2s9ZnVuY3Rpb24oKXtyZXR1cm4hMH0sdHlwZW9mIHdpbmRvdyE9XCJ1bmRlZmluZWRcIiYmKFdFQl9TT0NLRVRfRElTQUJMRV9BVVRPX0lOSVRJQUxJWkFUSU9OPSEwKSxiLnRyYW5zcG9ydHMucHVzaChcImZsYXNoc29ja2V0XCIpfShcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW8uVHJhbnNwb3J0Om1vZHVsZS5leHBvcnRzLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbz9pbzptb2R1bGUucGFyZW50LmV4cG9ydHMpO2lmKFwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3cpdmFyIHN3Zm9iamVjdD1mdW5jdGlvbigpe2Z1bmN0aW9uIEEoKXtpZih0KXJldHVybjt0cnl7dmFyIGE9aS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJvZHlcIilbMF0uYXBwZW5kQ2hpbGQoUShcInNwYW5cIikpO2EucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChhKX1jYXRjaChiKXtyZXR1cm59dD0hMDt2YXIgYz1sLmxlbmd0aDtmb3IodmFyIGQ9MDtkPGM7ZCsrKWxbZF0oKX1mdW5jdGlvbiBCKGEpe3Q/YSgpOmxbbC5sZW5ndGhdPWF9ZnVuY3Rpb24gQyhiKXtpZih0eXBlb2YgaC5hZGRFdmVudExpc3RlbmVyIT1hKWguYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIixiLCExKTtlbHNlIGlmKHR5cGVvZiBpLmFkZEV2ZW50TGlzdGVuZXIhPWEpaS5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLGIsITEpO2Vsc2UgaWYodHlwZW9mIGguYXR0YWNoRXZlbnQhPWEpUihoLFwib25sb2FkXCIsYik7ZWxzZSBpZih0eXBlb2YgaC5vbmxvYWQ9PVwiZnVuY3Rpb25cIil7dmFyIGM9aC5vbmxvYWQ7aC5vbmxvYWQ9ZnVuY3Rpb24oKXtjKCksYigpfX1lbHNlIGgub25sb2FkPWJ9ZnVuY3Rpb24gRCgpe2s/RSgpOkYoKX1mdW5jdGlvbiBFKCl7dmFyIGM9aS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJvZHlcIilbMF0sZD1RKGIpO2Quc2V0QXR0cmlidXRlKFwidHlwZVwiLGUpO3ZhciBmPWMuYXBwZW5kQ2hpbGQoZCk7aWYoZil7dmFyIGc9MDsoZnVuY3Rpb24oKXtpZih0eXBlb2YgZi5HZXRWYXJpYWJsZSE9YSl7dmFyIGI9Zi5HZXRWYXJpYWJsZShcIiR2ZXJzaW9uXCIpO2ImJihiPWIuc3BsaXQoXCIgXCIpWzFdLnNwbGl0KFwiLFwiKSx5LnB2PVtwYXJzZUludChiWzBdLDEwKSxwYXJzZUludChiWzFdLDEwKSxwYXJzZUludChiWzJdLDEwKV0pfWVsc2UgaWYoZzwxMCl7ZysrLHNldFRpbWVvdXQoYXJndW1lbnRzLmNhbGxlZSwxMCk7cmV0dXJufWMucmVtb3ZlQ2hpbGQoZCksZj1udWxsLEYoKX0pKCl9ZWxzZSBGKCl9ZnVuY3Rpb24gRigpe3ZhciBiPW0ubGVuZ3RoO2lmKGI+MClmb3IodmFyIGM9MDtjPGI7YysrKXt2YXIgZD1tW2NdLmlkLGU9bVtjXS5jYWxsYmFja0ZuLGY9e3N1Y2Nlc3M6ITEsaWQ6ZH07aWYoeS5wdlswXT4wKXt2YXIgZz1QKGQpO2lmKGcpaWYoUyhtW2NdLnN3ZlZlcnNpb24pJiYhKHkud2smJnkud2s8MzEyKSlVKGQsITApLGUmJihmLnN1Y2Nlc3M9ITAsZi5yZWY9RyhkKSxlKGYpKTtlbHNlIGlmKG1bY10uZXhwcmVzc0luc3RhbGwmJkgoKSl7dmFyIGg9e307aC5kYXRhPW1bY10uZXhwcmVzc0luc3RhbGwsaC53aWR0aD1nLmdldEF0dHJpYnV0ZShcIndpZHRoXCIpfHxcIjBcIixoLmhlaWdodD1nLmdldEF0dHJpYnV0ZShcImhlaWdodFwiKXx8XCIwXCIsZy5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSYmKGguc3R5bGVjbGFzcz1nLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpKSxnLmdldEF0dHJpYnV0ZShcImFsaWduXCIpJiYoaC5hbGlnbj1nLmdldEF0dHJpYnV0ZShcImFsaWduXCIpKTt2YXIgaT17fSxqPWcuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJwYXJhbVwiKSxrPWoubGVuZ3RoO2Zvcih2YXIgbD0wO2w8aztsKyspaltsXS5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpLnRvTG93ZXJDYXNlKCkhPVwibW92aWVcIiYmKGlbaltsXS5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpXT1qW2xdLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpKTtJKGgsaSxkLGUpfWVsc2UgSihnKSxlJiZlKGYpfWVsc2V7VShkLCEwKTtpZihlKXt2YXIgbj1HKGQpO24mJnR5cGVvZiBuLlNldFZhcmlhYmxlIT1hJiYoZi5zdWNjZXNzPSEwLGYucmVmPW4pLGUoZil9fX19ZnVuY3Rpb24gRyhjKXt2YXIgZD1udWxsLGU9UChjKTtpZihlJiZlLm5vZGVOYW1lPT1cIk9CSkVDVFwiKWlmKHR5cGVvZiBlLlNldFZhcmlhYmxlIT1hKWQ9ZTtlbHNle3ZhciBmPWUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoYilbMF07ZiYmKGQ9Zil9cmV0dXJuIGR9ZnVuY3Rpb24gSCgpe3JldHVybiF1JiZTKFwiNi4wLjY1XCIpJiYoeS53aW58fHkubWFjKSYmISh5LndrJiZ5LndrPDMxMil9ZnVuY3Rpb24gSShiLGMsZCxlKXt1PSEwLHI9ZXx8bnVsbCxzPXtzdWNjZXNzOiExLGlkOmR9O3ZhciBnPVAoZCk7aWYoZyl7Zy5ub2RlTmFtZT09XCJPQkpFQ1RcIj8ocD1LKGcpLHE9bnVsbCk6KHA9ZyxxPWQpLGIuaWQ9ZjtpZih0eXBlb2YgYi53aWR0aD09YXx8IS8lJC8udGVzdChiLndpZHRoKSYmcGFyc2VJbnQoYi53aWR0aCwxMCk8MzEwKWIud2lkdGg9XCIzMTBcIjtpZih0eXBlb2YgYi5oZWlnaHQ9PWF8fCEvJSQvLnRlc3QoYi5oZWlnaHQpJiZwYXJzZUludChiLmhlaWdodCwxMCk8MTM3KWIuaGVpZ2h0PVwiMTM3XCI7aS50aXRsZT1pLnRpdGxlLnNsaWNlKDAsNDcpK1wiIC0gRmxhc2ggUGxheWVyIEluc3RhbGxhdGlvblwiO3ZhciBqPXkuaWUmJnkud2luP1tcIkFjdGl2ZVwiXS5jb25jYXQoXCJcIikuam9pbihcIlhcIik6XCJQbHVnSW5cIixrPVwiTU1yZWRpcmVjdFVSTD1cIitoLmxvY2F0aW9uLnRvU3RyaW5nKCkucmVwbGFjZSgvJi9nLFwiJTI2XCIpK1wiJk1NcGxheWVyVHlwZT1cIitqK1wiJk1NZG9jdGl0bGU9XCIraS50aXRsZTt0eXBlb2YgYy5mbGFzaHZhcnMhPWE/Yy5mbGFzaHZhcnMrPVwiJlwiK2s6Yy5mbGFzaHZhcnM9aztpZih5LmllJiZ5LndpbiYmZy5yZWFkeVN0YXRlIT00KXt2YXIgbD1RKFwiZGl2XCIpO2QrPVwiU1dGT2JqZWN0TmV3XCIsbC5zZXRBdHRyaWJ1dGUoXCJpZFwiLGQpLGcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobCxnKSxnLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsZnVuY3Rpb24oKXtnLnJlYWR5U3RhdGU9PTQ/Zy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGcpOnNldFRpbWVvdXQoYXJndW1lbnRzLmNhbGxlZSwxMCl9KCl9TChiLGMsZCl9fWZ1bmN0aW9uIEooYSl7aWYoeS5pZSYmeS53aW4mJmEucmVhZHlTdGF0ZSE9NCl7dmFyIGI9UShcImRpdlwiKTthLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGIsYSksYi5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChLKGEpLGIpLGEuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixmdW5jdGlvbigpe2EucmVhZHlTdGF0ZT09ND9hLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYSk6c2V0VGltZW91dChhcmd1bWVudHMuY2FsbGVlLDEwKX0oKX1lbHNlIGEucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoSyhhKSxhKX1mdW5jdGlvbiBLKGEpe3ZhciBjPVEoXCJkaXZcIik7aWYoeS53aW4mJnkuaWUpYy5pbm5lckhUTUw9YS5pbm5lckhUTUw7ZWxzZXt2YXIgZD1hLmdldEVsZW1lbnRzQnlUYWdOYW1lKGIpWzBdO2lmKGQpe3ZhciBlPWQuY2hpbGROb2RlcztpZihlKXt2YXIgZj1lLmxlbmd0aDtmb3IodmFyIGc9MDtnPGY7ZysrKShlW2ddLm5vZGVUeXBlIT0xfHxlW2ddLm5vZGVOYW1lIT1cIlBBUkFNXCIpJiZlW2ddLm5vZGVUeXBlIT04JiZjLmFwcGVuZENoaWxkKGVbZ10uY2xvbmVOb2RlKCEwKSl9fX1yZXR1cm4gY31mdW5jdGlvbiBMKGMsZCxmKXt2YXIgZyxoPVAoZik7aWYoeS53ayYmeS53azwzMTIpcmV0dXJuIGc7aWYoaCl7dHlwZW9mIGMuaWQ9PWEmJihjLmlkPWYpO2lmKHkuaWUmJnkud2luKXt2YXIgaT1cIlwiO2Zvcih2YXIgaiBpbiBjKWNbal0hPU9iamVjdC5wcm90b3R5cGVbal0mJihqLnRvTG93ZXJDYXNlKCk9PVwiZGF0YVwiP2QubW92aWU9Y1tqXTpqLnRvTG93ZXJDYXNlKCk9PVwic3R5bGVjbGFzc1wiP2krPScgY2xhc3M9XCInK2Nbal0rJ1wiJzpqLnRvTG93ZXJDYXNlKCkhPVwiY2xhc3NpZFwiJiYoaSs9XCIgXCIraisnPVwiJytjW2pdKydcIicpKTt2YXIgaz1cIlwiO2Zvcih2YXIgbCBpbiBkKWRbbF0hPU9iamVjdC5wcm90b3R5cGVbbF0mJihrKz0nPHBhcmFtIG5hbWU9XCInK2wrJ1wiIHZhbHVlPVwiJytkW2xdKydcIiAvPicpO2gub3V0ZXJIVE1MPSc8b2JqZWN0IGNsYXNzaWQ9XCJjbHNpZDpEMjdDREI2RS1BRTZELTExY2YtOTZCOC00NDQ1NTM1NDAwMDBcIicraStcIj5cIitrK1wiPC9vYmplY3Q+XCIsbltuLmxlbmd0aF09Yy5pZCxnPVAoYy5pZCl9ZWxzZXt2YXIgbT1RKGIpO20uc2V0QXR0cmlidXRlKFwidHlwZVwiLGUpO2Zvcih2YXIgbyBpbiBjKWNbb10hPU9iamVjdC5wcm90b3R5cGVbb10mJihvLnRvTG93ZXJDYXNlKCk9PVwic3R5bGVjbGFzc1wiP20uc2V0QXR0cmlidXRlKFwiY2xhc3NcIixjW29dKTpvLnRvTG93ZXJDYXNlKCkhPVwiY2xhc3NpZFwiJiZtLnNldEF0dHJpYnV0ZShvLGNbb10pKTtmb3IodmFyIHAgaW4gZClkW3BdIT1PYmplY3QucHJvdG90eXBlW3BdJiZwLnRvTG93ZXJDYXNlKCkhPVwibW92aWVcIiYmTShtLHAsZFtwXSk7aC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChtLGgpLGc9bX19cmV0dXJuIGd9ZnVuY3Rpb24gTShhLGIsYyl7dmFyIGQ9UShcInBhcmFtXCIpO2Quc2V0QXR0cmlidXRlKFwibmFtZVwiLGIpLGQuc2V0QXR0cmlidXRlKFwidmFsdWVcIixjKSxhLmFwcGVuZENoaWxkKGQpfWZ1bmN0aW9uIE4oYSl7dmFyIGI9UChhKTtiJiZiLm5vZGVOYW1lPT1cIk9CSkVDVFwiJiYoeS5pZSYmeS53aW4/KGIuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixmdW5jdGlvbigpe2IucmVhZHlTdGF0ZT09ND9PKGEpOnNldFRpbWVvdXQoYXJndW1lbnRzLmNhbGxlZSwxMCl9KCkpOmIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChiKSl9ZnVuY3Rpb24gTyhhKXt2YXIgYj1QKGEpO2lmKGIpe2Zvcih2YXIgYyBpbiBiKXR5cGVvZiBiW2NdPT1cImZ1bmN0aW9uXCImJihiW2NdPW51bGwpO2IucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChiKX19ZnVuY3Rpb24gUChhKXt2YXIgYj1udWxsO3RyeXtiPWkuZ2V0RWxlbWVudEJ5SWQoYSl9Y2F0Y2goYyl7fXJldHVybiBifWZ1bmN0aW9uIFEoYSl7cmV0dXJuIGkuY3JlYXRlRWxlbWVudChhKX1mdW5jdGlvbiBSKGEsYixjKXthLmF0dGFjaEV2ZW50KGIsYyksb1tvLmxlbmd0aF09W2EsYixjXX1mdW5jdGlvbiBTKGEpe3ZhciBiPXkucHYsYz1hLnNwbGl0KFwiLlwiKTtyZXR1cm4gY1swXT1wYXJzZUludChjWzBdLDEwKSxjWzFdPXBhcnNlSW50KGNbMV0sMTApfHwwLGNbMl09cGFyc2VJbnQoY1syXSwxMCl8fDAsYlswXT5jWzBdfHxiWzBdPT1jWzBdJiZiWzFdPmNbMV18fGJbMF09PWNbMF0mJmJbMV09PWNbMV0mJmJbMl0+PWNbMl0/ITA6ITF9ZnVuY3Rpb24gVChjLGQsZSxmKXtpZih5LmllJiZ5Lm1hYylyZXR1cm47dmFyIGc9aS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF07aWYoIWcpcmV0dXJuO3ZhciBoPWUmJnR5cGVvZiBlPT1cInN0cmluZ1wiP2U6XCJzY3JlZW5cIjtmJiYodj1udWxsLHc9bnVsbCk7aWYoIXZ8fHchPWgpe3ZhciBqPVEoXCJzdHlsZVwiKTtqLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpLGouc2V0QXR0cmlidXRlKFwibWVkaWFcIixoKSx2PWcuYXBwZW5kQ2hpbGQoaikseS5pZSYmeS53aW4mJnR5cGVvZiBpLnN0eWxlU2hlZXRzIT1hJiZpLnN0eWxlU2hlZXRzLmxlbmd0aD4wJiYodj1pLnN0eWxlU2hlZXRzW2kuc3R5bGVTaGVldHMubGVuZ3RoLTFdKSx3PWh9eS5pZSYmeS53aW4/diYmdHlwZW9mIHYuYWRkUnVsZT09YiYmdi5hZGRSdWxlKGMsZCk6diYmdHlwZW9mIGkuY3JlYXRlVGV4dE5vZGUhPWEmJnYuYXBwZW5kQ2hpbGQoaS5jcmVhdGVUZXh0Tm9kZShjK1wiIHtcIitkK1wifVwiKSl9ZnVuY3Rpb24gVShhLGIpe2lmKCF4KXJldHVybjt2YXIgYz1iP1widmlzaWJsZVwiOlwiaGlkZGVuXCI7dCYmUChhKT9QKGEpLnN0eWxlLnZpc2liaWxpdHk9YzpUKFwiI1wiK2EsXCJ2aXNpYmlsaXR5OlwiK2MpfWZ1bmN0aW9uIFYoYil7dmFyIGM9L1tcXFxcXFxcIjw+XFwuO10vLGQ9Yy5leGVjKGIpIT1udWxsO3JldHVybiBkJiZ0eXBlb2YgZW5jb2RlVVJJQ29tcG9uZW50IT1hP2VuY29kZVVSSUNvbXBvbmVudChiKTpifXZhciBhPVwidW5kZWZpbmVkXCIsYj1cIm9iamVjdFwiLGM9XCJTaG9ja3dhdmUgRmxhc2hcIixkPVwiU2hvY2t3YXZlRmxhc2guU2hvY2t3YXZlRmxhc2hcIixlPVwiYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2hcIixmPVwiU1dGT2JqZWN0RXhwckluc3RcIixnPVwib25yZWFkeXN0YXRlY2hhbmdlXCIsaD13aW5kb3csaT1kb2N1bWVudCxqPW5hdmlnYXRvcixrPSExLGw9W0RdLG09W10sbj1bXSxvPVtdLHAscSxyLHMsdD0hMSx1PSExLHYsdyx4PSEwLHk9ZnVuY3Rpb24oKXt2YXIgZj10eXBlb2YgaS5nZXRFbGVtZW50QnlJZCE9YSYmdHlwZW9mIGkuZ2V0RWxlbWVudHNCeVRhZ05hbWUhPWEmJnR5cGVvZiBpLmNyZWF0ZUVsZW1lbnQhPWEsZz1qLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLGw9ai5wbGF0Zm9ybS50b0xvd2VyQ2FzZSgpLG09bD8vd2luLy50ZXN0KGwpOi93aW4vLnRlc3QoZyksbj1sPy9tYWMvLnRlc3QobCk6L21hYy8udGVzdChnKSxvPS93ZWJraXQvLnRlc3QoZyk/cGFyc2VGbG9hdChnLnJlcGxhY2UoL14uKndlYmtpdFxcLyhcXGQrKFxcLlxcZCspPykuKiQvLFwiJDFcIikpOiExLHA9ITEscT1bMCwwLDBdLHI9bnVsbDtpZih0eXBlb2Ygai5wbHVnaW5zIT1hJiZ0eXBlb2Ygai5wbHVnaW5zW2NdPT1iKXI9ai5wbHVnaW5zW2NdLmRlc2NyaXB0aW9uLHImJih0eXBlb2Ygai5taW1lVHlwZXM9PWF8fCFqLm1pbWVUeXBlc1tlXXx8ISFqLm1pbWVUeXBlc1tlXS5lbmFibGVkUGx1Z2luKSYmKGs9ITAscD0hMSxyPXIucmVwbGFjZSgvXi4qXFxzKyhcXFMrXFxzK1xcUyskKS8sXCIkMVwiKSxxWzBdPXBhcnNlSW50KHIucmVwbGFjZSgvXiguKilcXC4uKiQvLFwiJDFcIiksMTApLHFbMV09cGFyc2VJbnQoci5yZXBsYWNlKC9eLipcXC4oLiopXFxzLiokLyxcIiQxXCIpLDEwKSxxWzJdPS9bYS16QS1aXS8udGVzdChyKT9wYXJzZUludChyLnJlcGxhY2UoL14uKlthLXpBLVpdKyguKikkLyxcIiQxXCIpLDEwKTowKTtlbHNlIGlmKHR5cGVvZiBoW1tcIkFjdGl2ZVwiXS5jb25jYXQoXCJPYmplY3RcIikuam9pbihcIlhcIildIT1hKXRyeXt2YXIgcz1uZXcod2luZG93W1tcIkFjdGl2ZVwiXS5jb25jYXQoXCJPYmplY3RcIikuam9pbihcIlhcIildKShkKTtzJiYocj1zLkdldFZhcmlhYmxlKFwiJHZlcnNpb25cIiksciYmKHA9ITAscj1yLnNwbGl0KFwiIFwiKVsxXS5zcGxpdChcIixcIikscT1bcGFyc2VJbnQoclswXSwxMCkscGFyc2VJbnQoclsxXSwxMCkscGFyc2VJbnQoclsyXSwxMCldKSl9Y2F0Y2godCl7fXJldHVybnt3MzpmLHB2OnEsd2s6byxpZTpwLHdpbjptLG1hYzpufX0oKSx6PWZ1bmN0aW9uKCl7aWYoIXkudzMpcmV0dXJuOyh0eXBlb2YgaS5yZWFkeVN0YXRlIT1hJiZpLnJlYWR5U3RhdGU9PVwiY29tcGxldGVcInx8dHlwZW9mIGkucmVhZHlTdGF0ZT09YSYmKGkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJib2R5XCIpWzBdfHxpLmJvZHkpKSYmQSgpLHR8fCh0eXBlb2YgaS5hZGRFdmVudExpc3RlbmVyIT1hJiZpLmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsQSwhMSkseS5pZSYmeS53aW4mJihpLmF0dGFjaEV2ZW50KGcsZnVuY3Rpb24oKXtpLnJlYWR5U3RhdGU9PVwiY29tcGxldGVcIiYmKGkuZGV0YWNoRXZlbnQoZyxhcmd1bWVudHMuY2FsbGVlKSxBKCkpfSksaD09dG9wJiZmdW5jdGlvbigpe2lmKHQpcmV0dXJuO3RyeXtpLmRvY3VtZW50RWxlbWVudC5kb1Njcm9sbChcImxlZnRcIil9Y2F0Y2goYSl7c2V0VGltZW91dChhcmd1bWVudHMuY2FsbGVlLDApO3JldHVybn1BKCl9KCkpLHkud2smJmZ1bmN0aW9uKCl7aWYodClyZXR1cm47aWYoIS9sb2FkZWR8Y29tcGxldGUvLnRlc3QoaS5yZWFkeVN0YXRlKSl7c2V0VGltZW91dChhcmd1bWVudHMuY2FsbGVlLDApO3JldHVybn1BKCl9KCksQyhBKSl9KCksVz1mdW5jdGlvbigpe3kuaWUmJnkud2luJiZ3aW5kb3cuYXR0YWNoRXZlbnQoXCJvbnVubG9hZFwiLGZ1bmN0aW9uKCl7dmFyIGE9by5sZW5ndGg7Zm9yKHZhciBiPTA7YjxhO2IrKylvW2JdWzBdLmRldGFjaEV2ZW50KG9bYl1bMV0sb1tiXVsyXSk7dmFyIGM9bi5sZW5ndGg7Zm9yKHZhciBkPTA7ZDxjO2QrKylOKG5bZF0pO2Zvcih2YXIgZSBpbiB5KXlbZV09bnVsbDt5PW51bGw7Zm9yKHZhciBmIGluIHN3Zm9iamVjdClzd2ZvYmplY3RbZl09bnVsbDtzd2ZvYmplY3Q9bnVsbH0pfSgpO3JldHVybntyZWdpc3Rlck9iamVjdDpmdW5jdGlvbihhLGIsYyxkKXtpZih5LnczJiZhJiZiKXt2YXIgZT17fTtlLmlkPWEsZS5zd2ZWZXJzaW9uPWIsZS5leHByZXNzSW5zdGFsbD1jLGUuY2FsbGJhY2tGbj1kLG1bbS5sZW5ndGhdPWUsVShhLCExKX1lbHNlIGQmJmQoe3N1Y2Nlc3M6ITEsaWQ6YX0pfSxnZXRPYmplY3RCeUlkOmZ1bmN0aW9uKGEpe2lmKHkudzMpcmV0dXJuIEcoYSl9LGVtYmVkU1dGOmZ1bmN0aW9uKGMsZCxlLGYsZyxoLGksaixrLGwpe3ZhciBtPXtzdWNjZXNzOiExLGlkOmR9O3kudzMmJiEoeS53ayYmeS53azwzMTIpJiZjJiZkJiZlJiZmJiZnPyhVKGQsITEpLEIoZnVuY3Rpb24oKXtlKz1cIlwiLGYrPVwiXCI7dmFyIG49e307aWYoayYmdHlwZW9mIGs9PT1iKWZvcih2YXIgbyBpbiBrKW5bb109a1tvXTtuLmRhdGE9YyxuLndpZHRoPWUsbi5oZWlnaHQ9Zjt2YXIgcD17fTtpZihqJiZ0eXBlb2Ygaj09PWIpZm9yKHZhciBxIGluIGopcFtxXT1qW3FdO2lmKGkmJnR5cGVvZiBpPT09Yilmb3IodmFyIHIgaW4gaSl0eXBlb2YgcC5mbGFzaHZhcnMhPWE/cC5mbGFzaHZhcnMrPVwiJlwiK3IrXCI9XCIraVtyXTpwLmZsYXNodmFycz1yK1wiPVwiK2lbcl07aWYoUyhnKSl7dmFyIHM9TChuLHAsZCk7bi5pZD09ZCYmVShkLCEwKSxtLnN1Y2Nlc3M9ITAsbS5yZWY9c31lbHNle2lmKGgmJkgoKSl7bi5kYXRhPWgsSShuLHAsZCxsKTtyZXR1cm59VShkLCEwKX1sJiZsKG0pfSkpOmwmJmwobSl9LHN3aXRjaE9mZkF1dG9IaWRlU2hvdzpmdW5jdGlvbigpe3g9ITF9LHVhOnksZ2V0Rmxhc2hQbGF5ZXJWZXJzaW9uOmZ1bmN0aW9uKCl7cmV0dXJue21ham9yOnkucHZbMF0sbWlub3I6eS5wdlsxXSxyZWxlYXNlOnkucHZbMl19fSxoYXNGbGFzaFBsYXllclZlcnNpb246UyxjcmVhdGVTV0Y6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB5LnczP0woYSxiLGMpOnVuZGVmaW5lZH0sc2hvd0V4cHJlc3NJbnN0YWxsOmZ1bmN0aW9uKGEsYixjLGQpe3kudzMmJkgoKSYmSShhLGIsYyxkKX0scmVtb3ZlU1dGOmZ1bmN0aW9uKGEpe3kudzMmJk4oYSl9LGNyZWF0ZUNTUzpmdW5jdGlvbihhLGIsYyxkKXt5LnczJiZUKGEsYixjLGQpfSxhZGREb21Mb2FkRXZlbnQ6QixhZGRMb2FkRXZlbnQ6QyxnZXRRdWVyeVBhcmFtVmFsdWU6ZnVuY3Rpb24oYSl7dmFyIGI9aS5sb2NhdGlvbi5zZWFyY2h8fGkubG9jYXRpb24uaGFzaDtpZihiKXsvXFw/Ly50ZXN0KGIpJiYoYj1iLnNwbGl0KFwiP1wiKVsxXSk7aWYoYT09bnVsbClyZXR1cm4gVihiKTt2YXIgYz1iLnNwbGl0KFwiJlwiKTtmb3IodmFyIGQ9MDtkPGMubGVuZ3RoO2QrKylpZihjW2RdLnN1YnN0cmluZygwLGNbZF0uaW5kZXhPZihcIj1cIikpPT1hKXJldHVybiBWKGNbZF0uc3Vic3RyaW5nKGNbZF0uaW5kZXhPZihcIj1cIikrMSkpfXJldHVyblwiXCJ9LGV4cHJlc3NJbnN0YWxsQ2FsbGJhY2s6ZnVuY3Rpb24oKXtpZih1KXt2YXIgYT1QKGYpO2EmJnAmJihhLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHAsYSkscSYmKFUocSwhMCkseS5pZSYmeS53aW4mJihwLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiKSksciYmcihzKSksdT0hMX19fX0oKTsoZnVuY3Rpb24oKXtpZihcInVuZGVmaW5lZFwiPT10eXBlb2Ygd2luZG93fHx3aW5kb3cuV2ViU29ja2V0KXJldHVybjt2YXIgYT13aW5kb3cuY29uc29sZTtpZighYXx8IWEubG9nfHwhYS5lcnJvcilhPXtsb2c6ZnVuY3Rpb24oKXt9LGVycm9yOmZ1bmN0aW9uKCl7fX07aWYoIXN3Zm9iamVjdC5oYXNGbGFzaFBsYXllclZlcnNpb24oXCIxMC4wLjBcIikpe2EuZXJyb3IoXCJGbGFzaCBQbGF5ZXIgPj0gMTAuMC4wIGlzIHJlcXVpcmVkLlwiKTtyZXR1cm59bG9jYXRpb24ucHJvdG9jb2w9PVwiZmlsZTpcIiYmYS5lcnJvcihcIldBUk5JTkc6IHdlYi1zb2NrZXQtanMgZG9lc24ndCB3b3JrIGluIGZpbGU6Ly8vLi4uIFVSTCB1bmxlc3MgeW91IHNldCBGbGFzaCBTZWN1cml0eSBTZXR0aW5ncyBwcm9wZXJseS4gT3BlbiB0aGUgcGFnZSB2aWEgV2ViIHNlcnZlciBpLmUuIGh0dHA6Ly8uLi5cIiksV2ViU29ja2V0PWZ1bmN0aW9uKGEsYixjLGQsZSl7dmFyIGY9dGhpcztmLl9faWQ9V2ViU29ja2V0Ll9fbmV4dElkKyssV2ViU29ja2V0Ll9faW5zdGFuY2VzW2YuX19pZF09ZixmLnJlYWR5U3RhdGU9V2ViU29ja2V0LkNPTk5FQ1RJTkcsZi5idWZmZXJlZEFtb3VudD0wLGYuX19ldmVudHM9e30sYj90eXBlb2YgYj09XCJzdHJpbmdcIiYmKGI9W2JdKTpiPVtdLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtXZWJTb2NrZXQuX19hZGRUYXNrKGZ1bmN0aW9uKCl7V2ViU29ja2V0Ll9fZmxhc2guY3JlYXRlKGYuX19pZCxhLGIsY3x8bnVsbCxkfHwwLGV8fG51bGwpfSl9LDApfSxXZWJTb2NrZXQucHJvdG90eXBlLnNlbmQ9ZnVuY3Rpb24oYSl7aWYodGhpcy5yZWFkeVN0YXRlPT1XZWJTb2NrZXQuQ09OTkVDVElORyl0aHJvd1wiSU5WQUxJRF9TVEFURV9FUlI6IFdlYiBTb2NrZXQgY29ubmVjdGlvbiBoYXMgbm90IGJlZW4gZXN0YWJsaXNoZWRcIjt2YXIgYj1XZWJTb2NrZXQuX19mbGFzaC5zZW5kKHRoaXMuX19pZCxlbmNvZGVVUklDb21wb25lbnQoYSkpO3JldHVybiBiPDA/ITA6KHRoaXMuYnVmZmVyZWRBbW91bnQrPWIsITEpfSxXZWJTb2NrZXQucHJvdG90eXBlLmNsb3NlPWZ1bmN0aW9uKCl7aWYodGhpcy5yZWFkeVN0YXRlPT1XZWJTb2NrZXQuQ0xPU0VEfHx0aGlzLnJlYWR5U3RhdGU9PVdlYlNvY2tldC5DTE9TSU5HKXJldHVybjt0aGlzLnJlYWR5U3RhdGU9V2ViU29ja2V0LkNMT1NJTkcsV2ViU29ja2V0Ll9fZmxhc2guY2xvc2UodGhpcy5fX2lkKX0sV2ViU29ja2V0LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyPWZ1bmN0aW9uKGEsYixjKXthIGluIHRoaXMuX19ldmVudHN8fCh0aGlzLl9fZXZlbnRzW2FdPVtdKSx0aGlzLl9fZXZlbnRzW2FdLnB1c2goYil9LFdlYlNvY2tldC5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lcj1mdW5jdGlvbihhLGIsYyl7aWYoIShhIGluIHRoaXMuX19ldmVudHMpKXJldHVybjt2YXIgZD10aGlzLl9fZXZlbnRzW2FdO2Zvcih2YXIgZT1kLmxlbmd0aC0xO2U+PTA7LS1lKWlmKGRbZV09PT1iKXtkLnNwbGljZShlLDEpO2JyZWFrfX0sV2ViU29ja2V0LnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50PWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuX19ldmVudHNbYS50eXBlXXx8W107Zm9yKHZhciBjPTA7YzxiLmxlbmd0aDsrK2MpYltjXShhKTt2YXIgZD10aGlzW1wib25cIithLnR5cGVdO2QmJmQoYSl9LFdlYlNvY2tldC5wcm90b3R5cGUuX19oYW5kbGVFdmVudD1mdW5jdGlvbihhKXtcInJlYWR5U3RhdGVcImluIGEmJih0aGlzLnJlYWR5U3RhdGU9YS5yZWFkeVN0YXRlKSxcInByb3RvY29sXCJpbiBhJiYodGhpcy5wcm90b2NvbD1hLnByb3RvY29sKTt2YXIgYjtpZihhLnR5cGU9PVwib3BlblwifHxhLnR5cGU9PVwiZXJyb3JcIiliPXRoaXMuX19jcmVhdGVTaW1wbGVFdmVudChhLnR5cGUpO2Vsc2UgaWYoYS50eXBlPT1cImNsb3NlXCIpYj10aGlzLl9fY3JlYXRlU2ltcGxlRXZlbnQoXCJjbG9zZVwiKTtlbHNle2lmKGEudHlwZSE9XCJtZXNzYWdlXCIpdGhyb3dcInVua25vd24gZXZlbnQgdHlwZTogXCIrYS50eXBlO3ZhciBjPWRlY29kZVVSSUNvbXBvbmVudChhLm1lc3NhZ2UpO2I9dGhpcy5fX2NyZWF0ZU1lc3NhZ2VFdmVudChcIm1lc3NhZ2VcIixjKX10aGlzLmRpc3BhdGNoRXZlbnQoYil9LFdlYlNvY2tldC5wcm90b3R5cGUuX19jcmVhdGVTaW1wbGVFdmVudD1mdW5jdGlvbihhKXtpZihkb2N1bWVudC5jcmVhdGVFdmVudCYmd2luZG93LkV2ZW50KXt2YXIgYj1kb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50XCIpO3JldHVybiBiLmluaXRFdmVudChhLCExLCExKSxifXJldHVybnt0eXBlOmEsYnViYmxlczohMSxjYW5jZWxhYmxlOiExfX0sV2ViU29ja2V0LnByb3RvdHlwZS5fX2NyZWF0ZU1lc3NhZ2VFdmVudD1mdW5jdGlvbihhLGIpe2lmKGRvY3VtZW50LmNyZWF0ZUV2ZW50JiZ3aW5kb3cuTWVzc2FnZUV2ZW50JiYhd2luZG93Lm9wZXJhKXt2YXIgYz1kb2N1bWVudC5jcmVhdGVFdmVudChcIk1lc3NhZ2VFdmVudFwiKTtyZXR1cm4gYy5pbml0TWVzc2FnZUV2ZW50KFwibWVzc2FnZVwiLCExLCExLGIsbnVsbCxudWxsLHdpbmRvdyxudWxsKSxjfXJldHVybnt0eXBlOmEsZGF0YTpiLGJ1YmJsZXM6ITEsY2FuY2VsYWJsZTohMX19LFdlYlNvY2tldC5DT05ORUNUSU5HPTAsV2ViU29ja2V0Lk9QRU49MSxXZWJTb2NrZXQuQ0xPU0lORz0yLFdlYlNvY2tldC5DTE9TRUQ9MyxXZWJTb2NrZXQuX19mbGFzaD1udWxsLFdlYlNvY2tldC5fX2luc3RhbmNlcz17fSxXZWJTb2NrZXQuX190YXNrcz1bXSxXZWJTb2NrZXQuX19uZXh0SWQ9MCxXZWJTb2NrZXQubG9hZEZsYXNoUG9saWN5RmlsZT1mdW5jdGlvbihhKXtXZWJTb2NrZXQuX19hZGRUYXNrKGZ1bmN0aW9uKCl7V2ViU29ja2V0Ll9fZmxhc2gubG9hZE1hbnVhbFBvbGljeUZpbGUoYSl9KX0sV2ViU29ja2V0Ll9faW5pdGlhbGl6ZT1mdW5jdGlvbigpe2lmKFdlYlNvY2tldC5fX2ZsYXNoKXJldHVybjtXZWJTb2NrZXQuX19zd2ZMb2NhdGlvbiYmKHdpbmRvdy5XRUJfU09DS0VUX1NXRl9MT0NBVElPTj1XZWJTb2NrZXQuX19zd2ZMb2NhdGlvbik7aWYoIXdpbmRvdy5XRUJfU09DS0VUX1NXRl9MT0NBVElPTil7YS5lcnJvcihcIltXZWJTb2NrZXRdIHNldCBXRUJfU09DS0VUX1NXRl9MT0NBVElPTiB0byBsb2NhdGlvbiBvZiBXZWJTb2NrZXRNYWluLnN3ZlwiKTtyZXR1cm59dmFyIGI9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtiLmlkPVwid2ViU29ja2V0Q29udGFpbmVyXCIsYi5zdHlsZS5wb3NpdGlvbj1cImFic29sdXRlXCIsV2ViU29ja2V0Ll9faXNGbGFzaExpdGUoKT8oYi5zdHlsZS5sZWZ0PVwiMHB4XCIsYi5zdHlsZS50b3A9XCIwcHhcIik6KGIuc3R5bGUubGVmdD1cIi0xMDBweFwiLGIuc3R5bGUudG9wPVwiLTEwMHB4XCIpO3ZhciBjPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7Yy5pZD1cIndlYlNvY2tldEZsYXNoXCIsYi5hcHBlbmRDaGlsZChjKSxkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGIpLHN3Zm9iamVjdC5lbWJlZFNXRihXRUJfU09DS0VUX1NXRl9MT0NBVElPTixcIndlYlNvY2tldEZsYXNoXCIsXCIxXCIsXCIxXCIsXCIxMC4wLjBcIixudWxsLG51bGwse2hhc1ByaW9yaXR5OiEwLHN3bGl2ZWNvbm5lY3Q6ITAsYWxsb3dTY3JpcHRBY2Nlc3M6XCJhbHdheXNcIn0sbnVsbCxmdW5jdGlvbihiKXtiLnN1Y2Nlc3N8fGEuZXJyb3IoXCJbV2ViU29ja2V0XSBzd2ZvYmplY3QuZW1iZWRTV0YgZmFpbGVkXCIpfSl9LFdlYlNvY2tldC5fX29uRmxhc2hJbml0aWFsaXplZD1mdW5jdGlvbigpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXtXZWJTb2NrZXQuX19mbGFzaD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndlYlNvY2tldEZsYXNoXCIpLFdlYlNvY2tldC5fX2ZsYXNoLnNldENhbGxlclVybChsb2NhdGlvbi5ocmVmKSxXZWJTb2NrZXQuX19mbGFzaC5zZXREZWJ1ZyghIXdpbmRvdy5XRUJfU09DS0VUX0RFQlVHKTtmb3IodmFyIGE9MDthPFdlYlNvY2tldC5fX3Rhc2tzLmxlbmd0aDsrK2EpV2ViU29ja2V0Ll9fdGFza3NbYV0oKTtXZWJTb2NrZXQuX190YXNrcz1bXX0sMCl9LFdlYlNvY2tldC5fX29uRmxhc2hFdmVudD1mdW5jdGlvbigpe3JldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dHJ5e3ZhciBiPVdlYlNvY2tldC5fX2ZsYXNoLnJlY2VpdmVFdmVudHMoKTtmb3IodmFyIGM9MDtjPGIubGVuZ3RoOysrYylXZWJTb2NrZXQuX19pbnN0YW5jZXNbYltjXS53ZWJTb2NrZXRJZF0uX19oYW5kbGVFdmVudChiW2NdKX1jYXRjaChkKXthLmVycm9yKGQpfX0sMCksITB9LFdlYlNvY2tldC5fX2xvZz1mdW5jdGlvbihiKXthLmxvZyhkZWNvZGVVUklDb21wb25lbnQoYikpfSxXZWJTb2NrZXQuX19lcnJvcj1mdW5jdGlvbihiKXthLmVycm9yKGRlY29kZVVSSUNvbXBvbmVudChiKSl9LFdlYlNvY2tldC5fX2FkZFRhc2s9ZnVuY3Rpb24oYSl7V2ViU29ja2V0Ll9fZmxhc2g/YSgpOldlYlNvY2tldC5fX3Rhc2tzLnB1c2goYSl9LFdlYlNvY2tldC5fX2lzRmxhc2hMaXRlPWZ1bmN0aW9uKCl7aWYoIXdpbmRvdy5uYXZpZ2F0b3J8fCF3aW5kb3cubmF2aWdhdG9yLm1pbWVUeXBlcylyZXR1cm4hMTt2YXIgYT13aW5kb3cubmF2aWdhdG9yLm1pbWVUeXBlc1tcImFwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoXCJdO3JldHVybiFhfHwhYS5lbmFibGVkUGx1Z2lufHwhYS5lbmFibGVkUGx1Z2luLmZpbGVuYW1lPyExOmEuZW5hYmxlZFBsdWdpbi5maWxlbmFtZS5tYXRjaCgvZmxhc2hsaXRlL2kpPyEwOiExfSx3aW5kb3cuV0VCX1NPQ0tFVF9ESVNBQkxFX0FVVE9fSU5JVElBTElaQVRJT058fCh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcj93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIixmdW5jdGlvbigpe1dlYlNvY2tldC5fX2luaXRpYWxpemUoKX0sITEpOndpbmRvdy5hdHRhY2hFdmVudChcIm9ubG9hZFwiLGZ1bmN0aW9uKCl7V2ViU29ja2V0Ll9faW5pdGlhbGl6ZSgpfSkpfSkoKSxmdW5jdGlvbihhLGIsYyl7ZnVuY3Rpb24gZChhKXtpZighYSlyZXR1cm47Yi5UcmFuc3BvcnQuYXBwbHkodGhpcyxhcmd1bWVudHMpLHRoaXMuc2VuZEJ1ZmZlcj1bXX1mdW5jdGlvbiBlKCl7fWEuWEhSPWQsYi51dGlsLmluaGVyaXQoZCxiLlRyYW5zcG9ydCksZC5wcm90b3R5cGUub3Blbj1mdW5jdGlvbigpe3JldHVybiB0aGlzLnNvY2tldC5zZXRCdWZmZXIoITEpLHRoaXMub25PcGVuKCksdGhpcy5nZXQoKSx0aGlzLnNldENsb3NlVGltZW91dCgpLHRoaXN9LGQucHJvdG90eXBlLnBheWxvYWQ9ZnVuY3Rpb24oYSl7dmFyIGM9W107Zm9yKHZhciBkPTAsZT1hLmxlbmd0aDtkPGU7ZCsrKWMucHVzaChiLnBhcnNlci5lbmNvZGVQYWNrZXQoYVtkXSkpO3RoaXMuc2VuZChiLnBhcnNlci5lbmNvZGVQYXlsb2FkKGMpKX0sZC5wcm90b3R5cGUuc2VuZD1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5wb3N0KGEpLHRoaXN9LGQucHJvdG90eXBlLnBvc3Q9ZnVuY3Rpb24oYSl7ZnVuY3Rpb24gZCgpe3RoaXMucmVhZHlTdGF0ZT09NCYmKHRoaXMub25yZWFkeXN0YXRlY2hhbmdlPWUsYi5wb3N0aW5nPSExLHRoaXMuc3RhdHVzPT0yMDA/Yi5zb2NrZXQuc2V0QnVmZmVyKCExKTpiLm9uQ2xvc2UoKSl9ZnVuY3Rpb24gZigpe3RoaXMub25sb2FkPWUsYi5zb2NrZXQuc2V0QnVmZmVyKCExKX12YXIgYj10aGlzO3RoaXMuc29ja2V0LnNldEJ1ZmZlcighMCksdGhpcy5zZW5kWEhSPXRoaXMucmVxdWVzdChcIlBPU1RcIiksYy5YRG9tYWluUmVxdWVzdCYmdGhpcy5zZW5kWEhSIGluc3RhbmNlb2YgWERvbWFpblJlcXVlc3Q/dGhpcy5zZW5kWEhSLm9ubG9hZD10aGlzLnNlbmRYSFIub25lcnJvcj1mOnRoaXMuc2VuZFhIUi5vbnJlYWR5c3RhdGVjaGFuZ2U9ZCx0aGlzLnNlbmRYSFIuc2VuZChhKX0sZC5wcm90b3R5cGUuY2xvc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5vbkNsb3NlKCksdGhpc30sZC5wcm90b3R5cGUucmVxdWVzdD1mdW5jdGlvbihhKXt2YXIgYz1iLnV0aWwucmVxdWVzdCh0aGlzLnNvY2tldC5pc1hEb21haW4oKSksZD1iLnV0aWwucXVlcnkodGhpcy5zb2NrZXQub3B0aW9ucy5xdWVyeSxcInQ9XCIrICsobmV3IERhdGUpKTtjLm9wZW4oYXx8XCJHRVRcIix0aGlzLnByZXBhcmVVcmwoKStkLCEwKTtpZihhPT1cIlBPU1RcIil0cnl7Yy5zZXRSZXF1ZXN0SGVhZGVyP2Muc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtdHlwZVwiLFwidGV4dC9wbGFpbjtjaGFyc2V0PVVURi04XCIpOmMuY29udGVudFR5cGU9XCJ0ZXh0L3BsYWluXCJ9Y2F0Y2goZSl7fXJldHVybiBjfSxkLnByb3RvdHlwZS5zY2hlbWU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zb2NrZXQub3B0aW9ucy5zZWN1cmU/XCJodHRwc1wiOlwiaHR0cFwifSxkLmNoZWNrPWZ1bmN0aW9uKGEsZCl7dHJ5e3ZhciBlPWIudXRpbC5yZXF1ZXN0KGQpLGY9Yy5YRG9tYWluUmVxdWVzdCYmZSBpbnN0YW5jZW9mIFhEb21haW5SZXF1ZXN0LGc9YSYmYS5vcHRpb25zJiZhLm9wdGlvbnMuc2VjdXJlP1wiaHR0cHM6XCI6XCJodHRwOlwiLGg9Yy5sb2NhdGlvbiYmZyE9Yy5sb2NhdGlvbi5wcm90b2NvbDtpZihlJiYoIWZ8fCFoKSlyZXR1cm4hMH1jYXRjaChpKXt9cmV0dXJuITF9LGQueGRvbWFpbkNoZWNrPWZ1bmN0aW9uKGEpe3JldHVybiBkLmNoZWNrKGEsITApfX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvLlRyYW5zcG9ydDptb2R1bGUuZXhwb3J0cyxcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLnBhcmVudC5leHBvcnRzLHRoaXMpLGZ1bmN0aW9uKGEsYil7ZnVuY3Rpb24gYyhhKXtiLlRyYW5zcG9ydC5YSFIuYXBwbHkodGhpcyxhcmd1bWVudHMpfWEuaHRtbGZpbGU9YyxiLnV0aWwuaW5oZXJpdChjLGIuVHJhbnNwb3J0LlhIUiksYy5wcm90b3R5cGUubmFtZT1cImh0bWxmaWxlXCIsYy5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKCl7dGhpcy5kb2M9bmV3KHdpbmRvd1tbXCJBY3RpdmVcIl0uY29uY2F0KFwiT2JqZWN0XCIpLmpvaW4oXCJYXCIpXSkoXCJodG1sZmlsZVwiKSx0aGlzLmRvYy5vcGVuKCksdGhpcy5kb2Mud3JpdGUoXCI8aHRtbD48L2h0bWw+XCIpLHRoaXMuZG9jLmNsb3NlKCksdGhpcy5kb2MucGFyZW50V2luZG93LnM9dGhpczt2YXIgYT10aGlzLmRvYy5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO2EuY2xhc3NOYW1lPVwic29ja2V0aW9cIix0aGlzLmRvYy5ib2R5LmFwcGVuZENoaWxkKGEpLHRoaXMuaWZyYW1lPXRoaXMuZG9jLmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIiksYS5hcHBlbmRDaGlsZCh0aGlzLmlmcmFtZSk7dmFyIGM9dGhpcyxkPWIudXRpbC5xdWVyeSh0aGlzLnNvY2tldC5vcHRpb25zLnF1ZXJ5LFwidD1cIisgKyhuZXcgRGF0ZSkpO3RoaXMuaWZyYW1lLnNyYz10aGlzLnByZXBhcmVVcmwoKStkLGIudXRpbC5vbih3aW5kb3csXCJ1bmxvYWRcIixmdW5jdGlvbigpe2MuZGVzdHJveSgpfSl9LGMucHJvdG90eXBlLl89ZnVuY3Rpb24oYSxiKXt0aGlzLm9uRGF0YShhKTt0cnl7dmFyIGM9Yi5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKVswXTtjLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoYyl9Y2F0Y2goZCl7fX0sYy5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe2lmKHRoaXMuaWZyYW1lKXt0cnl7dGhpcy5pZnJhbWUuc3JjPVwiYWJvdXQ6YmxhbmtcIn1jYXRjaChhKXt9dGhpcy5kb2M9bnVsbCx0aGlzLmlmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuaWZyYW1lKSx0aGlzLmlmcmFtZT1udWxsLENvbGxlY3RHYXJiYWdlKCl9fSxjLnByb3RvdHlwZS5jbG9zZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmRlc3Ryb3koKSxiLlRyYW5zcG9ydC5YSFIucHJvdG90eXBlLmNsb3NlLmNhbGwodGhpcyl9LGMuY2hlY2s9ZnVuY3Rpb24oYSl7aWYodHlwZW9mIHdpbmRvdyE9XCJ1bmRlZmluZWRcIiYmW1wiQWN0aXZlXCJdLmNvbmNhdChcIk9iamVjdFwiKS5qb2luKFwiWFwiKWluIHdpbmRvdyl0cnl7dmFyIGM9bmV3KHdpbmRvd1tbXCJBY3RpdmVcIl0uY29uY2F0KFwiT2JqZWN0XCIpLmpvaW4oXCJYXCIpXSkoXCJodG1sZmlsZVwiKTtyZXR1cm4gYyYmYi5UcmFuc3BvcnQuWEhSLmNoZWNrKGEpfWNhdGNoKGQpe31yZXR1cm4hMX0sYy54ZG9tYWluQ2hlY2s9ZnVuY3Rpb24oKXtyZXR1cm4hMX0sYi50cmFuc3BvcnRzLnB1c2goXCJodG1sZmlsZVwiKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvLlRyYW5zcG9ydDptb2R1bGUuZXhwb3J0cyxcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW86bW9kdWxlLnBhcmVudC5leHBvcnRzKSxmdW5jdGlvbihhLGIsYyl7ZnVuY3Rpb24gZCgpe2IuVHJhbnNwb3J0LlhIUi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9ZnVuY3Rpb24gZSgpe31hW1wieGhyLXBvbGxpbmdcIl09ZCxiLnV0aWwuaW5oZXJpdChkLGIuVHJhbnNwb3J0LlhIUiksYi51dGlsLm1lcmdlKGQsYi5UcmFuc3BvcnQuWEhSKSxkLnByb3RvdHlwZS5uYW1lPVwieGhyLXBvbGxpbmdcIixkLnByb3RvdHlwZS5oZWFydGJlYXRzPWZ1bmN0aW9uKCl7cmV0dXJuITF9LGQucHJvdG90eXBlLm9wZW49ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBiLlRyYW5zcG9ydC5YSFIucHJvdG90eXBlLm9wZW4uY2FsbChhKSwhMX0sZC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYigpe3RoaXMucmVhZHlTdGF0ZT09NCYmKHRoaXMub25yZWFkeXN0YXRlY2hhbmdlPWUsdGhpcy5zdGF0dXM9PTIwMD8oYS5vbkRhdGEodGhpcy5yZXNwb25zZVRleHQpLGEuZ2V0KCkpOmEub25DbG9zZSgpKX1mdW5jdGlvbiBkKCl7dGhpcy5vbmxvYWQ9ZSx0aGlzLm9uZXJyb3I9ZSxhLnJldHJ5Q291bnRlcj0xLGEub25EYXRhKHRoaXMucmVzcG9uc2VUZXh0KSxhLmdldCgpfWZ1bmN0aW9uIGYoKXthLnJldHJ5Q291bnRlcisrLCFhLnJldHJ5Q291bnRlcnx8YS5yZXRyeUNvdW50ZXI+Mz9hLm9uQ2xvc2UoKTphLmdldCgpfWlmKCF0aGlzLmlzT3BlbilyZXR1cm47dmFyIGE9dGhpczt0aGlzLnhocj10aGlzLnJlcXVlc3QoKSxjLlhEb21haW5SZXF1ZXN0JiZ0aGlzLnhociBpbnN0YW5jZW9mIFhEb21haW5SZXF1ZXN0Pyh0aGlzLnhoci5vbmxvYWQ9ZCx0aGlzLnhoci5vbmVycm9yPWYpOnRoaXMueGhyLm9ucmVhZHlzdGF0ZWNoYW5nZT1iLHRoaXMueGhyLnNlbmQobnVsbCl9LGQucHJvdG90eXBlLm9uQ2xvc2U9ZnVuY3Rpb24oKXtiLlRyYW5zcG9ydC5YSFIucHJvdG90eXBlLm9uQ2xvc2UuY2FsbCh0aGlzKTtpZih0aGlzLnhocil7dGhpcy54aHIub25yZWFkeXN0YXRlY2hhbmdlPXRoaXMueGhyLm9ubG9hZD10aGlzLnhoci5vbmVycm9yPWU7dHJ5e3RoaXMueGhyLmFib3J0KCl9Y2F0Y2goYSl7fXRoaXMueGhyPW51bGx9fSxkLnByb3RvdHlwZS5yZWFkeT1mdW5jdGlvbihhLGMpe3ZhciBkPXRoaXM7Yi51dGlsLmRlZmVyKGZ1bmN0aW9uKCl7Yy5jYWxsKGQpfSl9LGIudHJhbnNwb3J0cy5wdXNoKFwieGhyLXBvbGxpbmdcIil9KFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbz9pby5UcmFuc3BvcnQ6bW9kdWxlLmV4cG9ydHMsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGlvP2lvOm1vZHVsZS5wYXJlbnQuZXhwb3J0cyx0aGlzKSxmdW5jdGlvbihhLGIsYyl7ZnVuY3Rpb24gZShhKXtiLlRyYW5zcG9ydFtcInhoci1wb2xsaW5nXCJdLmFwcGx5KHRoaXMsYXJndW1lbnRzKSx0aGlzLmluZGV4PWIuai5sZW5ndGg7dmFyIGM9dGhpcztiLmoucHVzaChmdW5jdGlvbihhKXtjLl8oYSl9KX12YXIgZD1jLmRvY3VtZW50JiZcIk1vekFwcGVhcmFuY2VcImluIGMuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlO2FbXCJqc29ucC1wb2xsaW5nXCJdPWUsYi51dGlsLmluaGVyaXQoZSxiLlRyYW5zcG9ydFtcInhoci1wb2xsaW5nXCJdKSxlLnByb3RvdHlwZS5uYW1lPVwianNvbnAtcG9sbGluZ1wiLGUucHJvdG90eXBlLnBvc3Q9ZnVuY3Rpb24oYSl7ZnVuY3Rpb24gaSgpe2ooKSxjLnNvY2tldC5zZXRCdWZmZXIoITEpfWZ1bmN0aW9uIGooKXtjLmlmcmFtZSYmYy5mb3JtLnJlbW92ZUNoaWxkKGMuaWZyYW1lKTt0cnl7aD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCc8aWZyYW1lIG5hbWU9XCInK2MuaWZyYW1lSWQrJ1wiPicpfWNhdGNoKGEpe2g9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKSxoLm5hbWU9Yy5pZnJhbWVJZH1oLmlkPWMuaWZyYW1lSWQsYy5mb3JtLmFwcGVuZENoaWxkKGgpLGMuaWZyYW1lPWh9dmFyIGM9dGhpcyxkPWIudXRpbC5xdWVyeSh0aGlzLnNvY2tldC5vcHRpb25zLnF1ZXJ5LFwidD1cIisgKyhuZXcgRGF0ZSkrXCImaT1cIit0aGlzLmluZGV4KTtpZighdGhpcy5mb3JtKXt2YXIgZT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiKSxmPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKSxnPXRoaXMuaWZyYW1lSWQ9XCJzb2NrZXRpb19pZnJhbWVfXCIrdGhpcy5pbmRleCxoO2UuY2xhc3NOYW1lPVwic29ja2V0aW9cIixlLnN0eWxlLnBvc2l0aW9uPVwiYWJzb2x1dGVcIixlLnN0eWxlLnRvcD1cIjBweFwiLGUuc3R5bGUubGVmdD1cIjBweFwiLGUuc3R5bGUuZGlzcGxheT1cIm5vbmVcIixlLnRhcmdldD1nLGUubWV0aG9kPVwiUE9TVFwiLGUuc2V0QXR0cmlidXRlKFwiYWNjZXB0LWNoYXJzZXRcIixcInV0Zi04XCIpLGYubmFtZT1cImRcIixlLmFwcGVuZENoaWxkKGYpLGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZSksdGhpcy5mb3JtPWUsdGhpcy5hcmVhPWZ9dGhpcy5mb3JtLmFjdGlvbj10aGlzLnByZXBhcmVVcmwoKStkLGooKSx0aGlzLmFyZWEudmFsdWU9Yi5KU09OLnN0cmluZ2lmeShhKTt0cnl7dGhpcy5mb3JtLnN1Ym1pdCgpfWNhdGNoKGspe310aGlzLmlmcmFtZS5hdHRhY2hFdmVudD9oLm9ucmVhZHlzdGF0ZWNoYW5nZT1mdW5jdGlvbigpe2MuaWZyYW1lLnJlYWR5U3RhdGU9PVwiY29tcGxldGVcIiYmaSgpfTp0aGlzLmlmcmFtZS5vbmxvYWQ9aSx0aGlzLnNvY2tldC5zZXRCdWZmZXIoITApfSxlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24oKXt2YXIgYT10aGlzLGM9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKSxlPWIudXRpbC5xdWVyeSh0aGlzLnNvY2tldC5vcHRpb25zLnF1ZXJ5LFwidD1cIisgKyhuZXcgRGF0ZSkrXCImaT1cIit0aGlzLmluZGV4KTt0aGlzLnNjcmlwdCYmKHRoaXMuc2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5zY3JpcHQpLHRoaXMuc2NyaXB0PW51bGwpLGMuYXN5bmM9ITAsYy5zcmM9dGhpcy5wcmVwYXJlVXJsKCkrZSxjLm9uZXJyb3I9ZnVuY3Rpb24oKXthLm9uQ2xvc2UoKX07dmFyIGY9ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzY3JpcHRcIilbMF07Zi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShjLGYpLHRoaXMuc2NyaXB0PWMsZCYmc2V0VGltZW91dChmdW5jdGlvbigpe3ZhciBhPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKSxkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGEpfSwxMDApfSxlLnByb3RvdHlwZS5fPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLm9uRGF0YShhKSx0aGlzLmlzT3BlbiYmdGhpcy5nZXQoKSx0aGlzfSxlLnByb3RvdHlwZS5yZWFkeT1mdW5jdGlvbihhLGMpe3ZhciBlPXRoaXM7aWYoIWQpcmV0dXJuIGMuY2FsbCh0aGlzKTtiLnV0aWwubG9hZChmdW5jdGlvbigpe2MuY2FsbChlKX0pfSxlLmNoZWNrPWZ1bmN0aW9uKCl7cmV0dXJuXCJkb2N1bWVudFwiaW4gY30sZS54ZG9tYWluQ2hlY2s9ZnVuY3Rpb24oKXtyZXR1cm4hMH0sYi50cmFuc3BvcnRzLnB1c2goXCJqc29ucC1wb2xsaW5nXCIpfShcInVuZGVmaW5lZFwiIT10eXBlb2YgaW8/aW8uVHJhbnNwb3J0Om1vZHVsZS5leHBvcnRzLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBpbz9pbzptb2R1bGUucGFyZW50LmV4cG9ydHMsdGhpcyksdHlwZW9mIGRlZmluZT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kJiZkZWZpbmUoW10sZnVuY3Rpb24oKXtyZXR1cm4gaW99KX0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xudmFyIHBsYXllciA9IG51bGw7XG5cbnZhciBLRVkgPSAncGxheWVyJztcblxuZnVuY3Rpb24gbG9hZCgpIHtcbiAgcGxheWVyID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oS0VZKSB8fCAne30nKTtcbn1cblxuZnVuY3Rpb24gc2F2ZSgpIHtcbiAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKEtFWSwgSlNPTi5zdHJpbmdpZnkocGxheWVyKSk7XG59XG5cbmV4cG9ydHMuZ2V0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICghcGxheWVyKSB7XG4gICAgbG9hZCgpO1xuICB9XG4gIHJldHVybiBwbGF5ZXI7XG59O1xuXG5leHBvcnRzLnNldCA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gIHBsYXllciA9IF8uZXh0ZW5kKHBsYXllciB8fCB7fSwgYXR0cnMpO1xuICBzYXZlKCk7XG59O1xuXG5leHBvcnRzLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHBsYXllciA9IG51bGw7XG4gIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShLRVkpO1xufTsiLCIoZnVuY3Rpb24oKXsvLyAgICAgVW5kZXJzY29yZS5qcyAxLjQuNFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgSW5jLlxuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZ2xvYmFsYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBFc3RhYmxpc2ggdGhlIG9iamVjdCB0aGF0IGdldHMgcmV0dXJuZWQgdG8gYnJlYWsgb3V0IG9mIGEgbG9vcCBpdGVyYXRpb24uXG4gIHZhciBicmVha2VyID0ge307XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXIgcHVzaCAgICAgICAgICAgICA9IEFycmF5UHJvdG8ucHVzaCxcbiAgICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlRm9yRWFjaCAgICAgID0gQXJyYXlQcm90by5mb3JFYWNoLFxuICAgIG5hdGl2ZU1hcCAgICAgICAgICA9IEFycmF5UHJvdG8ubWFwLFxuICAgIG5hdGl2ZVJlZHVjZSAgICAgICA9IEFycmF5UHJvdG8ucmVkdWNlLFxuICAgIG5hdGl2ZVJlZHVjZVJpZ2h0ICA9IEFycmF5UHJvdG8ucmVkdWNlUmlnaHQsXG4gICAgbmF0aXZlRmlsdGVyICAgICAgID0gQXJyYXlQcm90by5maWx0ZXIsXG4gICAgbmF0aXZlRXZlcnkgICAgICAgID0gQXJyYXlQcm90by5ldmVyeSxcbiAgICBuYXRpdmVTb21lICAgICAgICAgPSBBcnJheVByb3RvLnNvbWUsXG4gICAgbmF0aXZlSW5kZXhPZiAgICAgID0gQXJyYXlQcm90by5pbmRleE9mLFxuICAgIG5hdGl2ZUxhc3RJbmRleE9mICA9IEFycmF5UHJvdG8ubGFzdEluZGV4T2YsXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QgdmlhIGEgc3RyaW5nIGlkZW50aWZpZXIsXG4gIC8vIGZvciBDbG9zdXJlIENvbXBpbGVyIFwiYWR2YW5jZWRcIiBtb2RlLlxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjQuNCc7XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyBvYmplY3RzIHdpdGggdGhlIGJ1aWx0LWluIGBmb3JFYWNoYCwgYXJyYXlzLCBhbmQgcmF3IG9iamVjdHMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmb3JFYWNoYCBpZiBhdmFpbGFibGUuXG4gIHZhciBlYWNoID0gXy5lYWNoID0gXy5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChfLmhhcyhvYmosIGtleSkpIHtcbiAgICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5XSwga2V5LCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aF0gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZpbHRlcmAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGhdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIWl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICB9LCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGV2ZXJ5YCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciB8fCAoaXRlcmF0b3IgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ1ZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZUV2ZXJ5ICYmIG9iai5ldmVyeSA9PT0gbmF0aXZlRXZlcnkpIHJldHVybiBvYmouZXZlcnkoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghKHJlc3VsdCA9IHJlc3VsdCAmJiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciB8fCAoaXRlcmF0b3IgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChyZXN1bHQgfHwgKHJlc3VsdCA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIHZhbHVlICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCB0YXJnZXQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBvYmouaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgcmV0dXJuIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIChpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdKS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpeyByZXR1cm4gdmFsdWVba2V5XTsgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycywgZmlyc3QpIHtcbiAgICBpZiAoXy5pc0VtcHR5KGF0dHJzKSkgcmV0dXJuIGZpcnN0ID8gbnVsbCA6IFtdO1xuICAgIHJldHVybiBfW2ZpcnN0ID8gJ2ZpbmQnIDogJ2ZpbHRlciddKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gdmFsdWVba2V5XSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy53aGVyZShvYmosIGF0dHJzLCB0cnVlKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZTogaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3XG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0VtcHR5KG9iaikpIHJldHVybiAtSW5maW5pdHk7XG4gICAgdmFyIHJlc3VsdCA9IHtjb21wdXRlZCA6IC1JbmZpbml0eSwgdmFsdWU6IC1JbmZpbml0eX07XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGNvbXB1dGVkID49IHJlc3VsdC5jb21wdXRlZCAmJiAocmVzdWx0ID0ge3ZhbHVlIDogdmFsdWUsIGNvbXB1dGVkIDogY29tcHV0ZWR9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzRW1wdHkob2JqKSkgcmV0dXJuIEluZmluaXR5O1xuICAgIHZhciByZXN1bHQgPSB7Y29tcHV0ZWQgOiBJbmZpbml0eSwgdmFsdWU6IEluZmluaXR5fTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgY29tcHV0ZWQgPCByZXN1bHQuY29tcHV0ZWQgJiYgKHJlc3VsdCA9IHt2YWx1ZSA6IHZhbHVlLCBjb21wdXRlZCA6IGNvbXB1dGVkfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmFuZDtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzaHVmZmxlZCA9IFtdO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKGluZGV4KyspO1xuICAgICAgc2h1ZmZsZWRbaW5kZXggLSAxXSA9IHNodWZmbGVkW3JhbmRdO1xuICAgICAgc2h1ZmZsZWRbcmFuZF0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2h1ZmZsZWQ7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlIDogZnVuY3Rpb24ob2JqKXsgcmV0dXJuIG9ialt2YWx1ZV07IH07XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcih2YWx1ZSk7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlIDogdmFsdWUsXG4gICAgICAgIGluZGV4IDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhIDogaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggPCByaWdodC5pbmRleCA/IC0xIDogMTtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihvYmosIHZhbHVlLCBjb250ZXh0LCBiZWhhdmlvcikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcih2YWx1ZSB8fCBfLmlkZW50aXR5KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICBiZWhhdmlvcihyZXN1bHQsIGtleSwgdmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBncm91cChvYmosIHZhbHVlLCBjb250ZXh0LCBmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICAgIChfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSA6IChyZXN1bHRba2V5XSA9IFtdKSkucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZ3JvdXAob2JqLCB2YWx1ZSwgY29udGV4dCwgZnVuY3Rpb24ocmVzdWx0LCBrZXkpIHtcbiAgICAgIGlmICghXy5oYXMocmVzdWx0LCBrZXkpKSByZXN1bHRba2V5XSA9IDA7XG4gICAgICByZXN1bHRba2V5XSsrO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGl0ZXJhdG9yID09IG51bGwgPyBfLmlkZW50aXR5IDogbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgYXJyYXlbbWlkXSkgPCB2YWx1ZSA/IGxvdyA9IG1pZCArIDEgOiBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIFNhZmVseSBjb252ZXJ0IGFueXRoaW5nIGl0ZXJhYmxlIGludG8gYSByZWFsLCBsaXZlIGFycmF5LlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHJldHVybiAobiAhPSBudWxsKSAmJiAhZ3VhcmQgPyBzbGljZS5jYWxsKGFycmF5LCAwLCBuKSA6IGFycmF5WzBdO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuICE9IG51bGwpICYmICFndWFyZCkge1xuICAgICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIE1hdGgubWF4KGFycmF5Lmxlbmd0aCAtIG4sIDApKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKTtcbiAgfTtcblxuICAvLyBUcmltIG91dCBhbGwgZmFsc3kgdmFsdWVzIGZyb20gYW4gYXJyYXkuXG4gIF8uY29tcGFjdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBfLmlkZW50aXR5KTtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIHJlY3Vyc2l2ZSBgZmxhdHRlbmAgZnVuY3Rpb24uXG4gIHZhciBmbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIHNoYWxsb3csIG91dHB1dCkge1xuICAgIGVhY2goaW5wdXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBzaGFsbG93ID8gcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKSA6IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb21wbGV0ZWx5IGZsYXR0ZW5lZCB2ZXJzaW9uIG9mIGFuIGFycmF5LlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0b3I7XG4gICAgICBpdGVyYXRvciA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGluaXRpYWwgPSBpdGVyYXRvciA/IF8ubWFwKGFycmF5LCBpdGVyYXRvciwgY29udGV4dCkgOiBhcnJheTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZWFjaChpbml0aWFsLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIGlmIChpc1NvcnRlZCA/ICghaW5kZXggfHwgc2VlbltzZWVuLmxlbmd0aCAtIDFdICE9PSB2YWx1ZSkgOiAhXy5jb250YWlucyhzZWVuLCB2YWx1ZSkpIHtcbiAgICAgICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGFycmF5W2luZGV4XSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB1bmlvbjogZWFjaCBkaXN0aW5jdCBlbGVtZW50IGZyb20gYWxsIG9mXG4gIC8vIHRoZSBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLnVuaW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW5pcShjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKF8udW5pcShhcnJheSksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfLmV2ZXJ5KHJlc3QsIGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBfLmluZGV4T2Yob3RoZXIsIGl0ZW0pID49IDA7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmdzLCAnbGVuZ3RoJykpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJncywgXCJcIiArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gSWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwbHkgdXMgd2l0aCBpbmRleE9mIChJJ20gbG9va2luZyBhdCB5b3UsICoqTVNJRSoqKSxcbiAgLy8gd2UgbmVlZCB0aGlzIGZ1bmN0aW9uLiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuXG4gIC8vIGl0ZW0gaW4gYW4gYXJyYXksIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBpbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGw7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGxhc3RJbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIF8ubGFzdEluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgZnJvbSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGhhc0luZGV4ID0gZnJvbSAhPSBudWxsO1xuICAgIGlmIChuYXRpdmVMYXN0SW5kZXhPZiAmJiBhcnJheS5sYXN0SW5kZXhPZiA9PT0gbmF0aXZlTGFzdEluZGV4T2YpIHtcbiAgICAgIHJldHVybiBoYXNJbmRleCA/IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0sIGZyb20pIDogYXJyYXkubGFzdEluZGV4T2YoaXRlbSk7XG4gICAgfVxuICAgIHZhciBpID0gKGhhc0luZGV4ID8gZnJvbSA6IGFycmF5Lmxlbmd0aCk7XG4gICAgd2hpbGUgKGktLSkgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYW4gaW50ZWdlciBBcnJheSBjb250YWluaW5nIGFuIGFyaXRobWV0aWMgcHJvZ3Jlc3Npb24uIEEgcG9ydCBvZlxuICAvLyB0aGUgbmF0aXZlIFB5dGhvbiBgcmFuZ2UoKWAgZnVuY3Rpb24uIFNlZVxuICAvLyBbdGhlIFB5dGhvbiBkb2N1bWVudGF0aW9uXShodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvZnVuY3Rpb25zLmh0bWwjcmFuZ2UpLlxuICBfLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICBzdG9wID0gc3RhcnQgfHwgMDtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgc3RlcCA9IGFyZ3VtZW50c1syXSB8fCAxO1xuXG4gICAgdmFyIGxlbiA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgaWR4ID0gMDtcbiAgICB2YXIgcmFuZ2UgPSBuZXcgQXJyYXkobGVuKTtcblxuICAgIHdoaWxlKGlkeCA8IGxlbikge1xuICAgICAgcmFuZ2VbaWR4KytdID0gc3RhcnQ7XG4gICAgICBzdGFydCArPSBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIGlmIChmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQgJiYgbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFBhcnRpYWxseSBhcHBseSBhIGZ1bmN0aW9uIGJ5IGNyZWF0aW5nIGEgdmVyc2lvbiB0aGF0IGhhcyBoYWQgc29tZSBvZiBpdHNcbiAgLy8gYXJndW1lbnRzIHByZS1maWxsZWQsIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGR5bmFtaWMgYHRoaXNgIGNvbnRleHQuXG4gIF8ucGFydGlhbCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYWxsIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdFxuICAvLyBhbGwgY2FsbGJhY2tzIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGZ1bmNzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChmdW5jcy5sZW5ndGggPT09IDApIGZ1bmNzID0gXy5mdW5jdGlvbnMob2JqKTtcbiAgICBlYWNoKGZ1bmNzLCBmdW5jdGlvbihmKSB7IG9ialtmXSA9IF8uYmluZChvYmpbZl0sIG9iaik7IH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSB7fTtcbiAgICBoYXNoZXIgfHwgKGhhc2hlciA9IF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfLmhhcyhtZW1vLCBrZXkpID8gbWVtb1trZXldIDogKG1lbW9ba2V5XSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpeyByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTsgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHRpbWVvdXQsIHJlc3VsdDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBuZXcgRGF0ZTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub3cgPSBuZXcgRGF0ZTtcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHRpbWVvdXQsIHJlc3VsdDtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgfTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgaWYgKGNhbGxOb3cpIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBbZnVuY107XG4gICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gd3JhcHBlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmdW5jcyA9IGFyZ3VtZW50cztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGZvciAodmFyIGkgPSBmdW5jcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBhcmdzID0gW2Z1bmNzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcmdzWzBdO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIGFmdGVyIGJlaW5nIGNhbGxlZCBOIHRpbWVzLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICBpZiAodGltZXMgPD0gMCkgcmV0dXJuIGZ1bmMoKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIE9iamVjdCBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgT2JqZWN0LmtleXNgXG4gIF8ua2V5cyA9IG5hdGl2ZUtleXMgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiAhPT0gT2JqZWN0KG9iaikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgb2JqZWN0Jyk7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSBrZXlzW2tleXMubGVuZ3RoXSA9IGtleTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHZhbHVlcy5wdXNoKG9ialtrZXldKTtcbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYSBsaXN0IG9mIGBba2V5LCB2YWx1ZV1gIHBhaXJzLlxuICBfLnBhaXJzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHBhaXJzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcGFpcnMucHVzaChba2V5LCBvYmpba2V5XV0pO1xuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJlc3VsdFtvYmpba2V5XV0gPSBrZXk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChrZXkgaW4gb2JqKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoIV8uY29udGFpbnMoa2V5cywga2V5KSkgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgaWYgKG9ialtwcm9wXSA9PSBudWxsKSBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIEhhcm1vbnkgYGVnYWxgIHByb3Bvc2FsOiBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSA9IDAsIHJlc3VsdCA9IHRydWU7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHNpemUgPSBhLmxlbmd0aDtcbiAgICAgIHJlc3VsdCA9IHNpemUgPT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAgIC8vIENvdW50IHRoZSBleHBlY3RlZCBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICAgIGlmIChfLmhhcyhiLCBrZXkpICYmICEoc2l6ZS0tKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIGVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuICEhKG9iaiAmJiBfLmhhcyhvYmosICdjYWxsZWUnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS5cbiAgaWYgKHR5cGVvZiAoLy4vKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0b3JzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KG4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgZXNjYXBlOiB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyYjeDI3OycsXG4gICAgICAnLyc6ICcmI3gyRjsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIHByb3BlcnR5IGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQ7XG4gIC8vIG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiBudWxsO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIGZ1bmMuYXBwbHkoXywgYXJncykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpbnRlZ2VyIGlkICh1bmlxdWUgd2l0aGluIHRoZSBlbnRpcmUgY2xpZW50IHNlc3Npb24pLlxuICAvLyBVc2VmdWwgZm9yIHRlbXBvcmFyeSBET00gaWRzLlxuICB2YXIgaWRDb3VudGVyID0gMDtcbiAgXy51bmlxdWVJZCA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gIH07XG5cbiAgLy8gQnkgZGVmYXVsdCwgVW5kZXJzY29yZSB1c2VzIEVSQi1zdHlsZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzLCBjaGFuZ2UgdGhlXG4gIC8vIGZvbGxvd2luZyB0ZW1wbGF0ZSBzZXR0aW5ncyB0byB1c2UgYWx0ZXJuYXRpdmUgZGVsaW1pdGVycy5cbiAgXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogICAgICBcIidcIixcbiAgICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICAgJ1xccic6ICAgICAncicsXG4gICAgJ1xcbic6ICAgICAnbicsXG4gICAgJ1xcdCc6ICAgICAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIHZhciBlc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdHxcXHUyMDI4fFxcdTIwMjkvZztcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB2YXIgcmVuZGVyO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgICAgIC5yZXBsYWNlKGVzY2FwZXIsIGZ1bmN0aW9uKG1hdGNoKSB7IHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTsgfSk7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChpbnRlcnBvbGF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGludGVycG9sYXRlICsgXCIpKT09bnVsbD8nJzpfX3QpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyBcInJldHVybiBfX3A7XFxuXCI7XG5cbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSByZXR1cm4gcmVuZGVyKGRhdGEsIF8pO1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24gc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonKSArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGRlbGVnYXRlIHRvIHRoZSB3cmFwcGVyLlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8ob2JqKS5jaGFpbigpO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciByZXN1bHQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgYWxsIG9mIHRoZSBVbmRlcnNjb3JlIGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlciBvYmplY3QuXG4gIF8ubWl4aW4oXyk7XG5cbiAgLy8gQWRkIGFsbCBtdXRhdG9yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PSAnc2hpZnQnIHx8IG5hbWUgPT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICBfLmV4dGVuZChfLnByb3RvdHlwZSwge1xuXG4gICAgLy8gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICAgIGNoYWluOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2NoYWluID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgICB9XG5cbiAgfSk7XG5cbn0pLmNhbGwodGhpcyk7XG5cbn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciByb3V0aWUgPSByZXF1aXJlKCcuLi8uLi8uLi8zcmRwYXJ0eS9yb3V0aWUnKTtcbnZhciBwbGF5ZXIgPSByZXF1aXJlKCcuLi9wbGF5ZXInKTtcbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuLi8uLi92aWV3cy9yZWdpc3Rlci1zaW1wbGUuaGJzJyk7XG5cbmZ1bmN0aW9uIGdvKGRhdGEpIHtcbiAgcGxheWVyLnNldCh7XG4gICAgaWQ6IGRhdGEuaWQsXG4gICAgbmFtZTogZGF0YS5uYW1lXG4gIH0pO1xuICByb3V0aWUubmF2aWdhdGUoJy93YWl0Jyk7XG59XG5cbmZ1bmN0aW9uIGVycm9yKHJlcykge1xuICBhbGVydCgnRXJyb3I6ICcgKyByZXMpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZShkYXRhKXtcbiAgcmV0dXJuIF8uZXZlcnkoZGF0YSwgZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmaWVsZFsyXTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1hcERhdGEoZGF0YSl7XG4gIHJldHVybiBfLmluamVjdChkYXRhLCBmdW5jdGlvbihtZW1vLCBjb250cm9sLCBrZXkpe1xuICAgIHZhciBpc0ludmFsaWQgPSBjb250cm9sLnZhbCgpID09PSAnJyB8fCBjb250cm9sLnZhbCgpID09PSAnU2VsZWN0IENvdW50cnknIHx8IGNvbnRyb2wudmFsKCkgPT09ICdTZWxlY3QgUm9sZSc7XG4gICAgbWVtb1trZXldID0gW2NvbnRyb2wsIGNvbnRyb2wudmFsKCksICFpc0ludmFsaWRdO1xuICAgIHJldHVybiBtZW1vO1xuICB9LCB7fSk7XG59XG5cbmZ1bmN0aW9uIGdpdmVGZWVkYmFjayhkYXRhKXtcbiAgXy5lYWNoKGRhdGEsIGZ1bmN0aW9uKGZpZWxkKXtcbiAgICBmaWVsZFswXS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICBpZiAoZmllbGRbMl0gPT09IGZhbHNlKXtcbiAgICAgIGZpZWxkWzBdLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgZmllbGRbMF0ucGFyZW50KCkuZ2V0KDApLnNjcm9sbEludG9WaWV3KCk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXIoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgdmFyIGRhdGEgPSB7XG4gICAgZmlyc3ROYW1lOiAgICAkKCcjZmlyc3ROYW1lJyksXG4gICAgbGFzdE5hbWU6ICAgICAkKCcjbGFzdE5hbWUnKSxcbiAgICBjb21wYW55OiAgICAgICQoJyNjb21wYW55JyksXG4gICAgY291bnRyeTogICAgICAkKCcjY291bnRyeScpLFxuICAgIHJvbGU6ICAgICAgICAgJCgnI3JvbGUnKSxcbiAgICBlbWFpbDogICAgICAgICQoJyNlbWFpbCcpXG4gIH07XG5cbiAgdmFyIG1hcHBlZERhdGEgPSBtYXBEYXRhKGRhdGEpO1xuICB2YXIgZGF0YUlzVmFsaWQgPSB2YWxpZGF0ZShtYXBwZWREYXRhKTtcblxuICBpZiAoZGF0YUlzVmFsaWQpe1xuICAgIHZhciBmb3JtRGF0YSA9IF8uaW5qZWN0KG1hcHBlZERhdGEsIGZ1bmN0aW9uKG0sIGZpZWxkLCBrZXkpeyBtW2tleV0gPSBmaWVsZFsxXTsgcmV0dXJuIG07IH0sIHt9KTtcbiAgICBjb25zb2xlLmxvZygnRklFTERTJywgZm9ybURhdGEpO1xuICAgIFxuICAgICQuYWpheCh7XG4gICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICB1cmw6ICcvcGxheWVyJyxcbiAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGZvcm1EYXRhKSxcbiAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnXG4gICAgfSkudGhlbihnbykuZmFpbChlcnJvcik7XG4gIFxuICB9XG4gIGVsc2Uge1xuICAgIGdpdmVGZWVkYmFjayhtYXBwZWREYXRhKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICBcbiAgaWYgKHBsYXllci5nZXQoKS5pZCkge1xuICAgIHJldHVybiByb3V0aWUubmF2aWdhdGUoJy93YWl0Jyk7XG4gIH1cbiAgXG4gICQoJyNwYWdlJykuYXR0cignY2xhc3MnLCAncmVnaXN0ZXInKTtcbiAgJCgnI3BhZ2UnKS5odG1sKHZpZXcoKSk7XG4gIFxuICAkKCdidXR0b24nKS5vbignY2xpY2snLCByZWdpc3Rlcik7XG4gIFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJ4ID0gcmVxdWlyZSgncnhqcycpO1xudmFyIHJvdXRpZSA9IHJlcXVpcmUoJy4uLy4uLy4uLzNyZHBhcnR5L3JvdXRpZScpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4uL3BsYXllcicpO1xudmFyIHZpZXcgPSByZXF1aXJlKCcuLi8uLi92aWV3cy93YWl0LmhicycpO1xucmVxdWlyZSgnLi4vLi4vLi4vM3JkcGFydHkvcnguemVwdG8nKTtcblxuZnVuY3Rpb24gb2JzZXJ2YWJsZUxvYmJ5KCkge1xuICByZXR1cm4gJC5nZXRKU09OQXNPYnNlcnZhYmxlKCcvZ2FtZS9zdGF0dXMnKTtcbn1cblxuZnVuY3Rpb24gZ2FtZUluUHJvZ3Jlc3MocmVzKSB7XG4gIHJldHVybiByZXMuZGF0YS5pblByb2dyZXNzID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBzd2l0Y2hTdGF0ZSgpIHtcbiAgcm91dGllLm5hdmlnYXRlKCcvam9pbicpO1xufVxuXG5mdW5jdGlvbiBvbkVycm9yKCkge1xuICBjb25zb2xlLmxvZygnR2FtZSBub3QgcmVzcG9uZGluZycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICBcbiAgaWYgKHBsYXllci5nZXQoKS5pZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcm91dGllLm5hdmlnYXRlKCcvY29ubmVjdCcpO1xuICB9XG4gIFxuICAkKCcjcGFnZScpLmF0dHIoJ2NsYXNzJywgJ3dhaXQnKTtcbiAgJCgnI3BhZ2UnKS5odG1sKHZpZXcoKSk7XG5cbiAgcnguT2JzZXJ2YWJsZVxuICAgIC5pbnRlcnZhbCgzMDAwKVxuICAgIC5zdGFydFdpdGgoLTEpXG4gICAgLnNlbGVjdE1hbnkob2JzZXJ2YWJsZUxvYmJ5KVxuICAgIC5za2lwV2hpbGUoZ2FtZUluUHJvZ3Jlc3MpXG4gICAgLnRha2UoMSlcbiAgICAuc3Vic2NyaWJlKHN3aXRjaFN0YXRlLCBvbkVycm9yKTtcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcnggPSByZXF1aXJlKCdyeGpzJyk7XG52YXIgcm91dGllID0gcmVxdWlyZSgnLi4vLi4vLi4vM3JkcGFydHkvcm91dGllJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi4vcGxheWVyJyk7XG52YXIgdmlldyA9IHJlcXVpcmUoJy4uLy4uL3ZpZXdzL2xvYmJ5LmhicycpO1xucmVxdWlyZSgnLi4vLi4vLi4vM3JkcGFydHkvcnguemVwdG8nKTtcblxuZnVuY3Rpb24gb2JzZXJ2YWJsZUxvYmJ5KCkge1xuICByZXR1cm4gJC5nZXRKU09OQXNPYnNlcnZhYmxlKCcvZ2FtZS9zdGF0dXMnKTtcbn1cblxuZnVuY3Rpb24gd2FpdGluZ0Zvck90aGVyUGxheWVyKHJlcykge1xuICByZXR1cm4gcmVzLmRhdGEuaW5Qcm9ncmVzcyA9PT0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0TWF0Y2goKSB7XG4gIHJvdXRpZS5uYXZpZ2F0ZSgnL2dhbWVwYWQnKTtcbn1cblxuZnVuY3Rpb24gb25FcnJvcigpIHtcbiAgY29uc29sZS5sb2coJ0dhbWUgbm90IHJlc3BvbmRpbmcnKTtcbn1cblxuZnVuY3Rpb24gYmFja1RvV2FpdCgpIHtcbiAgcm91dGllLm5hdmlnYXRlKCcvd2FpdCcpO1xufVxuXG5mdW5jdGlvbiBleGl0TG9iYnkoKSB7XG4gICQuYWpheCh7XG4gICAgdHlwZTogJ0RFTEVURScsXG4gICAgdXJsOiAnL2dhbWUvcGxheWVycy8nICsgcGxheWVyLmdldCgpLmlkXG4gIH0pLnRoZW4oYmFja1RvV2FpdCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIFxuICBpZiAocGxheWVyLmdldCgpLmlkID09PSB1bmRlZmluZWQpIHtcbiAgICByb3V0aWUubmF2aWdhdGUoJy9jb25uZWN0Jyk7XG4gIH1cbiAgXG4gICQoJyNwYWdlJykuYXR0cignY2xhc3MnLCAnbG9iYnknKTtcbiAgJCgnI3BhZ2UnKS5odG1sKHZpZXcoKSk7XG4gICQoJyNjYW5jZWwnKS5vbignY2xpY2snLCBleGl0TG9iYnkpO1xuXG4gIHJ4Lk9ic2VydmFibGVcbiAgICAuaW50ZXJ2YWwoMTAwMClcbiAgICAuc3RhcnRXaXRoKC0xKVxuICAgIC5zZWxlY3RNYW55KG9ic2VydmFibGVMb2JieSlcbiAgICAuc2tpcFdoaWxlKHdhaXRpbmdGb3JPdGhlclBsYXllcilcbiAgICAudGFrZSgxKVxuICAgIC5zdWJzY3JpYmUoc3RhcnRNYXRjaCwgb25FcnJvcik7XG5cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcnggPSByZXF1aXJlKCdyeGpzJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vY29uZmlnJyk7XG52YXIgcm91dGllID0gcmVxdWlyZSgnLi4vLi4vLi4vM3JkcGFydHkvcm91dGllJyk7XG52YXIgcGxheWVyID0gcmVxdWlyZSgnLi4vcGxheWVyJyk7XG52YXIgdmlldyA9IHJlcXVpcmUoJy4uLy4uL3ZpZXdzL2dhbWVwYWQuaGJzJyk7XG52YXIgaW8gPSByZXF1aXJlKCcuLi8uLi8uLi8zcmRwYXJ0eS9zb2NrZXQuaW8ubWluJyk7XG52YXIgb2JzZXJ2YWJsZSA9IG51bGw7XG52YXIgc29ja2V0ID0gbnVsbDtcblxuZnVuY3Rpb24gc2VuZEFjdGlvbihhY3Rpb25OYW1lKSB7XG4gIHNvY2tldC5lbWl0KCdtb3ZlJywgeyBwbGF5ZXI6IHBsYXllci5nZXQoKS5pZCwgYWN0aW9uOiBhY3Rpb25OYW1lIH0pO1xufVxuXG5mdW5jdGlvbiBnb1VwKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAkKGUuY3VycmVudFRhcmdldCkuYWRkQ2xhc3MoJ3ByZXNzZWQnKTtcbiAgc2VuZEFjdGlvbigndXAnKTtcbn1cblxuZnVuY3Rpb24gZ29Eb3duKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAkKGUuY3VycmVudFRhcmdldCkuYWRkQ2xhc3MoJ3ByZXNzZWQnKTtcbiAgc2VuZEFjdGlvbignZG93bicpO1xufVxuXG5mdW5jdGlvbiBzdG9wKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAkKGUuY3VycmVudFRhcmdldCkucmVtb3ZlQ2xhc3MoJ3ByZXNzZWQnKTtcbn1cblxuZnVuY3Rpb24gb2JzZXJ2YWJsZUdhbWUoKSB7XG4gIHJldHVybiAkLmdldEpTT05Bc09ic2VydmFibGUoJy9nYW1lL3N0YXR1cycpO1xufVxuXG5mdW5jdGlvbiBjdXJyZW50UGxheWVySW5kZXgocGxheWVycykge1xuICBpZiAocGxheWVyc1swXS5pZCA9PT0gcGxheWVyLmdldCgpLmlkKSB7IHJldHVybiAwOyB9XG4gIGlmIChwbGF5ZXJzWzFdLmlkID09PSBwbGF5ZXIuZ2V0KCkuaWQpIHsgcmV0dXJuIDE7IH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNoZWNrR2FtZVN0YXR1cyhyZXMpIHtcbiAgaWYgKHJlcy5kYXRhLmluUHJvZ3Jlc3MpIHtcbiAgICB2YXIgaWR4ID0gY3VycmVudFBsYXllckluZGV4KHJlcy5kYXRhLnBsYXllcnMpO1xuICAgIGlmIChpZHggPT09IG51bGwpIHtcbiAgICAgIG9ic2VydmFibGUuZGlzcG9zZSgpO1xuICAgICAgcm91dGllLm5hdmlnYXRlKCcvd2FpdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkKCcjcGFnZSAucGxheWVyJykuYWRkQ2xhc3MoJ3AnICsgKGlkeCsxKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG9ic2VydmFibGUuZGlzcG9zZSgpO1xuICAgIGlmIChjb25maWcuYXNrX2Fib3V0X3NvY2lhbF9uZXR3b3JraW5nID09PSB0cnVlKSB7XG4gICAgICByb3V0aWUubmF2aWdhdGUoJy90aGFua3MnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByb3V0aWUubmF2aWdhdGUoJy9qb2luJyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uRXJyb3IoKSB7XG4gIGNvbnNvbGUubG9nKCdHYW1lIG5vdCByZXNwb25kaW5nJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHBsYXllci5nZXQoKS5pZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcm91dGllLm5hdmlnYXRlKCcvY29ubmVjdCcpO1xuICB9XG5cbiAgc29ja2V0ID0gaW8uY29ubmVjdCgnLycpO1xuICBcbiAgJCgnI3BhZ2UnKS5hdHRyKCdjbGFzcycsICdnYW1lcGFkJyk7XG4gICQoJyNwYWdlJykuaHRtbCh2aWV3KCkpO1xuXG4gICQoJy5kZXZpY2UnKS5oZWlnaHQoc2NyZWVuLmhlaWdodCAtIDkwKTtcblxuICBvYnNlcnZhYmxlID0gcnguT2JzZXJ2YWJsZVxuICAgIC5pbnRlcnZhbCgyMDAwKVxuICAgIC5zdGFydFdpdGgoLTEpXG4gICAgLnNlbGVjdE1hbnkob2JzZXJ2YWJsZUdhbWUpXG4gICAgLnN1YnNjcmliZShjaGVja0dhbWVTdGF0dXMsIG9uRXJyb3IpO1xuXG4gIGlmICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHtcbiAgICAkKCcudXAnKS5vbigndG91Y2hzdGFydCcsIGdvVXApO1xuICAgICQoJy51cCcpLm9uKCd0b3VjaGVuZCcsIHN0b3ApO1xuICAgICQoJy5kb3duJykub24oJ3RvdWNoc3RhcnQnLCBnb0Rvd24pO1xuICAgICQoJy5kb3duJykub24oJ3RvdWNoZW5kJywgc3RvcCk7XG4gIH0gZWxzZSB7XG4gICAgJCgnLnVwJykub24oJ21vdXNlZG93bicsIGdvVXApO1xuICAgICQoJy51cCcpLm9uKCdtb3VzZXVwJywgc3RvcCk7XG4gICAgJCgnLmRvd24nKS5vbignbW91c2Vkb3duJywgZ29Eb3duKTtcbiAgICAkKCcuZG93bicpLm9uKCdtb3VzZXVwJywgc3RvcCk7XG4gIH1cbn07XG4iLCIoZnVuY3Rpb24oKXsvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBPcGVuIFRlY2hub2xvZ2llcywgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBTZWUgTGljZW5zZS50eHQgaW4gdGhlIHByb2plY3Qgcm9vdCBmb3IgbGljZW5zZSBpbmZvcm1hdGlvbi5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyb290LCBtb2R1bGUuZXhwb3J0cywgcmVxdWlyZSgncnhqcycpLCAkKTtcbn0odGhpcywgZnVuY3Rpb24gKGdsb2JhbCwgZXhwLCByb290LCAkLCB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gSGVhZGVyc1xuICAgIHZhciByb290ID0gZ2xvYmFsLlJ4LFxuICAgICAgICBvYnNlcnZhYmxlID0gcm9vdC5PYnNlcnZhYmxlLFxuICAgICAgICBvYnNlcnZhYmxlUHJvdG8gPSBvYnNlcnZhYmxlLnByb3RvdHlwZSxcbiAgICAgICAgQXN5bmNTdWJqZWN0ID0gcm9vdC5Bc3luY1N1YmplY3QsXG4gICAgICAgIG9ic2VydmFibGVDcmVhdGUgPSBvYnNlcnZhYmxlLmNyZWF0ZSxcbiAgICAgICAgb2JzZXJ2YWJsZUNyZWF0ZVdpdGhEaXNwb3NhYmxlID0gb2JzZXJ2YWJsZS5jcmVhdGVXaXRoRGlzcG9zYWJsZSxcbiAgICAgICAgZGlzcG9zYWJsZUVtcHR5ID0gcm9vdC5EaXNwb3NhYmxlLmVtcHR5LFxuICAgICAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZSxcbiAgICAgICAgcHJvdG8gPSAkLmZuO1xuICAgICAgICBcbiAgICAkLkRlZmVycmVkLnByb3RvdHlwZS50b09ic2VydmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdWJqZWN0ID0gbmV3IEFzeW5jU3ViamVjdCgpO1xuICAgICAgICB0aGlzLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc3ViamVjdC5vbk5leHQoc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgICAgIHN1YmplY3Qub25Db21wbGV0ZWQoKTtcbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzdWJqZWN0Lm9uRXJyb3Ioc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH07XG5cbiAgICBvYnNlcnZhYmxlUHJvdG8udG9EZWZlcnJlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgICAgICB0aGlzLnN1YnNjcmliZShmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZSkgeyBcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZDtcbiAgICB9O1xuXG4gICAgdmFyIGFqYXhBc09ic2VydmFibGUgPSAkLmFqYXhBc09ic2VydmFibGUgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgICAgICB2YXIgc3ViamVjdCA9IG5ldyBBc3luY1N1YmplY3QoKTtcblxuICAgICAgICB2YXIgaW50ZXJuYWxTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRleHRTdGF0dXMsIGpxWEhSKSB7XG4gICAgICAgICAgICAgICAgc3ViamVjdC5vbk5leHQoeyBkYXRhOiBkYXRhLCB0ZXh0U3RhdHVzOiB0ZXh0U3RhdHVzLCBqcVhIUjoganFYSFIgfSk7XG4gICAgICAgICAgICAgICAgc3ViamVjdC5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24pIHtcbiAgICAgICAgICAgICAgICBzdWJqZWN0Lm9uRXJyb3IoeyBqcVhIUjoganFYSFIsIHRleHRTdGF0dXM6IHRleHRTdGF0dXMsIGVycm9yVGhyb3duOiBlcnJvclRocm93biB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgICQuZXh0ZW5kKHRydWUsIGludGVybmFsU2V0dGluZ3MsIHNldHRpbmdzKTtcblxuICAgICAgICAkLmFqYXgoaW50ZXJuYWxTZXR0aW5ncyk7XG5cbiAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfTtcblxuICAgICQuZ2V0QXNPYnNlcnZhYmxlID0gZnVuY3Rpb24odXJsLCBkYXRhLCBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gYWpheEFzT2JzZXJ2YWJsZSh7IHVybDogdXJsLCBkYXRhVHlwZTogZGF0YVR5cGUsIGRhdGE6IGRhdGEgfSk7XG4gICAgfTtcblxuICAgICQuZ2V0SlNPTkFzT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uKHVybCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gYWpheEFzT2JzZXJ2YWJsZSh7IHVybDogdXJsLCBkYXRhVHlwZTogJ2pzb24nLCBkYXRhOiBkYXRhIH0pO1xuICAgIH07XG5cblxuICAgICQucG9zdEFzT2JzZXJ2YWJsZSA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGFqYXhBc09ic2VydmFibGUoeyB1cmw6IHVybCwgZGF0YVR5cGU6IGRhdGFUeXBlLCBkYXRhOiBkYXRhLCB0eXBlOiAnUE9TVCd9KTtcdFxuICAgIH07XG5cbiAgICByZXR1cm4gcm9vdDtcblxufSkpO1xuXG59KSgpIiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYW5kbGViYXJzLXJ1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCJcXG48aDE+UmVnaXN0ZXIgVG8gUGxheTwvaDE+XFxuXFxuPGZvcm0+XFxuICBcXG4gIDxkaXYgY2xhc3M9XFxcImZpZWxkXFxcIj5cXG4gICAgPGxhYmVsPlxcbiAgICBcdEZpcnN0IG5hbWVcXG4gICAgXHQ8c3BhbiBjbGFzcz1cXFwicmVxdWlyZWRcXFwiPio8L3NwYW4+XFxuICAgIDwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiZmlyc3ROYW1lXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiXFxcIiBhdXRvY29ycmVjdD1cXFwib2ZmXFxcIiAvPlxcbiAgPC9kaXY+XFxuICBcXG4gIDxkaXYgY2xhc3M9XFxcImZpZWxkXFxcIj5cXG4gICAgPGxhYmVsPlxcbiAgIFx0XHQgTGFzdCBuYW1lXFxuICAgXHQgXHQ8c3BhbiBjbGFzcz1cXFwicmVxdWlyZWRcXFwiPio8L3NwYW4+XFxuICAgIDwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwibGFzdE5hbWVcXFwiIHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJcXFwiIGF1dG9jb3JyZWN0PVxcXCJvZmZcXFwiIC8+XFxuICA8L2Rpdj5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcImZpZWxkXFxcIj5cXG4gICAgPGxhYmVsPlxcbiAgICBcdEVtYWlsXFxuICAgIFx0PHNwYW4gY2xhc3M9XFxcInJlcXVpcmVkXFxcIj4qPC9zcGFuPlxcbiAgICA8L2xhYmVsPlxcbiAgICA8aW5wdXQgaWQ9XFxcImVtYWlsXFxcIiB0eXBlPVxcXCJlbWFpbFxcXCIgdmFsdWU9XFxcIlxcXCIgYXV0b2NvcnJlY3Q9XFxcIm9mZlxcXCIgLz5cXG4gIDwvZGl2PlxcbiAgXFxuICA8YnV0dG9uPlBsYXkhPC9idXR0b24+XFxuPC9mb3JtPlxcblwiO1xuICB9KTtcbiIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycy1ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiXFxuPGgxPm1hdGNoIGluIHByb2dyZXNzPC9oMT5cXG5cXG48ZGl2IGNsYXNzPSd3YWl0LW1lc3NhZ2UnPlxcblx0PHA+XFxuXHQgIEFzIHNvb24gYXMgdGhlIGN1cnJlbnQgbWF0Y2ggaXMgZmluaXNoZWQsXFxuXHQgIHlvdSdsbCBiZSBhYmxlIHRvIGpvaW4gdGhlIGFjdGlvbiFcXG5cdDwvcD5cXG48L2Rpdj5cIjtcbiAgfSk7XG4iLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMtcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIlxcbjxoMT5QcmVzcyBzdGFydCB0byBqb2luIHRoZSBnYW1lPC9oMT5cXG5cXG48YnV0dG9uIGlkPVxcXCJqb2luXFxcIiBvbnRvdWNoc3RhcnQ9XFxcIlxcXCI+U3RhcnQ8L2J1dHRvbj5cXG5cIjtcbiAgfSk7XG4iLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMtcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIlxcbjxoMT53YWl0aW5nIGZvciAybmQgcGxheWVyPC9oMT5cXG5cXG48YnV0dG9uIGlkPVxcXCJjYW5jZWxcXFwiIG9udG91Y2hzdGFydD1cXFwiXFxcIj5jYW5jZWw8L2J1dHRvbj5cXG5cIjtcbiAgfSk7XG4iLCJ2YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMtcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcInBsYXllclxcXCI+XFxuXFxuPGRpdiBjbGFzcz1cXFwiZGV2aWNlLWJhY2tncm91bmRcXFwiPjwvZGl2PlxcbiBcXG4gIDxkaXYgY2xhc3M9XFxcImRldmljZSBjbGVhcmZpeFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImNvbnRyb2xsZXIgY2xlYXJmaXhcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImJ1dHRvblxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ1cFxcXCI+PGkgY2xhc3M9XFxcImljb24tY2FyZXQtdXBcXFwiPjwvaT48L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJidXR0b25cXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZG93blxcXCI+PGkgY2xhc3M9XFxcImljb24tY2FyZXQtZG93blxcXCI+PC9pPjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlxcblxcblwiO1xuICB9KTtcbiIsInZhciBIYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycy1ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5cbiAgYnVmZmVyICs9IFwiXFxuPGgxPnRoYW5rcyBmb3IgcGxheWluZyE8L2gxPlxcbjxwIGNsYXNzPVxcXCJ0d2l0dGVyLXRlYXNlclxcXCI+XFxuXHRUd2VldCB5b3VyIHNjb3JlIGFuZCBUaG91Z2h0V29ya3Mgd2lsbCBkb25hdGUgJDEgdG8gW0NBVVNFXS5cXG48L3A+XFxuPHA+XFxuXHQ8YSBocmVmPVxcXCJodHRwczovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldD9idXR0b25faGFzaHRhZz1cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnR3aXR0ZXIpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaGFzaHRhZykpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiJnRleHQ9XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC50d2l0dGVyKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm1lc3NhZ2UpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgY2xhc3M9XFxcInR3aXR0ZXItaGFzaHRhZy1idXR0b25cXFwiIGRhdGEtc2l6ZT1cXFwibGFyZ2VcXFwiIGRhdGEtcmVsYXRlZD1cXFwiVGhvdWdodFdvcmtzXFxcIj5Ud2VldCBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnR3aXR0ZXIpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaGFzaHRhZykpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9hPlxcblxcblx0PHNjcmlwdD4hZnVuY3Rpb24oZCxzLGlkKXt2YXIganMsZmpzPWQuZ2V0RWxlbWVudHNCeVRhZ05hbWUocylbMF0scD0vXmh0dHA6Ly50ZXN0KGQubG9jYXRpb24pPydodHRwJzonaHR0cHMnO2lmKCFkLmdldEVsZW1lbnRCeUlkKGlkKSl7anM9ZC5jcmVhdGVFbGVtZW50KHMpO2pzLmlkPWlkO2pzLnNyYz1wKyc6Ly9wbGF0Zm9ybS50d2l0dGVyLmNvbS93aWRnZXRzLmpzJztmanMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoanMsZmpzKTt9fShkb2N1bWVudCwgJ3NjcmlwdCcsICd0d2l0dGVyLXdqcycpOzwvc2NyaXB0PlxcbjwvcD5cXG48cD5cXG4gIGJlIHN1cmUgdG8gYXNrIGFib3V0IHdoYXQgd2UgZG8maGVsbGlwOyBhbmQgaG93IHdlIGJ1aWx0IHRoaXMgZ2FtZVxcbjwvcD5cXG48cD5cXG5UaG91Z2h0V29ya3MgaXMgYSBzb2Z0d2FyZSBjb21wYW55IGFuZCBjb21tdW5pdHkgb2YgcGFzc2lvbmF0ZSBpbmRpdmlkdWFscyB3aG9zZSBwdXJwb3NlIGlzIHRvIHJldm9sdXRpb25pc2Ugc29mdHdhcmUgZGVzaWduLCBjcmVhdGlvbiBhbmQgZGVsaXZlcnksIHdoaWxlIGFkdm9jYXRpbmcgZm9yIHBvc2l0aXZlIHNvY2lhbCBjaGFuZ2UuXFxuPC9wPlxcblxcbjxidXR0b24gaWQ9XFxcImRvbmVcXFwiPkknbSBEb25lPC9idXR0b24+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwiLypcblxuQ29weXJpZ2h0IChDKSAyMDExIGJ5IFllaHVkYSBLYXR6XG5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbm9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbmluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbnRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbmNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbmFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG5JTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbkZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbk9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cblRIRSBTT0ZUV0FSRS5cblxuKi9cblxuLy8gbGliL2hhbmRsZWJhcnMvYnJvd3Nlci1wcmVmaXguanNcbnZhciBIYW5kbGViYXJzID0ge307XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnM7XG5cbihmdW5jdGlvbihIYW5kbGViYXJzLCB1bmRlZmluZWQpIHtcbjtcbi8vIGxpYi9oYW5kbGViYXJzL2Jhc2UuanNcblxuSGFuZGxlYmFycy5WRVJTSU9OID0gXCIxLjAuMFwiO1xuSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5cbkhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5cbkhhbmRsZWJhcnMuaGVscGVycyAgPSB7fTtcbkhhbmRsZWJhcnMucGFydGlhbHMgPSB7fTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBmdW5jdGlvblR5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG5cbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMpO1xuICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMuSyA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuY3JlYXRlRnJhbWUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uKG9iamVjdCkge1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gb2JqZWN0O1xuICB2YXIgb2JqID0gbmV3IEhhbmRsZWJhcnMuSygpO1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gbnVsbDtcbiAgcmV0dXJuIG9iajtcbn07XG5cbkhhbmRsZWJhcnMubG9nZ2VyID0ge1xuICBERUJVRzogMCwgSU5GTzogMSwgV0FSTjogMiwgRVJST1I6IDMsIGxldmVsOiAzLFxuXG4gIG1ldGhvZE1hcDogezA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InfSxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAoSGFuZGxlYmFycy5sb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBIYW5kbGViYXJzLmxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMubG9nID0gZnVuY3Rpb24obGV2ZWwsIG9iaikgeyBIYW5kbGViYXJzLmxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGRhdGEgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gIH1cblxuICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgIGlmKGNvbnRleHQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gMCl7XG4gICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29uZGl0aW9uYWwpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoIWNvbmRpdGlvbmFsIHx8IEhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbn0pO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAoIUhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gIEhhbmRsZWJhcnMubG9nKGxldmVsLCBjb250ZXh0KTtcbn0pO1xuO1xuLy8gbGliL2hhbmRsZWJhcnMvdXRpbHMuanNcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5IYW5kbGViYXJzLkV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufTtcbkhhbmRsZWJhcnMuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuSGFuZGxlYmFycy5TYWZlU3RyaW5nID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufTtcbkhhbmRsZWJhcnMuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5nLnRvU3RyaW5nKCk7XG59O1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxudmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn07XG5cbkhhbmRsZWJhcnMuVXRpbHMgPSB7XG4gIGV4dGVuZDogZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXNjYXBlRXhwcmVzc2lvbjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBIYW5kbGViYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsIHx8IHN0cmluZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9IHN0cmluZy50b1N0cmluZygpO1xuXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZih0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG47XG4vLyBsaWIvaGFuZGxlYmFycy9ydW50aW1lLmpzXG5cbkhhbmRsZWJhcnMuVk0gPSB7XG4gIHRlbXBsYXRlOiBmdW5jdGlvbih0ZW1wbGF0ZVNwZWMpIHtcbiAgICAvLyBKdXN0IGFkZCB3YXRlclxuICAgIHZhciBjb250YWluZXIgPSB7XG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBIYW5kbGViYXJzLlZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcbiAgICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICAgIHJldCA9IHt9O1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcbiAgICAgIHByb2dyYW1XaXRoRGVwdGg6IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICAgIG5vb3A6IEhhbmRsZWJhcnMuVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoY29udGFpbmVyLCBIYW5kbGViYXJzLCBjb250ZXh0LCBvcHRpb25zLmhlbHBlcnMsIG9wdGlvbnMucGFydGlhbHMsIG9wdGlvbnMuZGF0YSk7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdLFxuICAgICAgICAgIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBIYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICBwcm9ncmFtV2l0aERlcHRoOiBmdW5jdGlvbihpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSAwO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBub29wOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiXCI7IH0sXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gICAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICghSGFuZGxlYmFycy5jb21waWxlKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShwYXJ0aWFsLCB7ZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkfSk7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLnRlbXBsYXRlID0gSGFuZGxlYmFycy5WTS50ZW1wbGF0ZTtcbjtcbi8vIGxpYi9oYW5kbGViYXJzL2Jyb3dzZXItc3VmZml4LmpzXG59KShIYW5kbGViYXJzKTtcbjtcbiIsIihmdW5jdGlvbihnbG9iYWwpe3JlcXVpcmUoXCIuL3J4Lm1pbi5qc1wiKShnbG9iYWwpO1xyXG5yZXF1aXJlKFwiLi9yeC5hZ2dyZWdhdGVzLm1pbi5qc1wiKShnbG9iYWwpO1xyXG5yZXF1aXJlKFwiLi9yeC5jb2luY2lkZW5jZS5taW4uanNcIikoZ2xvYmFsKTtcclxucmVxdWlyZShcIi4vcnguam9pbnBhdHRlcm5zLm1pbi5qc1wiKShnbG9iYWwpO1xyXG5yZXF1aXJlKFwiLi9yeC50aW1lLm1pbi5qc1wiKShnbG9iYWwpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSeFxyXG5cbn0pKHdpbmRvdykiLCIvKlxuIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiAgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiBUaGlzIGNvZGUgaXMgbGljZW5zZWQgYnkgTWljcm9zb2Z0IENvcnBvcmF0aW9uIHVuZGVyIHRoZSB0ZXJtc1xuIG9mIHRoZSBNSUNST1NPRlQgUkVBQ1RJVkUgRVhURU5TSU9OUyBGT1IgSkFWQVNDUklQVCBBTkQgLk5FVCBMSUJSQVJJRVMgTGljZW5zZS5cbiBTZWUgaHR0cDovL2dvLm1pY3Jvc29mdC5jb20vZndsaW5rLz9MaW5rSUQ9MjIwNzYyLlxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oayx0KXt2YXIgbDtsPWsuUng7dmFyIG49bC5PYnNlcnZhYmxlLGQ9bi5wcm90b3R5cGUsbT1uLmNyZWF0ZVdpdGhEaXNwb3NhYmxlLHU9bC5Db21wb3NpdGVEaXNwb3NhYmxlLG89ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYT09PWJ9LHA9ZnVuY3Rpb24oYSl7cmV0dXJuIGF9LHE9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYT5iPzE6YT09PWI/MDotMX0scj1mdW5jdGlvbihhLGIsZCl7cmV0dXJuIG0oZnVuY3Rpb24oYyl7dmFyIGY9ITEsZz1udWxsLGg9W107cmV0dXJuIGEuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe3ZhciBlLGk7dHJ5e2k9YihhKX1jYXRjaCh2KXtjLm9uRXJyb3Iodik7cmV0dXJufWU9MDtpZihmKXRyeXtlPWQoaSxnKX1jYXRjaCh3KXtjLm9uRXJyb3Iodyk7cmV0dXJufWVsc2UgZj0hMCxnPVxuaTswPGUmJihnPWksaD1bXSk7MDw9ZSYmaC5wdXNoKGEpfSxmdW5jdGlvbihhKXtjLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Yy5vbk5leHQoaCk7Yy5vbkNvbXBsZXRlZCgpfSl9KX07ZC5hZ2dyZWdhdGU9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5zY2FuKGEsYikuc3RhcnRXaXRoKGEpLmZpbmFsVmFsdWUoKX07ZC5hZ2dyZWdhdGUxPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLnNjYW4xKGEpLmZpbmFsVmFsdWUoKX07ZC5hbnk9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztyZXR1cm4gYSE9PXQ/Yi53aGVyZShhKS5hbnkoKTptKGZ1bmN0aW9uKGEpe3JldHVybiBiLnN1YnNjcmliZShmdW5jdGlvbigpe2Eub25OZXh0KCEwKTthLm9uQ29tcGxldGVkKCl9LGZ1bmN0aW9uKGIpe2Eub25FcnJvcihiKX0sZnVuY3Rpb24oKXthLm9uTmV4dCghMSk7YS5vbkNvbXBsZXRlZCgpfSl9KX07ZC5hbGw9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMud2hlcmUoZnVuY3Rpb24oYil7cmV0dXJuIWEoYil9KS5hbnkoKS5zZWxlY3QoZnVuY3Rpb24oYSl7cmV0dXJuIWF9KX07XG5kLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7Ynx8KGI9byk7cmV0dXJuIHRoaXMud2hlcmUoZnVuY3Rpb24oZCl7cmV0dXJuIGIoZCxhKX0pLmFueSgpfTtkLmNvdW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuYWdncmVnYXRlKDAsZnVuY3Rpb24oYSl7cmV0dXJuIGErMX0pfTtkLnN1bT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmFnZ3JlZ2F0ZSgwLGZ1bmN0aW9uKGEsYil7cmV0dXJuIGErYn0pfTtkLm1pbkJ5PWZ1bmN0aW9uKGEsYil7Ynx8KGI9cSk7cmV0dXJuIHIodGhpcyxhLGZ1bmN0aW9uKGEsYyl7cmV0dXJuLTEqYihhLGMpfSl9O3ZhciBzPWZ1bmN0aW9uKGEpe2lmKDA9PWEubGVuZ3RoKXRocm93IEVycm9yKFwiU2VxdWVuY2UgY29udGFpbnMgbm8gZWxlbWVudHMuXCIpO3JldHVybiBhWzBdfTtkLm1pbj1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5taW5CeShwLGEpLnNlbGVjdChmdW5jdGlvbihhKXtyZXR1cm4gcyhhKX0pfTtkLm1heEJ5PWZ1bmN0aW9uKGEsYil7Ynx8KGI9cSk7XG5yZXR1cm4gcih0aGlzLGEsYil9O2QubWF4PWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLm1heEJ5KHAsYSkuc2VsZWN0KGZ1bmN0aW9uKGEpe3JldHVybiBzKGEpfSl9O2QuYXZlcmFnZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnNjYW4oe3N1bTowLGNvdW50OjB9LGZ1bmN0aW9uKGEsYil7cmV0dXJue3N1bTphLnN1bStiLGNvdW50OmEuY291bnQrMX19KS5maW5hbFZhbHVlKCkuc2VsZWN0KGZ1bmN0aW9uKGEpe3JldHVybiBhLnN1bS9hLmNvdW50fSl9O2Quc2VxdWVuY2VFcXVhbD1mdW5jdGlvbihhLGIpe3ZhciBkPXRoaXM7Ynx8KGI9byk7cmV0dXJuIG0oZnVuY3Rpb24oYyl7dmFyIGY9ITEsZz0hMSxoPVtdLGo9W10sZT1kLnN1YnNjcmliZShmdW5jdGlvbihhKXt2YXIgZCxmO2lmKDA8ai5sZW5ndGgpe2Y9ai5zaGlmdCgpO3RyeXtkPWIoZixhKX1jYXRjaChlKXtjLm9uRXJyb3IoZSk7cmV0dXJufWR8fChjLm9uTmV4dCghMSksYy5vbkNvbXBsZXRlZCgpKX1lbHNlIGc/KGMub25OZXh0KCExKSxcbmMub25Db21wbGV0ZWQoKSk6aC5wdXNoKGEpfSxmdW5jdGlvbihhKXtjLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Zj0hMDswPT09aC5sZW5ndGgmJigwPGoubGVuZ3RoPyhjLm9uTmV4dCghMSksYy5vbkNvbXBsZXRlZCgpKTpnJiYoYy5vbk5leHQoITApLGMub25Db21wbGV0ZWQoKSkpfSksaT1hLnN1YnNjcmliZShmdW5jdGlvbihhKXt2YXIgZCxlO2lmKDA8aC5sZW5ndGgpe2U9aC5zaGlmdCgpO3RyeXtkPWIoZSxhKX1jYXRjaChnKXtjLm9uRXJyb3IoZyk7cmV0dXJufWR8fChjLm9uTmV4dCghMSksYy5vbkNvbXBsZXRlZCgpKX1lbHNlIGY/KGMub25OZXh0KCExKSxjLm9uQ29tcGxldGVkKCkpOmoucHVzaChhKX0sZnVuY3Rpb24oYSl7Yy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2c9ITA7MD09PWoubGVuZ3RoJiYoMDxoLmxlbmd0aD8oYy5vbk5leHQoITEpLGMub25Db21wbGV0ZWQoKSk6ZiYmKGMub25OZXh0KCEwKSxjLm9uQ29tcGxldGVkKCkpKX0pO3JldHVybiBuZXcgdShlLFxuaSl9KX19O1xuIiwiLypcbiBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gVGhpcyBjb2RlIGlzIGxpY2Vuc2VkIGJ5IE1pY3Jvc29mdCBDb3Jwb3JhdGlvbiB1bmRlciB0aGUgdGVybXNcbiBvZiB0aGUgTUlDUk9TT0ZUIFJFQUNUSVZFIEVYVEVOU0lPTlMgRk9SIEpBVkFTQ1JJUFQgQU5EIC5ORVQgTElCUkFSSUVTIExpY2Vuc2UuXG4gU2VlIGh0dHA6Ly9nby5taWNyb3NvZnQuY29tL2Z3bGluay8/TGlua0lEPTIyMDc2Mi5cbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHgsbil7dmFyIG0saWE9ZnVuY3Rpb24oKXt9LEo9ZnVuY3Rpb24oKXtyZXR1cm4obmV3IERhdGUpLmdldFRpbWUoKX0sVj1mdW5jdGlvbihhLGIpe3JldHVybiBhPT09Yn0sUT1mdW5jdGlvbihhKXtyZXR1cm4gYX0sVz1mdW5jdGlvbihhKXtyZXR1cm4gYS50b1N0cmluZygpfSxYPU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksbz1mdW5jdGlvbihhLGIpe2Z1bmN0aW9uIGMoKXt0aGlzLmNvbnN0cnVjdG9yPWF9Zm9yKHZhciBkIGluIGIpWC5jYWxsKGIsZCkmJihhW2RdPWJbZF0pO2MucHJvdG90eXBlPWIucHJvdG90eXBlO2EucHJvdG90eXBlPW5ldyBjO2EuYmFzZT1iLnByb3RvdHlwZTtyZXR1cm4gYX0sRT1mdW5jdGlvbihhLGIpe2Zvcih2YXIgYyBpbiBiKVguY2FsbChiLGMpJiYoYVtjXT1iW2NdKX0seT1BcnJheS5wcm90b3R5cGUuc2xpY2UsSz1cIk9iamVjdCBoYXMgYmVlbiBkaXNwb3NlZFwiO209eC5SeD17SW50ZXJuYWxzOnt9fTttLlZFUlNJT049XCIxLjAuMTA2MjFcIjt2YXIgamE9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gaShmdW5jdGlvbihjKXtyZXR1cm4gbmV3IHAoYi5nZXREaXNwb3NhYmxlKCksYS5zdWJzY3JpYmUoYykpfSl9LEY9ZnVuY3Rpb24oYSxiLGMpe3JldHVybiBpKGZ1bmN0aW9uKGQpe3ZhciBlPW5ldyB2LGc9bmV3IHYsZD1jKGQsZSxnKTtlLmRpc3Bvc2FibGUoYS5tYXRlcmlhbGl6ZSgpLnNlbGVjdChmdW5jdGlvbihiKXtyZXR1cm57c3dpdGNoVmFsdWU6ZnVuY3Rpb24oYSl7cmV0dXJuIGEoYil9fX0pLnN1YnNjcmliZShkKSk7Zy5kaXNwb3NhYmxlKGIubWF0ZXJpYWxpemUoKS5zZWxlY3QoZnVuY3Rpb24oYil7cmV0dXJue3N3aXRjaFZhbHVlOmZ1bmN0aW9uKGEsYyl7cmV0dXJuIGMoYil9fX0pLnN1YnNjcmliZShkKSk7cmV0dXJuIG5ldyBwKGUsZyl9KX0sdT1tLkludGVybmFscy5MaXN0PVxuZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGIpe3RoaXMuY29tcGFyZXI9Ynx8Vjt0aGlzLnNpemU9MDt0aGlzLml0ZW1zPVtdfWEuZnJvbUFycmF5PWZ1bmN0aW9uKGIsYyl7dmFyIGQsZT1iLmxlbmd0aCxnPW5ldyBhKGMpO2ZvcihkPTA7ZDxlO2QrKylnLmFkZChiW2RdKTtyZXR1cm4gZ307YS5wcm90b3R5cGUuY291bnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zaXplfTthLnByb3RvdHlwZS5hZGQ9ZnVuY3Rpb24oYil7dGhpcy5pdGVtc1t0aGlzLnNpemVdPWI7dGhpcy5zaXplKyt9O2EucHJvdG90eXBlLnJlbW92ZUF0PWZ1bmN0aW9uKGIpe2lmKDA+Ynx8Yj49dGhpcy5zaXplKXRocm93IEVycm9yKFwiQXJndW1lbnQgb3V0IG9mIHJhbmdlXCIpOzA9PT1iP3RoaXMuaXRlbXMuc2hpZnQoKTp0aGlzLml0ZW1zLnNwbGljZShiLDEpO3RoaXMuc2l6ZS0tfTthLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKGIpe3ZhciBhLGQ7Zm9yKGE9MDthPHRoaXMuaXRlbXMubGVuZ3RoO2ErKylpZihkPVxudGhpcy5pdGVtc1thXSx0aGlzLmNvbXBhcmVyKGIsZCkpcmV0dXJuIGE7cmV0dXJuLTF9O2EucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbihiKXtiPXRoaXMuaW5kZXhPZihiKTtpZigtMT09PWIpcmV0dXJuITE7dGhpcy5yZW1vdmVBdChiKTtyZXR1cm4hMH07YS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt0aGlzLml0ZW1zPVtdO3RoaXMuc2l6ZT0wfTthLnByb3RvdHlwZS5pdGVtPWZ1bmN0aW9uKGIsYSl7aWYoMD5ifHxiPj1jb3VudCl0aHJvdyBFcnJvcihcIkFyZ3VtZW50IG91dCBvZiByYW5nZVwiKTtpZihhPT09bilyZXR1cm4gdGhpcy5pdGVtc1tiXTt0aGlzLml0ZW1zW2JdPWF9O2EucHJvdG90eXBlLnRvQXJyYXk9ZnVuY3Rpb24oKXt2YXIgYj1bXSxhO2ZvcihhPTA7YTx0aGlzLml0ZW1zLmxlbmd0aDthKyspYi5wdXNoKHRoaXMuaXRlbXNbYV0pO3JldHVybiBifTthLnByb3RvdHlwZS5jb250YWlucz1mdW5jdGlvbihiKXtmb3IodmFyIGE9MDthPHRoaXMuaXRlbXMubGVuZ3RoO2ErKylpZih0aGlzLmNvbXBhcmVyKGIsXG50aGlzLml0ZW1zW2FdKSlyZXR1cm4hMDtyZXR1cm4hMX07cmV0dXJuIGF9KCksa2E9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGIsYSl7dGhpcy5pZD1iO3RoaXMudmFsdWU9YX1hLnByb3RvdHlwZS5jb21wYXJlVG89ZnVuY3Rpb24oYil7dmFyIGE9dGhpcy52YWx1ZS5jb21wYXJlVG8oYi52YWx1ZSk7MD09PWEmJihhPXRoaXMuaWQtYi5pZCk7cmV0dXJuIGF9O3JldHVybiBhfSgpLFk9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGIpe3RoaXMuaXRlbXM9QXJyYXkoYik7dGhpcy5zaXplPTB9YS5wcm90b3R5cGUuY291bnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zaXplfTthLnByb3RvdHlwZS5pc0hpZ2hlclByaW9yaXR5PWZ1bmN0aW9uKGIsYSl7cmV0dXJuIDA+dGhpcy5pdGVtc1tiXS5jb21wYXJlVG8odGhpcy5pdGVtc1thXSl9O2EucHJvdG90eXBlLnBlcmNvbGF0ZT1mdW5jdGlvbihiKXt2YXIgYSxkO2lmKCEoYj49dGhpcy5zaXplfHwwPmIpKWlmKGE9TWF0aC5mbG9vcigoYi0xKS9cbjIpLCEoMD5hfHxhPT09YikmJnRoaXMuaXNIaWdoZXJQcmlvcml0eShiLGEpKWQ9dGhpcy5pdGVtc1tiXSx0aGlzLml0ZW1zW2JdPXRoaXMuaXRlbXNbYV0sdGhpcy5pdGVtc1thXT1kLHRoaXMucGVyY29sYXRlKGEpfTthLnByb3RvdHlwZS5oZWFwaWZ5PWZ1bmN0aW9uKGIpe3ZhciBhLGQsZTtiPT09biYmKGI9MCk7Yj49dGhpcy5zaXplfHwwPmJ8fChkPTIqYisxLGU9MipiKzIsYT1iLGQ8dGhpcy5zaXplJiZ0aGlzLmlzSGlnaGVyUHJpb3JpdHkoZCxhKSYmKGE9ZCksZTx0aGlzLnNpemUmJnRoaXMuaXNIaWdoZXJQcmlvcml0eShlLGEpJiYoYT1lKSxhIT09YiYmKGQ9dGhpcy5pdGVtc1tiXSx0aGlzLml0ZW1zW2JdPXRoaXMuaXRlbXNbYV0sdGhpcy5pdGVtc1thXT1kLHRoaXMuaGVhcGlmeShhKSkpfTthLnByb3RvdHlwZS5wZWVrPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXRlbXNbMF0udmFsdWV9O2EucHJvdG90eXBlLnJlbW92ZUF0PWZ1bmN0aW9uKGIpe3RoaXMuaXRlbXNbYl09XG50aGlzLml0ZW1zWy0tdGhpcy5zaXplXTtkZWxldGUgdGhpcy5pdGVtc1t0aGlzLnNpemVdO3RoaXMuaGVhcGlmeSgpO2lmKHRoaXMuc2l6ZTx0aGlzLml0ZW1zLmxlbmd0aD4+Milmb3IodmFyIGI9dGhpcy5pdGVtcyxhPXRoaXMuaXRlbXM9QXJyYXkodGhpcy5pdGVtcy5sZW5ndGg+PjEpLGQ9dGhpcy5zaXplOzA8ZDspYVtkKzAtMV09YltkKzAtMV0sZC0tfTthLnByb3RvdHlwZS5kZXF1ZXVlPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcy5wZWVrKCk7dGhpcy5yZW1vdmVBdCgwKTtyZXR1cm4gYn07YS5wcm90b3R5cGUuZW5xdWV1ZT1mdW5jdGlvbihiKXt2YXIgYztpZih0aGlzLnNpemU+PXRoaXMuaXRlbXMubGVuZ3RoKXtjPXRoaXMuaXRlbXM7Zm9yKHZhciBkPXRoaXMuaXRlbXM9QXJyYXkoMip0aGlzLml0ZW1zLmxlbmd0aCksZT1jLmxlbmd0aDswPGU7KWRbZSswLTFdPWNbZSswLTFdLGUtLX1jPXRoaXMuc2l6ZSsrO3RoaXMuaXRlbXNbY109bmV3IGthKGEuY291bnQrKyxiKTt0aGlzLnBlcmNvbGF0ZShjKX07XG5hLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24oYil7dmFyIGE7Zm9yKGE9MDthPHRoaXMuc2l6ZTthKyspaWYodGhpcy5pdGVtc1thXS52YWx1ZT09PWIpcmV0dXJuIHRoaXMucmVtb3ZlQXQoYSksITA7cmV0dXJuITF9O2EuY291bnQ9MDtyZXR1cm4gYX0oKSxwPW0uQ29tcG9zaXRlRGlzcG9zYWJsZT1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoKXt2YXIgYj0hMSxhPXUuZnJvbUFycmF5KHkuY2FsbChhcmd1bWVudHMpKTt0aGlzLmNvdW50PWZ1bmN0aW9uKCl7cmV0dXJuIGEuY291bnQoKX07dGhpcy5hZGQ9ZnVuY3Rpb24oZCl7Yj9kLmRpc3Bvc2UoKTphLmFkZChkKX07dGhpcy5yZW1vdmU9ZnVuY3Rpb24oZCl7dmFyIGU9ITE7Ynx8KGU9YS5yZW1vdmUoZCkpO2UmJmQuZGlzcG9zZSgpO3JldHVybiBlfTt0aGlzLmRpc3Bvc2U9ZnVuY3Rpb24oKXt2YXIgZCxlO2J8fChiPSEwLGQ9YS50b0FycmF5KCksYS5jbGVhcigpKTtpZihkIT09bilmb3IoZT0wO2U8ZC5sZW5ndGg7ZSsrKWRbZV0uZGlzcG9zZSgpfTtcbnRoaXMuY2xlYXI9ZnVuY3Rpb24oKXt2YXIgYixlO2I9YS50b0FycmF5KCk7YS5jbGVhcigpO2ZvcihlPTA7ZTxiLmxlbmd0aDtlKyspYltlXS5kaXNwb3NlKCl9O3RoaXMuY29udGFpbnM9ZnVuY3Rpb24oYil7cmV0dXJuIGEuY29udGFpbnMoYil9O3RoaXMuaXNEaXNwb3NlZD1mdW5jdGlvbigpe3JldHVybiBifTt0aGlzLnRvQXJyYXk9ZnVuY3Rpb24oKXtyZXR1cm4gYS50b0FycmF5KCl9fWEucHJvdG90eXBlLmNvdW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY291bnQoKX07YS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKGIpe3RoaXMuYWRkKGIpfTthLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24oYil7dGhpcy5yZW1vdmUoYil9O2EucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXt0aGlzLmRpc3Bvc2UoKX07YS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt0aGlzLmNsZWFyKCl9O2EucHJvdG90eXBlLmNvbnRhaW5zPWZ1bmN0aW9uKGIpe3JldHVybiB0aGlzLmNvbnRhaW5zKGIpfTtcbmEucHJvdG90eXBlLmlzRGlzcG9zZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pc0Rpc3Bvc2VkKCl9O2EucHJvdG90eXBlLnRvQXJyYXk9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b0FycmF5KCl9O3JldHVybiBhfSgpLEw9bS5EaXNwb3NhYmxlPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShiKXt2YXIgYT0hMTt0aGlzLmRpc3Bvc2U9ZnVuY3Rpb24oKXthfHwoYigpLGE9ITApfX1hLnByb3RvdHlwZS5kaXNwb3NlPWZ1bmN0aW9uKCl7dGhpcy5kaXNwb3NlKCl9O3JldHVybiBhfSgpLEE9TC5jcmVhdGU9ZnVuY3Rpb24oYSl7cmV0dXJuIG5ldyBMKGEpfSx3PUwuZW1wdHk9bmV3IEwoZnVuY3Rpb24oKXt9KSx2PW0uU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGU9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7dmFyIGI9ITEsYT1udWxsO3RoaXMuaXNEaXNwb3NlZD1mdW5jdGlvbigpe3JldHVybiBifTt0aGlzLmdldERpc3Bvc2FibGU9ZnVuY3Rpb24oKXtyZXR1cm4gYX07dGhpcy5zZXREaXNwb3NhYmxlPVxuZnVuY3Rpb24oZCl7aWYobnVsbCE9PWEpdGhyb3cgRXJyb3IoXCJEaXNwb3NhYmxlIGhhcyBhbHJlYWR5IGJlZW4gYXNzaWduZWRcIik7dmFyIGU9YjtlfHwoYT1kKTtlJiZudWxsIT09ZCYmZC5kaXNwb3NlKCl9O3RoaXMuZGlzcG9zZT1mdW5jdGlvbigpe3ZhciBkPW51bGw7Ynx8KGI9ITAsZD1hLGE9bnVsbCk7bnVsbCE9PWQmJmQuZGlzcG9zZSgpfX1hLnByb3RvdHlwZS5pc0Rpc3Bvc2VkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNEaXNwb3NlZCgpfTthLnByb3RvdHlwZS5kaXNwb3NhYmxlPWZ1bmN0aW9uKGIpe2lmKGI9PT1uKXJldHVybiB0aGlzLmdldERpc3Bvc2FibGUoKTt0aGlzLnNldERpc3Bvc2FibGUoYil9O2EucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXt0aGlzLmRpc3Bvc2UoKX07cmV0dXJuIGF9KCksQz1tLlNlcmlhbERpc3Bvc2FibGU9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7dmFyIGI9ITEsYT1udWxsO3RoaXMuaXNEaXNwb3NlZD1mdW5jdGlvbigpe3JldHVybiBifTtcbnRoaXMuZ2V0RGlzcG9zYWJsZT1mdW5jdGlvbigpe3JldHVybiBhfTt0aGlzLnNldERpc3Bvc2FibGU9ZnVuY3Rpb24oZCl7dmFyIGU9YixnPW51bGw7ZXx8KGc9YSxhPWQpO251bGwhPT1nJiZnLmRpc3Bvc2UoKTtlJiZudWxsIT09ZCYmZC5kaXNwb3NlKCl9O3RoaXMuZGlzcG9zZT1mdW5jdGlvbigpe3ZhciBkPW51bGw7Ynx8KGI9ITAsZD1hLGE9bnVsbCk7bnVsbCE9PWQmJmQuZGlzcG9zZSgpfX1hLnByb3RvdHlwZS5pc0Rpc3Bvc2VkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNEaXNwb3NlZCgpfTthLnByb3RvdHlwZS5kaXNwb3NhYmxlPWZ1bmN0aW9uKGEpe2lmKGE9PT1uKXJldHVybiB0aGlzLmdldERpc3Bvc2FibGUoKTt0aGlzLnNldERpc3Bvc2FibGUoYSl9O2EucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXt0aGlzLmRpc3Bvc2UoKX07YS5wcm90b3R5cGUuZGlzcG9zZT1mdW5jdGlvbigpe3RoaXMuZGlzcG9zZSgpfTtyZXR1cm4gYX0oKSxaPW0uUmVmQ291bnREaXNwb3NhYmxlPVxuZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGEpe3ZhciBjPSExLGQ9ITEsZT0wO3RoaXMuZGlzcG9zZT1mdW5jdGlvbigpe3ZhciBnPSExOyFjJiYhZCYmKGQ9ITAsMD09PWUmJihnPWM9ITApKTtnJiZhLmRpc3Bvc2UoKX07dGhpcy5nZXREaXNwb3NhYmxlPWZ1bmN0aW9uKCl7aWYoYylyZXR1cm4gdztlKys7dmFyIGc9ITE7cmV0dXJue2Rpc3Bvc2U6ZnVuY3Rpb24oKXt2YXIgaD0hMTshYyYmIWcmJihnPSEwLGUtLSwwPT09ZSYmZCYmKGg9Yz0hMCkpO2gmJmEuZGlzcG9zZSgpfX19O3RoaXMuaXNEaXNwb3NlZD1mdW5jdGlvbigpe3JldHVybiBjfX1hLnByb3RvdHlwZS5kaXNwb3NlPWZ1bmN0aW9uKCl7dGhpcy5kaXNwb3NlKCl9O2EucHJvdG90eXBlLmdldERpc3Bvc2FibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXREaXNwb3NhYmxlKCl9O2EucHJvdG90eXBlLmlzRGlzcG9zZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pc0Rpc3Bvc2VkKCl9O3JldHVybiBhfSgpLFI7Uj1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSxcbmMsZCxlLGcpe3RoaXMuc2NoZWR1bGVyPWE7dGhpcy5zdGF0ZT1jO3RoaXMuYWN0aW9uPWQ7dGhpcy5kdWVUaW1lPWU7dGhpcy5jb21wYXJlcj1nfHxmdW5jdGlvbihhLGIpe3JldHVybiBhLWJ9O3RoaXMuZGlzcG9zYWJsZT1uZXcgdn1hLnByb3RvdHlwZS5pbnZva2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2FibGUodGhpcy5pbnZva2VDb3JlKCkpfTthLnByb3RvdHlwZS5jb21wYXJlVG89ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuY29tcGFyZXIodGhpcy5kdWVUaW1lLGEuZHVlVGltZSl9O2EucHJvdG90eXBlLmlzQ2FuY2VsbGVkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZGlzcG9zYWJsZS5pc0Rpc3Bvc2VkKCl9O2EucHJvdG90eXBlLmludm9rZUNvcmU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5hY3Rpb24odGhpcy5zY2hlZHVsZXIsdGhpcy5zdGF0ZSl9O3JldHVybiBhfSgpO3ZhciBzPW0uU2NoZWR1bGVyPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShhLFxuYixjLGQpe3RoaXMubm93PWE7dGhpcy5fc2NoZWR1bGU9Yjt0aGlzLl9zY2hlZHVsZVJlbGF0aXZlPWM7dGhpcy5fc2NoZWR1bGVBYnNvbHV0ZT1kfXZhciBiPWZ1bmN0aW9uKGEsYil7dmFyIGMsZCxlLGs7ZD1uZXcgcDtrPWIuZmlyc3Q7Yz1iLnNlY29uZDtlPW51bGw7ZT1mdW5jdGlvbihiKXtjKGIsZnVuY3Rpb24oYil7dmFyIGMsaCxsO2w9aD0hMTtjPW51bGw7Yz1hLnNjaGVkdWxlV2l0aFN0YXRlKGIsZnVuY3Rpb24oYSxiKXtoP2QucmVtb3ZlKGMpOmw9ITA7ZShiKTtyZXR1cm4gd30pO2x8fChkLmFkZChjKSxoPSEwKX0pfTtlKGspO3JldHVybiBkfSxjPWZ1bmN0aW9uKGEsYil7dmFyIGMsZCxlLGs7ZD1uZXcgcDtrPWIuZmlyc3Q7Yz1iLnNlY29uZDtlPWZ1bmN0aW9uKGIpe2MoYixmdW5jdGlvbihiLGMpe3ZhciBoLGwsaztrPWw9ITE7aD1hLnNjaGVkdWxlV2l0aFJlbGF0aXZlQW5kU3RhdGUoYixjLGZ1bmN0aW9uKGEsYil7bD9kLnJlbW92ZShoKTprPSEwO2UoYik7cmV0dXJuIHd9KTtcbmt8fChkLmFkZChoKSxsPSEwKX0pfTtlKGspO3JldHVybiBkfSxkPWZ1bmN0aW9uKGEsYil7dmFyIGMsZCxlLGs7ZD1uZXcgcDtrPWIuZmlyc3Q7Yz1iLnNlY29uZDtlPWZ1bmN0aW9uKGIpe2MoYixmdW5jdGlvbihiLGMpe3ZhciBoPSExLGw9ITEsaz1hLnNjaGVkdWxlV2l0aEFic29sdXRlQW5kU3RhdGUoYixjLGZ1bmN0aW9uKGEsYil7aD9kLnJlbW92ZShrKTpsPSEwO2UoYik7cmV0dXJuIHd9KTtsfHwoZC5hZGQoayksaD0hMCl9KX07ZShrKTtyZXR1cm4gZH0sZT1mdW5jdGlvbihhLGIpe2IoKTtyZXR1cm4gd307YS5wcm90b3R5cGUuc2NoZWR1bGU9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX3NjaGVkdWxlKGEsZSl9O2EucHJvdG90eXBlLnNjaGVkdWxlV2l0aFN0YXRlPWZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuX3NjaGVkdWxlKGEsYil9O2EucHJvdG90eXBlLnNjaGVkdWxlV2l0aFJlbGF0aXZlPWZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuX3NjaGVkdWxlUmVsYXRpdmUoYixcbmEsZSl9O2EucHJvdG90eXBlLnNjaGVkdWxlV2l0aFJlbGF0aXZlQW5kU3RhdGU9ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB0aGlzLl9zY2hlZHVsZVJlbGF0aXZlKGEsYixjKX07YS5wcm90b3R5cGUuc2NoZWR1bGVXaXRoQWJzb2x1dGU9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5fc2NoZWR1bGVBYnNvbHV0ZShiLGEsZSl9O2EucHJvdG90eXBlLnNjaGVkdWxlV2l0aEFic29sdXRlQW5kU3RhdGU9ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB0aGlzLl9zY2hlZHVsZUFic29sdXRlKGEsYixjKX07YS5wcm90b3R5cGUuc2NoZWR1bGVSZWN1cnNpdmU9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuc2NoZWR1bGVSZWN1cnNpdmVXaXRoU3RhdGUoYSxmdW5jdGlvbihhLGIpe2EoZnVuY3Rpb24oKXtiKGEpfSl9KX07YS5wcm90b3R5cGUuc2NoZWR1bGVSZWN1cnNpdmVXaXRoU3RhdGU9ZnVuY3Rpb24oYSxjKXtyZXR1cm4gdGhpcy5zY2hlZHVsZVdpdGhTdGF0ZSh7Zmlyc3Q6YSxzZWNvbmQ6Y30sXG5mdW5jdGlvbihhLGMpe3JldHVybiBiKGEsYyl9KX07YS5wcm90b3R5cGUuc2NoZWR1bGVSZWN1cnNpdmVXaXRoUmVsYXRpdmU9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5zY2hlZHVsZVJlY3Vyc2l2ZVdpdGhSZWxhdGl2ZUFuZFN0YXRlKGIsYSxmdW5jdGlvbihhLGIpe2EoZnVuY3Rpb24oYyl7YihhLGMpfSl9KX07YS5wcm90b3R5cGUuc2NoZWR1bGVSZWN1cnNpdmVXaXRoUmVsYXRpdmVBbmRTdGF0ZT1mdW5jdGlvbihhLGIsZCl7cmV0dXJuIHRoaXMuX3NjaGVkdWxlUmVsYXRpdmUoe2ZpcnN0OmEsc2Vjb25kOmR9LGIsZnVuY3Rpb24oYSxiKXtyZXR1cm4gYyhhLGIpfSl9O2EucHJvdG90eXBlLnNjaGVkdWxlUmVjdXJzaXZlV2l0aEFic29sdXRlPWZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMuc2NoZWR1bGVSZWN1cnNpdmVXaXRoQWJzb2x1dGVBbmRTdGF0ZShiLGEsZnVuY3Rpb24oYSxiKXthKGZ1bmN0aW9uKGMpe2IoYSxjKX0pfSl9O2EucHJvdG90eXBlLnNjaGVkdWxlUmVjdXJzaXZlV2l0aEFic29sdXRlQW5kU3RhdGU9XG5mdW5jdGlvbihhLGIsYyl7cmV0dXJuIHRoaXMuX3NjaGVkdWxlQWJzb2x1dGUoe2ZpcnN0OmEsc2Vjb25kOmN9LGIsZnVuY3Rpb24oYSxiKXtyZXR1cm4gZChhLGIpfSl9O2Eubm93PUo7YS5ub3JtYWxpemU9ZnVuY3Rpb24oYSl7MD5hJiYoYT0wKTtyZXR1cm4gYX07cmV0dXJuIGF9KCksZj1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoKXt2YXIgYj10aGlzO2EuYmFzZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsSixmdW5jdGlvbihhLGQpe3JldHVybiBkKGIsYSl9LGZ1bmN0aW9uKGEsZCxlKXtmb3IoOzA8cy5ub3JtYWxpemUoZCk7KTtyZXR1cm4gZShiLGEpfSxmdW5jdGlvbihhLGQsZSl7cmV0dXJuIGIuc2NoZWR1bGVXaXRoUmVsYXRpdmVBbmRTdGF0ZShhLGQtYi5ub3coKSxlKX0pfW8oYSxzKTtyZXR1cm4gYX0oKSxCPXMuSW1tZWRpYXRlPW5ldyBmLGxhPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYSgpe00ucXVldWU9bmV3IFkoNCl9YS5wcm90b3R5cGUuZGlzcG9zZT1mdW5jdGlvbigpe00ucXVldWU9XG5udWxsfTthLnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXtmb3IodmFyIGEsYz1NLnF1ZXVlOzA8Yy5jb3VudCgpOylpZihhPWMuZGVxdWV1ZSgpLCFhLmlzQ2FuY2VsbGVkKCkpe2Zvcig7MDxhLmR1ZVRpbWUtcy5ub3coKTspO2EuaXNDYW5jZWxsZWQoKXx8YS5pbnZva2UoKX19O3JldHVybiBhfSgpLE09ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7dmFyIGI9dGhpczthLmJhc2UuY29uc3RydWN0b3IuY2FsbCh0aGlzLEosZnVuY3Rpb24oYSxkKXtyZXR1cm4gYi5zY2hlZHVsZVdpdGhSZWxhdGl2ZUFuZFN0YXRlKGEsMCxkKX0sZnVuY3Rpb24oYyxkLGUpe3ZhciBnPWIubm93KCkrcy5ub3JtYWxpemUoZCksZD1hLnF1ZXVlLGM9bmV3IFIoYixjLGUsZyk7aWYobnVsbD09PWQpe2U9bmV3IGxhO3RyeXthLnF1ZXVlLmVucXVldWUoYyksZS5ydW4oKX1maW5hbGx5e2UuZGlzcG9zZSgpfX1lbHNlIGQuZW5xdWV1ZShjKTtyZXR1cm4gYy5kaXNwb3NhYmxlfSxmdW5jdGlvbihhLGQsZSl7cmV0dXJuIGIuc2NoZWR1bGVXaXRoUmVsYXRpdmVBbmRTdGF0ZShhLFxuZC1iLm5vdygpLGUpfSl9byhhLHMpO2EucHJvdG90eXBlLnNjaGVkdWxlUmVxdWlyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gbnVsbD09PWEucXVldWV9O2EucHJvdG90eXBlLmVuc3VyZVRyYW1wb2xpbmU9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuc2NoZWR1bGVSZXF1aXJlZCgpP3RoaXMuc2NoZWR1bGUoYSk6YSgpfTthLnF1ZXVlPW51bGw7cmV0dXJuIGF9KCksRD1zLkN1cnJlbnRUaHJlYWQ9bmV3IE07bS5WaXJ0dWFsVGltZVNjaGVkdWxlcj1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYixjKXt2YXIgZD10aGlzO3RoaXMuY2xvY2s9Yjt0aGlzLmNvbXBhcmVyPWM7dGhpcy5pc0VuYWJsZWQ9ITE7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyxmdW5jdGlvbigpe3JldHVybiBkLnRvRGF0ZVRpbWVPZmZzZXQoZC5jbG9jayl9LGZ1bmN0aW9uKGEsYil7cmV0dXJuIGQuc2NoZWR1bGVBYnNvbHV0ZShhLGQuY2xvY2ssYil9LGZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gZC5zY2hlZHVsZVJlbGF0aXZlKGEsXG5kLnRvUmVsYXRpdmUoYiksYyl9LGZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gZC5zY2hlZHVsZVJlbGF0aXZlKGEsZC50b1JlbGF0aXZlKGItZC5ub3coKSksYyl9KTt0aGlzLnF1ZXVlPW5ldyBZKDEwMjQpfW8oYSxzKTthLnByb3RvdHlwZS5zY2hlZHVsZVJlbGF0aXZlPWZ1bmN0aW9uKGEsYyxkKXtjPXRoaXMuYWRkKHRoaXMuY2xvY2ssYyk7cmV0dXJuIHRoaXMuc2NoZWR1bGVBYnNvbHV0ZShhLGMsZCl9O2EucHJvdG90eXBlLnN0YXJ0PWZ1bmN0aW9uKCl7dmFyIGE7aWYoIXRoaXMuaXNFbmFibGVkKXt0aGlzLmlzRW5hYmxlZD0hMDtkbyBpZihhPXRoaXMuZ2V0TmV4dCgpLG51bGwhPT1hKXtpZigwPHRoaXMuY29tcGFyZXIoYS5kdWVUaW1lLHRoaXMuY2xvY2spKXRoaXMuY2xvY2s9YS5kdWVUaW1lO2EuaW52b2tlKCl9ZWxzZSB0aGlzLmlzRW5hYmxlZD0hMTt3aGlsZSh0aGlzLmlzRW5hYmxlZCl9fTthLnByb3RvdHlwZS5zdG9wPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXNFbmFibGVkPVxuITF9O2EucHJvdG90eXBlLmFkdmFuY2VUbz1mdW5jdGlvbihhKXt2YXIgYztpZigwPD10aGlzLmNvbXBhcmVyKHRoaXMuY2xvY2ssYSkpdGhyb3cgRXJyb3IoXCJBcmd1bWVudCBvdXQgb2YgcmFuZ2VcIik7aWYoIXRoaXMuaXNFbmFibGVkKXt0aGlzLmlzRW5hYmxlZD0hMDtkbyBpZihjPXRoaXMuZ2V0TmV4dCgpLG51bGwhPT1jJiYwPj10aGlzLmNvbXBhcmVyKGMuZHVlVGltZSxhKSl7aWYoMDx0aGlzLmNvbXBhcmVyKGMuZHVlVGltZSx0aGlzLmNsb2NrKSl0aGlzLmNsb2NrPWMuZHVlVGltZTtjLmludm9rZSgpfWVsc2UgdGhpcy5pc0VuYWJsZWQ9ITE7d2hpbGUodGhpcy5pc0VuYWJsZWQpO3JldHVybiB0aGlzLmNsb2NrPWF9fTthLnByb3RvdHlwZS5hZHZhbmNlQnk9ZnVuY3Rpb24oYSl7YT10aGlzLmFkZCh0aGlzLmNsb2NrLGEpO2lmKDA8PXRoaXMuY29tcGFyZXIodGhpcy5jbG9jayxhKSl0aHJvdyBFcnJvcihcIkFyZ3VtZW50IG91dCBvZiByYW5nZVwiKTtyZXR1cm4gdGhpcy5hZHZhbmNlVG8oYSl9O1xuYS5wcm90b3R5cGUuZ2V0TmV4dD1mdW5jdGlvbigpe2Zvcih2YXIgYTswPHRoaXMucXVldWUuY291bnQoKTspaWYoYT10aGlzLnF1ZXVlLnBlZWsoKSxhLmlzQ2FuY2VsbGVkKCkpdGhpcy5xdWV1ZS5kZXF1ZXVlKCk7ZWxzZSByZXR1cm4gYTtyZXR1cm4gbnVsbH07YS5wcm90b3R5cGUuc2NoZWR1bGVBYnNvbHV0ZT1mdW5jdGlvbihhLGMsZCl7dmFyIGU9dGhpcyxnPW5ldyBSKGUsYSxmdW5jdGlvbihhLGIpe2UucXVldWUucmVtb3ZlKGcpO3JldHVybiBkKGEsYil9LGMsZS5jb21wYXJlcik7ZS5xdWV1ZS5lbnF1ZXVlKGcpO3JldHVybiBnLmRpc3Bvc2FibGV9O3JldHVybiBhfSgpO3ZhciBmPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYSgpe3ZhciBiPXRoaXM7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyxKLGZ1bmN0aW9uKGEsZCl7dmFyIGU9eC5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7ZChiLGEpfSwwKTtyZXR1cm4gQShmdW5jdGlvbigpe3guY2xlYXJUaW1lb3V0KGUpfSl9LGZ1bmN0aW9uKGEsXG5kLGUpe3ZhciBnLGQ9cy5ub3JtYWxpemUoZCk7Zz14LnNldFRpbWVvdXQoZnVuY3Rpb24oKXtlKGIsYSl9LGQpO3JldHVybiBBKGZ1bmN0aW9uKCl7eC5jbGVhclRpbWVvdXQoZyl9KX0sZnVuY3Rpb24oYSxkLGUpe3JldHVybiBiLnNjaGVkdWxlV2l0aFJlbGF0aXZlQW5kU3RhdGUoYSxkLWIubm93KCksZSl9KX1vKGEscyk7cmV0dXJuIGF9KCksbWE9cy5UaW1lb3V0PW5ldyBmLHQ9bS5Ob3RpZmljYXRpb249ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7fWEucHJvdG90eXBlLmFjY2VwdD1mdW5jdGlvbihhLGMsZCl7cmV0dXJuIDE8YXJndW1lbnRzLmxlbmd0aHx8XCJmdW5jdGlvblwiPT09dHlwZW9mIGE/dGhpcy5fYWNjZXB0KGEsYyxkKTp0aGlzLl9hY2NlcHRPYnNlcnZhYmxlKGEpfTthLnByb3RvdHlwZS50b09ic2VydmFibGU9ZnVuY3Rpb24oYSl7dmFyIGM9dGhpcyxhPWF8fHMuSW1tZWRpYXRlO3JldHVybiBpKGZ1bmN0aW9uKGQpe3JldHVybiBhLnNjaGVkdWxlKGZ1bmN0aW9uKCl7Yy5fYWNjZXB0T2JzZXJ2YWJsZShkKTtcbmlmKFwiTlwiPT09Yy5raW5kKWQub25Db21wbGV0ZWQoKX0pfSl9O2EucHJvdG90eXBlLmhhc1ZhbHVlPSExO2EucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy50b1N0cmluZygpPT09KGE9PT1ufHxudWxsPT09YT9cIlwiOmEudG9TdHJpbmcoKSl9O3JldHVybiBhfSgpO3QuY3JlYXRlT25OZXh0PWZ1bmN0aW9uKGEpe3ZhciBiPW5ldyB0O2IudmFsdWU9YTtiLmhhc1ZhbHVlPSEwO2Iua2luZD1cIk5cIjtiLl9hY2NlcHQ9ZnVuY3Rpb24oYSl7cmV0dXJuIGEodGhpcy52YWx1ZSl9O2IuX2FjY2VwdE9ic2VydmFibGU9ZnVuY3Rpb24oYSl7cmV0dXJuIGEub25OZXh0KHRoaXMudmFsdWUpfTtiLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuXCJPbk5leHQoXCIrdGhpcy52YWx1ZStcIilcIn07cmV0dXJuIGJ9O3QuY3JlYXRlT25FcnJvcj1mdW5jdGlvbihhKXt2YXIgYj1uZXcgdDtiLmV4Y2VwdGlvbj1hO2Iua2luZD1cIkVcIjtiLl9hY2NlcHQ9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYih0aGlzLmV4Y2VwdGlvbil9O1xuYi5fYWNjZXB0T2JzZXJ2YWJsZT1mdW5jdGlvbihhKXtyZXR1cm4gYS5vbkVycm9yKHRoaXMuZXhjZXB0aW9uKX07Yi50b1N0cmluZz1mdW5jdGlvbigpe3JldHVyblwiT25FcnJvcihcIit0aGlzLmV4Y2VwdGlvbitcIilcIn07cmV0dXJuIGJ9O3QuY3JlYXRlT25Db21wbGV0ZWQ9ZnVuY3Rpb24oKXt2YXIgYT1uZXcgdDthLmtpbmQ9XCJDXCI7YS5fYWNjZXB0PWZ1bmN0aW9uKGEsYyxkKXtyZXR1cm4gZCgpfTthLl9hY2NlcHRPYnNlcnZhYmxlPWZ1bmN0aW9uKGEpe3JldHVybiBhLm9uQ29tcGxldGVkKCl9O2EudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm5cIk9uQ29tcGxldGVkKClcIn07cmV0dXJuIGF9O3ZhciBHPWZ1bmN0aW9uKCl7fSxmPUcucHJvdG90eXBlO2YuY29uY2F0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztyZXR1cm4gaShmdW5jdGlvbihiKXt2YXIgYyxkPWEuZ2V0RW51bWVyYXRvcigpLGU9ITEsZz1uZXcgQztjPUIuc2NoZWR1bGVSZWN1cnNpdmUoZnVuY3Rpb24oYSl7dmFyIGMsXG56LHE9ITE7aWYoIWUpe3RyeXtpZihxPWQubW92ZU5leHQoKSljPWQuY3VycmVudH1jYXRjaChrKXt6PWt9aWYodm9pZCAwIT09eiliLm9uRXJyb3Ioeik7ZWxzZSBpZihxKXo9bmV3IHYsZy5kaXNwb3NhYmxlKHopLHouZGlzcG9zYWJsZShjLnN1YnNjcmliZShmdW5jdGlvbihhKXtiLm9uTmV4dChhKX0sZnVuY3Rpb24oYSl7Yi5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2EoKX0pKTtlbHNlIGIub25Db21wbGV0ZWQoKX19KTtyZXR1cm4gbmV3IHAoZyxjLEEoZnVuY3Rpb24oKXtlPSEwfSkpfSl9O2YuY2F0Y2hFeGNlcHRpb249ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGIpe3ZhciBjLGQ9YS5nZXRFbnVtZXJhdG9yKCksZT0hMSxnLGg7Zz1uZXcgQztjPUIuc2NoZWR1bGVSZWN1cnNpdmUoZnVuY3Rpb24oYSl7dmFyIGMscSxrO2s9ITE7aWYoIWUpe3RyeXtpZihrPWQubW92ZU5leHQoKSljPWQuY3VycmVudH1jYXRjaChmKXtxPWZ9aWYodm9pZCAwIT09cSliLm9uRXJyb3IocSk7XG5lbHNlIGlmKGspcT1uZXcgdixnLmRpc3Bvc2FibGUocSkscS5kaXNwb3NhYmxlKGMuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe2Iub25OZXh0KGEpfSxmdW5jdGlvbihiKXtoPWI7YSgpfSxmdW5jdGlvbigpe2Iub25Db21wbGV0ZWQoKX0pKTtlbHNlIGlmKHZvaWQgMCE9PWgpYi5vbkVycm9yKGgpO2Vsc2UgYi5vbkNvbXBsZXRlZCgpfX0pO3JldHVybiBuZXcgcChnLGMsQShmdW5jdGlvbigpe2U9ITB9KSl9KX07dmFyICQ9Ry5yZXBlYXQ9ZnVuY3Rpb24oYSxiKXtiPT09biYmKGI9LTEpO3ZhciBjPW5ldyBHO2MuZ2V0RW51bWVyYXRvcj1mdW5jdGlvbigpe3JldHVybntsZWZ0OmIsY3VycmVudDpudWxsLG1vdmVOZXh0OmZ1bmN0aW9uKCl7aWYoMD09PXRoaXMubGVmdClyZXR1cm4gdGhpcy5jdXJyZW50PW51bGwsITE7MDx0aGlzLmxlZnQmJnRoaXMubGVmdC0tO3RoaXMuY3VycmVudD1hO3JldHVybiEwfX19O3JldHVybiBjfSxTPUcuZm9yRW51bWVyYXRvcj1mdW5jdGlvbihhKXt2YXIgYj1cbm5ldyBHO2IuZ2V0RW51bWVyYXRvcj1mdW5jdGlvbigpe3JldHVybntfaW5kZXg6LTEsY3VycmVudDpudWxsLG1vdmVOZXh0OmZ1bmN0aW9uKCl7aWYoKyt0aGlzLl9pbmRleDxhLmxlbmd0aClyZXR1cm4gdGhpcy5jdXJyZW50PWFbdGhpcy5faW5kZXhdLCEwO3RoaXMuX2luZGV4PS0xO3RoaXMuY3VycmVudD1udWxsO3JldHVybiExfX19O3JldHVybiBifSxyPW0uT2JzZXJ2ZXI9ZnVuY3Rpb24oKXt9LFQ9bS5JbnRlcm5hbHMuQWJzdHJhY3RPYnNlcnZlcj1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoKXt0aGlzLmlzU3RvcHBlZD0hMX1vKGEscik7YS5wcm90b3R5cGUub25OZXh0PWZ1bmN0aW9uKGEpe3RoaXMuaXNTdG9wcGVkfHx0aGlzLm5leHQoYSl9O2EucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oYSl7aWYoIXRoaXMuaXNTdG9wcGVkKXRoaXMuaXNTdG9wcGVkPSEwLHRoaXMuZXJyb3IoYSl9O2EucHJvdG90eXBlLm9uQ29tcGxldGVkPWZ1bmN0aW9uKCl7aWYoIXRoaXMuaXNTdG9wcGVkKXRoaXMuaXNTdG9wcGVkPVxuITAsdGhpcy5jb21wbGV0ZWQoKX07YS5wcm90b3R5cGUuZGlzcG9zZT1mdW5jdGlvbigpe3RoaXMuaXNTdG9wcGVkPSEwfTtyZXR1cm4gYX0oKSxOPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShiLGMsZCl7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyk7dGhpcy5fb25OZXh0PWI7dGhpcy5fb25FcnJvcj1jO3RoaXMuX29uQ29tcGxldGVkPWR9byhhLFQpO2EucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oYSl7dGhpcy5fb25OZXh0KGEpfTthLnByb3RvdHlwZS5lcnJvcj1mdW5jdGlvbihhKXt0aGlzLl9vbkVycm9yKGEpfTthLnByb3RvdHlwZS5jb21wbGV0ZWQ9ZnVuY3Rpb24oKXt0aGlzLl9vbkNvbXBsZXRlZCgpfTtyZXR1cm4gYX0oKSxIPW0uSW50ZXJuYWxzLkJpbmFyeU9ic2VydmVyPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShhLGMpe1wiZnVuY3Rpb25cIj09PXR5cGVvZiBhJiZcImZ1bmN0aW9uXCI9PT10eXBlb2YgYz8odGhpcy5sZWZ0T2JzZXJ2ZXI9YWEoYSksdGhpcy5yaWdodE9ic2VydmVyPVxuYWEoYykpOih0aGlzLmxlZnRPYnNlcnZlcj1hLHRoaXMucmlnaHRPYnNlcnZlcj1jKX1vKGEscik7YS5wcm90b3R5cGUub25OZXh0PWZ1bmN0aW9uKGEpe3ZhciBjPXRoaXM7cmV0dXJuIGEuc3dpdGNoVmFsdWUoZnVuY3Rpb24oYSl7cmV0dXJuIGEuYWNjZXB0KGMubGVmdE9ic2VydmVyKX0sZnVuY3Rpb24oYSl7cmV0dXJuIGEuYWNjZXB0KGMucmlnaHRPYnNlcnZlcil9KX07YS5wcm90b3R5cGUub25FcnJvcj1mdW5jdGlvbigpe307YS5wcm90b3R5cGUub25Db21wbGV0ZWQ9ZnVuY3Rpb24oKXt9O3JldHVybiBhfSgpLG5hPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShhLGMpe3RoaXMuc2NoZWR1bGVyPWE7dGhpcy5vYnNlcnZlcj1jO3RoaXMuaGFzRmF1bHRlZD10aGlzLmlzQWNxdWlyZWQ9ITE7dGhpcy5xdWV1ZT1bXTt0aGlzLmRpc3Bvc2FibGU9bmV3IEN9byhhLFQpO2EucHJvdG90eXBlLmVuc3VyZUFjdGl2ZT1mdW5jdGlvbigpe3ZhciBhPSExLGM9dGhpcztpZighdGhpcy5oYXNGYXVsdGVkJiZcbjA8dGhpcy5xdWV1ZS5sZW5ndGgpYT0hdGhpcy5pc0FjcXVpcmVkLHRoaXMuaXNBY3F1aXJlZD0hMDthJiZ0aGlzLmRpc3Bvc2FibGUuZGlzcG9zYWJsZSh0aGlzLnNjaGVkdWxlci5zY2hlZHVsZVJlY3Vyc2l2ZShmdW5jdGlvbihhKXt2YXIgYjtpZigwPGMucXVldWUubGVuZ3RoKXtiPWMucXVldWUuc2hpZnQoKTt0cnl7YigpfWNhdGNoKGcpe3Rocm93IGMucXVldWU9W10sYy5oYXNGYXVsdGVkPSEwLGc7fWEoKX1lbHNlIGMuaXNBY3F1aXJlZD0hMX0pKX07YS5wcm90b3R5cGUubmV4dD1mdW5jdGlvbihhKXt2YXIgYz10aGlzO3RoaXMucXVldWUucHVzaChmdW5jdGlvbigpe2Mub2JzZXJ2ZXIub25OZXh0KGEpfSl9O2EucHJvdG90eXBlLmVycm9yPWZ1bmN0aW9uKGEpe3ZhciBjPXRoaXM7dGhpcy5xdWV1ZS5wdXNoKGZ1bmN0aW9uKCl7Yy5vYnNlcnZlci5vbkVycm9yKGEpfSl9O2EucHJvdG90eXBlLmNvbXBsZXRlZD1mdW5jdGlvbigpe3ZhciBhPXRoaXM7dGhpcy5xdWV1ZS5wdXNoKGZ1bmN0aW9uKCl7YS5vYnNlcnZlci5vbkNvbXBsZXRlZCgpfSl9O1xuYS5wcm90b3R5cGUuZGlzcG9zZT1mdW5jdGlvbigpe2EuYmFzZS5kaXNwb3NlLmNhbGwodGhpcyk7dGhpcy5kaXNwb3NhYmxlLmRpc3Bvc2UoKX07cmV0dXJuIGF9KCksST1yLmNyZWF0ZT1mdW5jdGlvbihhLGIsYyl7Ynx8KGI9ZnVuY3Rpb24oYSl7dGhyb3cgYTt9KTtjfHwoYz1mdW5jdGlvbigpe30pO3JldHVybiBuZXcgTihhLGIsYyl9O3IuZnJvbU5vdGlmaWVyPWZ1bmN0aW9uKGEpe3JldHVybiBuZXcgTihmdW5jdGlvbihiKXtyZXR1cm4gYSh0LmNyZWF0ZU9uTmV4dChiKSl9LGZ1bmN0aW9uKGIpe3JldHVybiBhKHQuY3JlYXRlT25FcnJvcihiKSl9LGZ1bmN0aW9uKCl7cmV0dXJuIGEodC5jcmVhdGVPbkNvbXBsZXRlZCgpKX0pfTt2YXIgYWE9ZnVuY3Rpb24oYSl7cmV0dXJuIG5ldyBOKGZ1bmN0aW9uKGIpe2EodC5jcmVhdGVPbk5leHQoYikpfSxmdW5jdGlvbihiKXthKHQuY3JlYXRlT25FcnJvcihiKSl9LGZ1bmN0aW9uKCl7YSh0LmNyZWF0ZU9uQ29tcGxldGVkKCkpfSl9O1xuci5wcm90b3R5cGUudG9Ob3RpZmllcj1mdW5jdGlvbigpe3ZhciBhPXRoaXM7cmV0dXJuIGZ1bmN0aW9uKGIpe3JldHVybiBiLmFjY2VwdChhKX19O3IucHJvdG90eXBlLmFzT2JzZXJ2ZXI9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBuZXcgTihmdW5jdGlvbihiKXtyZXR1cm4gYS5vbk5leHQoYil9LGZ1bmN0aW9uKGIpe3JldHVybiBhLm9uRXJyb3IoYil9LGZ1bmN0aW9uKCl7cmV0dXJuIGEub25Db21wbGV0ZWQoKX0pfTt2YXIgaj1tLk9ic2VydmFibGU9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7fWEucHJvdG90eXBlLnN1YnNjcmliZT1mdW5jdGlvbihhLGMsZCl7cmV0dXJuIHRoaXMuX3N1YnNjcmliZSgwPT09YXJndW1lbnRzLmxlbmd0aHx8MTxhcmd1bWVudHMubGVuZ3RofHxcImZ1bmN0aW9uXCI9PT10eXBlb2YgYT9JKGEsYyxkKTphKX07cmV0dXJuIGF9KCksZj1qLnByb3RvdHlwZSxwYT1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYil7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyk7XG50aGlzLl9zdWJzY3JpYmU9ZnVuY3Rpb24oYSl7dmFyIGQ9bmV3IG9hKGEpO0Quc2NoZWR1bGVSZXF1aXJlZCgpP0Quc2NoZWR1bGUoZnVuY3Rpb24oKXtkLmRpc3Bvc2FibGUoYihkKSl9KTpkLmRpc3Bvc2FibGUoYihkKSk7cmV0dXJuIGR9fW8oYSxqKTthLnByb3RvdHlwZS5fc3Vic2NyaWJlPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLl9zdWJzY3JpYmUoYSl9O3JldHVybiBhfSgpLG9hPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShiKXthLmJhc2UuY29uc3RydWN0b3IuY2FsbCh0aGlzKTt0aGlzLm9ic2VydmVyPWI7dGhpcy5tPW5ldyB2fW8oYSxUKTthLnByb3RvdHlwZS5kaXNwb3NhYmxlPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLm0uZGlzcG9zYWJsZShhKX07YS5wcm90b3R5cGUubmV4dD1mdW5jdGlvbihhKXt0aGlzLm9ic2VydmVyLm9uTmV4dChhKX07YS5wcm90b3R5cGUuZXJyb3I9ZnVuY3Rpb24oYSl7dGhpcy5vYnNlcnZlci5vbkVycm9yKGEpO3RoaXMubS5kaXNwb3NlKCl9O1xuYS5wcm90b3R5cGUuY29tcGxldGVkPWZ1bmN0aW9uKCl7dGhpcy5vYnNlcnZlci5vbkNvbXBsZXRlZCgpO3RoaXMubS5kaXNwb3NlKCl9O2EucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXthLmJhc2UuZGlzcG9zZS5jYWxsKHRoaXMpO3RoaXMubS5kaXNwb3NlKCl9O3JldHVybiBhfSgpLGJhPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShiLGMsZCl7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyk7dGhpcy5rZXk9Yjt0aGlzLnVuZGVybHlpbmdPYnNlcnZhYmxlPSFkP2M6aShmdW5jdGlvbihhKXtyZXR1cm4gbmV3IHAoZC5nZXREaXNwb3NhYmxlKCksYy5zdWJzY3JpYmUoYSkpfSl9byhhLGopO2EucHJvdG90eXBlLl9zdWJzY3JpYmU9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMudW5kZXJseWluZ09ic2VydmFibGUuc3Vic2NyaWJlKGEpfTtyZXR1cm4gYX0oKSxxYT1tLkNvbm5lY3RhYmxlT2JzZXJ2YWJsZT1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSxjKXt2YXIgZD1hLmFzT2JzZXJ2YWJsZSgpLFxuZT0hMSxnPW51bGw7dGhpcy5jb25uZWN0PWZ1bmN0aW9uKCl7ZXx8KGU9ITAsZz1uZXcgcChkLnN1YnNjcmliZShjKSxBKGZ1bmN0aW9uKCl7ZT0hMX0pKSk7cmV0dXJuIGd9O3RoaXMuX3N1YnNjcmliZT1mdW5jdGlvbihhKXtyZXR1cm4gYy5zdWJzY3JpYmUoYSl9fW8oYSxqKTthLnByb3RvdHlwZS5jb25uZWN0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY29ubmVjdCgpfTthLnByb3RvdHlwZS5yZWZDb3VudD1mdW5jdGlvbigpe3ZhciBhPW51bGwsYz0wLGQ9dGhpcztyZXR1cm4gaShmdW5jdGlvbihlKXt2YXIgZyxoO2MrKztnPTE9PT1jO2g9ZC5zdWJzY3JpYmUoZSk7ZyYmKGE9ZC5jb25uZWN0KCkpO3JldHVybiBBKGZ1bmN0aW9uKCl7aC5kaXNwb3NlKCk7Yy0tOzA9PT1jJiZhLmRpc3Bvc2UoKX0pfSl9O2EucHJvdG90eXBlLl9zdWJzY3JpYmU9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX3N1YnNjcmliZShhKX07cmV0dXJuIGF9KCksTz1tLlN1YmplY3Q9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyk7XG52YXIgYj0hMSxjPSExLGQ9bmV3IHUsZT1uLGc9ZnVuY3Rpb24oKXtpZihiKXRocm93IEVycm9yKEspO307dGhpcy5vbkNvbXBsZXRlZD1mdW5jdGlvbigpe3ZhciBhLGI7ZygpO2N8fChhPWQudG9BcnJheSgpLGQ9bmV3IHUsYz0hMCk7aWYoYSE9PW4pZm9yKGI9MDtiPGEubGVuZ3RoO2IrKylhW2JdLm9uQ29tcGxldGVkKCl9O3RoaXMub25FcnJvcj1mdW5jdGlvbihhKXt2YXIgYix6O2coKTtjfHwoYj1kLnRvQXJyYXkoKSxkPW5ldyB1LGM9ITAsZT1hKTtpZihiIT09bilmb3Ioej0wO3o8Yi5sZW5ndGg7eisrKWJbel0ub25FcnJvcihhKX07dGhpcy5vbk5leHQ9ZnVuY3Rpb24oYSl7dmFyIGIsZTtnKCk7Y3x8KGI9ZC50b0FycmF5KCkpO2lmKHZvaWQgMCE9PWIpZm9yKGU9MDtlPGIubGVuZ3RoO2UrKyliW2VdLm9uTmV4dChhKX07dGhpcy5fc3Vic2NyaWJlPWZ1bmN0aW9uKGEpe2coKTtpZighYylyZXR1cm4gZC5hZGQoYSksZnVuY3Rpb24oYSl7cmV0dXJue29ic2VydmVyOmEsZGlzcG9zZTpmdW5jdGlvbigpe2lmKG51bGwhPT1cbnRoaXMub2JzZXJ2ZXImJiFiKWQucmVtb3ZlKHRoaXMub2JzZXJ2ZXIpLHRoaXMub2JzZXJ2ZXI9bnVsbH19fShhKTtpZihlIT09bilyZXR1cm4gYS5vbkVycm9yKGUpLHc7YS5vbkNvbXBsZXRlZCgpO3JldHVybiB3fTt0aGlzLmRpc3Bvc2U9ZnVuY3Rpb24oKXtiPSEwO2Q9bnVsbH19byhhLGopO0UoYSxyKTthLnByb3RvdHlwZS5vbkNvbXBsZXRlZD1mdW5jdGlvbigpe3RoaXMub25Db21wbGV0ZWQoKX07YS5wcm90b3R5cGUub25FcnJvcj1mdW5jdGlvbihhKXt0aGlzLm9uRXJyb3IoYSl9O2EucHJvdG90eXBlLm9uTmV4dD1mdW5jdGlvbihhKXt0aGlzLm9uTmV4dChhKX07YS5wcm90b3R5cGUuX3N1YnNjcmliZT1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5fc3Vic2NyaWJlKGEpfTthLnByb3RvdHlwZS5kaXNwb3NlPWZ1bmN0aW9uKCl7dGhpcy5kaXNwb3NlKCl9O2EuY3JlYXRlPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIG5ldyByYShhLGMpfTtyZXR1cm4gYX0oKSxVPW0uQXN5bmNTdWJqZWN0PVxuZnVuY3Rpb24oKXtmdW5jdGlvbiBhKCl7YS5iYXNlLmNvbnN0cnVjdG9yLmNhbGwodGhpcyk7dmFyIGI9ITEsYz0hMSxkPW51bGwsZT0hMSxnPW5ldyB1LGg9bnVsbCxsPWZ1bmN0aW9uKCl7aWYoYil0aHJvdyBFcnJvcihLKTt9O3RoaXMub25Db21wbGV0ZWQ9ZnVuY3Rpb24oKXt2YXIgYT0hMSxiLGgsZjtsKCk7Y3x8KGI9Zy50b0FycmF5KCksZz1uZXcgdSxjPSEwLGg9ZCxhPWUpO2lmKGIhPT1uKWlmKGEpZm9yKGY9MDtmPGIubGVuZ3RoO2YrKylhPWJbZl0sYS5vbk5leHQoaCksYS5vbkNvbXBsZXRlZCgpO2Vsc2UgZm9yKGY9MDtmPGIubGVuZ3RoO2YrKyliW2ZdLm9uQ29tcGxldGVkKCl9O3RoaXMub25FcnJvcj1mdW5jdGlvbihhKXt2YXIgYixkO2woKTtjfHwoYj1nLnRvQXJyYXkoKSxnPW5ldyB1LGM9ITAsaD1hKTtpZihiIT09bilmb3IoZD0wO2Q8Yi5sZW5ndGg7ZCsrKWJbZF0ub25FcnJvcihhKX07dGhpcy5vbk5leHQ9ZnVuY3Rpb24oYSl7bCgpO2N8fChkPWEsZT0hMCl9O1xudGhpcy5fc3Vic2NyaWJlPWZ1bmN0aW9uKGEpe3ZhciBxLGssZjtsKCk7aWYoIWMpcmV0dXJuIGcuYWRkKGEpLGZ1bmN0aW9uKGEpe3JldHVybntvYnNlcnZlcjphLGRpc3Bvc2U6ZnVuY3Rpb24oKXtpZihudWxsIT09dGhpcy5vYnNlcnZlciYmIWIpZy5yZW1vdmUodGhpcy5vYnNlcnZlciksdGhpcy5vYnNlcnZlcj1udWxsfX19KGEpO3E9aDtrPWU7Zj1kO2lmKG51bGwhPT1xKWEub25FcnJvcihxKTtlbHNle2lmKGspYS5vbk5leHQoZik7YS5vbkNvbXBsZXRlZCgpfXJldHVybiB3fTt0aGlzLmRpc3Bvc2U9ZnVuY3Rpb24oKXtiPSEwO2Q9aD1nPW51bGx9fW8oYSxqKTtFKGEscik7YS5wcm90b3R5cGUub25Db21wbGV0ZWQ9ZnVuY3Rpb24oKXt0aGlzLm9uQ29tcGxldGVkKCl9O2EucHJvdG90eXBlLm9uRXJyb3I9ZnVuY3Rpb24oYSl7dGhpcy5vbkVycm9yKGEpfTthLnByb3RvdHlwZS5vbk5leHQ9ZnVuY3Rpb24oYSl7dGhpcy5vbk5leHQoYSl9O2EucHJvdG90eXBlLl9zdWJzY3JpYmU9XG5mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5fc3Vic2NyaWJlKGEpfTthLnByb3RvdHlwZS5kaXNwb3NlPWZ1bmN0aW9uKCl7dGhpcy5kaXNwb3NlKCl9O3JldHVybiBhfSgpLFA9bS5CZWhhdmlvclN1YmplY3Q9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGIpe2EuYmFzZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMpO3ZhciBjPWIsZD1uZXcgdSxlPSExLGc9ITEsaD1udWxsLGw9ZnVuY3Rpb24oKXtpZihlKXRocm93IEVycm9yKEspO307dGhpcy5vbkNvbXBsZXRlZD1mdW5jdGlvbigpe3ZhciBhLGI7YT1udWxsO2woKTtnfHwoYT1kLnRvQXJyYXkoKSxkPW5ldyB1LGc9ITApO2lmKG51bGwhPT1hKWZvcihiPTA7YjxhLmxlbmd0aDtiKyspYVtiXS5vbkNvbXBsZXRlZCgpfTt0aGlzLm9uRXJyb3I9ZnVuY3Rpb24oYSl7dmFyIGIsYztjPW51bGw7bCgpO2d8fChjPWQudG9BcnJheSgpLGQ9bmV3IHUsZz0hMCxoPWEpO2lmKG51bGwhPT1jKWZvcihiPTA7YjxjLmxlbmd0aDtiKyspY1tiXS5vbkVycm9yKGEpfTtcbnRoaXMub25OZXh0PWZ1bmN0aW9uKGEpe3ZhciBiLGU7Yj1udWxsO2woKTtnfHwoYz1hLGI9ZC50b0FycmF5KCkpO2lmKG51bGwhPT1iKWZvcihlPTA7ZTxiLmxlbmd0aDtlKyspYltlXS5vbk5leHQoYSl9O3RoaXMuX3N1YnNjcmliZT1mdW5jdGlvbihhKXt2YXIgYjtsKCk7aWYoIWcpcmV0dXJuIGQuYWRkKGEpLGEub25OZXh0KGMpLGZ1bmN0aW9uKGEpe3JldHVybntvYnNlcnZlcjphLGRpc3Bvc2U6ZnVuY3Rpb24oKXtpZihudWxsIT09dGhpcy5vYnNlcnZlciYmIWUpZC5yZW1vdmUodGhpcy5vYnNlcnZlciksdGhpcy5vYnNlcnZlcj1udWxsfX19KGEpO2I9aDtpZihudWxsIT09YilhLm9uRXJyb3IoYik7ZWxzZSBhLm9uQ29tcGxldGVkKCk7cmV0dXJuIHd9O3RoaXMuZGlzcG9zZT1mdW5jdGlvbigpe2U9ITA7aD1jPWQ9bnVsbH19byhhLGopO0UoYSxyKTthLnByb3RvdHlwZS5vbkNvbXBsZXRlZD1mdW5jdGlvbigpe3RoaXMub25Db21wbGV0ZWQoKX07YS5wcm90b3R5cGUub25FcnJvcj1cbmZ1bmN0aW9uKGEpe3RoaXMub25FcnJvcihhKX07YS5wcm90b3R5cGUub25OZXh0PWZ1bmN0aW9uKGEpe3RoaXMub25OZXh0KGEpfTthLnByb3RvdHlwZS5fc3Vic2NyaWJlPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLl9zdWJzY3JpYmUoYSl9O2EucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXt0aGlzLmRpc3Bvc2UoKX07cmV0dXJuIGF9KCk7UC5wcm90b3R5cGUudG9Ob3RpZmllcj1yLnByb3RvdHlwZS50b05vdGlmaWVyO1AucHJvdG90eXBlLmFzT2JzZXJ2ZXI9ci5wcm90b3R5cGUuQXNPYnNlcnZlcjt2YXIgY2E9bS5SZXBsYXlTdWJqZWN0PWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYShhLGMsZCl7dmFyIGU9YT09PW4/TnVtYmVyLk1BWF9WQUxVRTphLGc9Yz09PW4/TnVtYmVyLk1BWF9WQUxVRTpjLGg9ZHx8cy5jdXJyZW50VGhyZWFkLGw9W10sZj1uZXcgdSxxPSExLGs9ITEsaT1mdW5jdGlvbihhKXt2YXIgYj1xPzE6MCxjPWIrZTtmb3IoYzxlJiYoYz1lKTtsLmxlbmd0aD5jOylsLnNoaWZ0KCk7XG5mb3IoO2wubGVuZ3RoPmImJmEtbFswXS50aW1lc3RhbXA+ZzspbC5zaGlmdCgpfSxqPWZ1bmN0aW9uKGEpe3ZhciBiPWgubm93KCk7bC5wdXNoKHt2YWx1ZTphLHRpbWVzdGFtcDpifSk7aShiKX0sbT1mdW5jdGlvbigpe2lmKGspdGhyb3cgRXJyb3IoSyk7fTt0aGlzLm9uTmV4dD1mdW5jdGlvbihhKXt2YXIgYj1udWxsLGMsZDttKCk7aWYoIXEpe2I9Zi50b0FycmF5KCk7aih0LmNyZWF0ZU9uTmV4dChhKSk7Zm9yKGQ9MDtkPGIubGVuZ3RoO2QrKyljPWJbZF0sYy5vbk5leHQoYSl9aWYobnVsbCE9PWIpZm9yKGQ9MDtkPGIubGVuZ3RoO2QrKyljPWJbZF0sYy5lbnN1cmVBY3RpdmUoKX07dGhpcy5vbkVycm9yPWZ1bmN0aW9uKGEpe3ZhciBiPW51bGwsYzttKCk7aWYoIXEpe3E9ITA7aih0LmNyZWF0ZU9uRXJyb3IoYSkpO2I9Zi50b0FycmF5KCk7Zm9yKGM9MDtjPGIubGVuZ3RoO2MrKyliW2NdLm9uRXJyb3IoYSk7Zj1uZXcgdX1pZihudWxsIT09Yilmb3IoYz0wO2M8Yi5sZW5ndGg7YysrKWJbY10uZW5zdXJlQWN0aXZlKCl9O1xudGhpcy5vbkNvbXBsZXRlZD1mdW5jdGlvbigpe3ZhciBhPW51bGwsYjttKCk7aWYoIXEpe3E9ITA7aih0LmNyZWF0ZU9uQ29tcGxldGVkKCkpO2E9Zi50b0FycmF5KCk7Zm9yKGI9MDtiPGEubGVuZ3RoO2IrKylhW2JdLm9uQ29tcGxldGVkKCk7Zj1uZXcgdX1pZihudWxsIT09YSlmb3IoYj0wO2I8YS5sZW5ndGg7YisrKWFbYl0uZW5zdXJlQWN0aXZlKCl9O3RoaXMuX3N1YnNjcmliZT1mdW5jdGlvbihhKXt2YXIgYT1uZXcgbmEoaCxhKSxiPWZ1bmN0aW9uKGEpe3JldHVybntvYnNlcnZlcjphLGRpc3Bvc2U6ZnVuY3Rpb24oKXt0aGlzLm9ic2VydmVyLmRpc3Bvc2UoKTtudWxsIT09dGhpcy5vYnNlcnZlciYmIWsmJmYucmVtb3ZlKHRoaXMub2JzZXJ2ZXIpfX19KGEpLGM7bSgpO2koaC5ub3coKSk7Zi5hZGQoYSk7Zm9yKGM9MDtjPGwubGVuZ3RoO2MrKylsW2NdLnZhbHVlLmFjY2VwdChhKTthLmVuc3VyZUFjdGl2ZSgpO3JldHVybiBifTt0aGlzLmRpc3Bvc2U9ZnVuY3Rpb24oKXtrPVxuITA7Zj1udWxsfX1vKGEsaik7RShhLGopO2EucHJvdG90eXBlLm9uTmV4dD1mdW5jdGlvbihhKXt0aGlzLm9uTmV4dChhKX07YS5wcm90b3R5cGUub25FcnJvcj1mdW5jdGlvbihhKXt0aGlzLm9uRXJyb3IoYSl9O2EucHJvdG90eXBlLm9uQ29tcGxldGVkPWZ1bmN0aW9uKCl7dGhpcy5vbkNvbXBsZXRlZCgpfTthLnByb3RvdHlwZS5fc3Vic2NyaWJlPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLl9zdWJzY3JpYmUoYSl9O2EucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXt0aGlzLmRpc3Bvc2UoKX07cmV0dXJuIGF9KCkscmE9ZnVuY3Rpb24oKXtmdW5jdGlvbiBhKGEsYyl7dGhpcy5vYnNlcnZlcj1hO3RoaXMub2JzZXJ2YWJsZT1jfW8oYSxqKTtFKGEscik7YS5wcm90b3R5cGUub25Db21wbGV0ZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5vYnNlcnZlci5vbkNvbXBsZXRlZCgpfTthLnByb3RvdHlwZS5vbkVycm9yPWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLm9ic2VydmVyLm9uRXJyb3IoYSl9O1xuYS5wcm90b3R5cGUub25OZXh0PWZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLm9ic2VydmVyLm9uTmV4dChhKX07YS5wcm90b3R5cGUuX1N1YnNjcmliZT1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5vYnNlcnZhYmxlLlN1YnNjcmliZShhKX07cmV0dXJuIGF9KCk7ai5zdGFydD1mdW5jdGlvbihhLGIsYyxkKXtjfHwoYz1bXSk7cmV0dXJuIHNhKGEsZCkuYXBwbHkoYixjKX07dmFyIHNhPWoudG9Bc3luYz1mdW5jdGlvbihhLGIpe2J8fChiPW1hKTtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgYz1uZXcgVSxkPWZ1bmN0aW9uKCl7dmFyIGI7dHJ5e2I9YS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9Y2F0Y2goZCl7Yy5vbkVycm9yKGQpO3JldHVybn1jLm9uTmV4dChiKTtjLm9uQ29tcGxldGVkKCl9LGU9eS5jYWxsKGFyZ3VtZW50cyksZz10aGlzO2Iuc2NoZWR1bGUoZnVuY3Rpb24oKXtkLmFwcGx5KGcsZSl9KTtyZXR1cm4gY319O2YubXVsdGljYXN0PWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcztyZXR1cm5cImZ1bmN0aW9uXCI9PT1cbnR5cGVvZiBhP2koZnVuY3Rpb24oZCl7dmFyIGU9Yy5tdWx0aWNhc3QoYSgpKTtyZXR1cm4gbmV3IHAoYihlKS5zdWJzY3JpYmUoZCksZS5jb25uZWN0KCkpfSk6bmV3IHFhKGMsYSl9O2YucHVibGlzaD1mdW5jdGlvbihhKXtyZXR1cm4hYT90aGlzLm11bHRpY2FzdChuZXcgTyk6dGhpcy5tdWx0aWNhc3QoZnVuY3Rpb24oKXtyZXR1cm4gbmV3IE99LGEpfTtmLnB1Ymxpc2hMYXN0PWZ1bmN0aW9uKGEpe3JldHVybiFhP3RoaXMubXVsdGljYXN0KG5ldyBVKTp0aGlzLm11bHRpY2FzdChmdW5jdGlvbigpe3JldHVybiBuZXcgVX0sYSl9O2YucmVwbGF5PWZ1bmN0aW9uKGEsYixjLGQpe3JldHVybiFhfHxudWxsPT09YT90aGlzLm11bHRpY2FzdChuZXcgY2EoYixjLGQpKTp0aGlzLm11bHRpY2FzdChmdW5jdGlvbigpe3JldHVybiBuZXcgY2EoYixjLGQpfSxhKX07Zi5wdWJsaXNoVmFsdWU9ZnVuY3Rpb24oYSxiKXtyZXR1cm5cImZ1bmN0aW9uXCI9PT10eXBlb2YgYT90aGlzLm11bHRpY2FzdChmdW5jdGlvbigpe3JldHVybiBuZXcgUChiKX0sXG5hKTp0aGlzLm11bHRpY2FzdChuZXcgUChhKSl9O3ZhciBkYT1qLm5ldmVyPWZ1bmN0aW9uKCl7cmV0dXJuIGkoZnVuY3Rpb24oKXtyZXR1cm4gd30pfSx0YT1qLmVtcHR5PWZ1bmN0aW9uKGEpe2F8fChhPUIpO3JldHVybiBpKGZ1bmN0aW9uKGIpe3JldHVybiBhLnNjaGVkdWxlKGZ1bmN0aW9uKCl7cmV0dXJuIGIub25Db21wbGV0ZWQoKX0pfSl9LHVhPWoucmV0dXJuVmFsdWU9ZnVuY3Rpb24oYSxiKXtifHwoYj1CKTtyZXR1cm4gaShmdW5jdGlvbihjKXtyZXR1cm4gYi5zY2hlZHVsZShmdW5jdGlvbigpe2Mub25OZXh0KGEpO3JldHVybiBjLm9uQ29tcGxldGVkKCl9KX0pfSxlYT1qLnRocm93RXhjZXB0aW9uPWZ1bmN0aW9uKGEsYil7Ynx8KGI9Qik7cmV0dXJuIGkoZnVuY3Rpb24oYyl7cmV0dXJuIGIuc2NoZWR1bGUoZnVuY3Rpb24oKXtyZXR1cm4gYy5vbkVycm9yKGEpfSl9KX0sdmE9ai5nZW5lcmF0ZT1mdW5jdGlvbihhLGIsYyxkLGUpe2V8fChlPUQpO3JldHVybiBpKGZ1bmN0aW9uKGcpe3ZhciBoPVxuITAsZj1hO3JldHVybiBlLnNjaGVkdWxlUmVjdXJzaXZlKGZ1bmN0aW9uKGEpe3ZhciBlLGs7dHJ5e2g/aD0hMTpmPWMoZiksKGU9YihmKSkmJihrPWQoZikpfWNhdGNoKGkpe2cub25FcnJvcihpKTtyZXR1cm59aWYoZSlnLm9uTmV4dChrKSxhKCk7ZWxzZSBnLm9uQ29tcGxldGVkKCl9KX0pfSxmYT1qLmRlZmVyPWZ1bmN0aW9uKGEpe3JldHVybiBpKGZ1bmN0aW9uKGIpe3ZhciBjO3RyeXtjPWEoKX1jYXRjaChkKXtyZXR1cm4gZWEoZCkuc3Vic2NyaWJlKGIpfXJldHVybiBjLnN1YnNjcmliZShiKX0pfTtqLnVzaW5nPWZ1bmN0aW9uKGEsYil7cmV0dXJuIGkoZnVuY3Rpb24oYyl7dmFyIGQ9dyxlLGc7dHJ5e2U9YSgpLG51bGwhPT1lJiYoZD1lKSxnPWIoZSl9Y2F0Y2goaCl7cmV0dXJuIG5ldyBwKGVhKGgpLnN1YnNjcmliZShjKSxkKX1yZXR1cm4gbmV3IHAoZy5zdWJzY3JpYmUoYyksZCl9KX07dmFyIGdhPWouZnJvbUFycmF5PWZ1bmN0aW9uKGEsYil7Ynx8KGI9RCk7cmV0dXJuIGkoZnVuY3Rpb24oYyl7dmFyIGQ9XG4wO3JldHVybiBiLnNjaGVkdWxlUmVjdXJzaXZlKGZ1bmN0aW9uKGIpe2lmKGQ8YS5sZW5ndGgpYy5vbk5leHQoYVtkKytdKSxiKCk7ZWxzZSBjLm9uQ29tcGxldGVkKCl9KX0pfSxpPWouY3JlYXRlV2l0aERpc3Bvc2FibGU9ZnVuY3Rpb24oYSl7cmV0dXJuIG5ldyBwYShhKX07ai5jcmVhdGU9ZnVuY3Rpb24oYSl7cmV0dXJuIGkoZnVuY3Rpb24oYil7cmV0dXJuIEEoYShiKSl9KX07ai5yYW5nZT1mdW5jdGlvbihhLGIsYyl7Y3x8KGM9RCk7dmFyIGQ9YStiLTE7cmV0dXJuIHZhKGEsZnVuY3Rpb24oYSl7cmV0dXJuIGE8PWR9LGZ1bmN0aW9uKGEpe3JldHVybiBhKzF9LGZ1bmN0aW9uKGEpe3JldHVybiBhfSxjKX07Zi5yZXBlYXQ9ZnVuY3Rpb24oYSl7cmV0dXJuICQodGhpcyxhKS5jb25jYXQoKX07Zi5yZXRyeT1mdW5jdGlvbihhKXtyZXR1cm4gJCh0aGlzLGEpLmNhdGNoRXhjZXB0aW9uKCl9O2oucmVwZWF0PWZ1bmN0aW9uKGEsYixjKXtjfHwoYz1EKTtiPT09biYmKGI9LTEpO3JldHVybiB1YShhLFxuYykucmVwZWF0KGIpfTtmLnNlbGVjdD1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPTA7cmV0dXJuIGIuc3Vic2NyaWJlKGZ1bmN0aW9uKGIpe3ZhciBnO3RyeXtnPWEoYixkKyspfWNhdGNoKGgpe2Mub25FcnJvcihoKTtyZXR1cm59Yy5vbk5leHQoZyl9LGZ1bmN0aW9uKGEpe2Mub25FcnJvcihhKX0sZnVuY3Rpb24oKXtjLm9uQ29tcGxldGVkKCl9KX0pfTtmLndoZXJlPWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7cmV0dXJuIGkoZnVuY3Rpb24oYyl7dmFyIGQ9MDtyZXR1cm4gYi5zdWJzY3JpYmUoZnVuY3Rpb24oYil7dmFyIGc7dHJ5e2c9YShiLGQrKyl9Y2F0Y2goaCl7Yy5vbkVycm9yKGgpO3JldHVybn1pZihnKWMub25OZXh0KGIpfSxmdW5jdGlvbihhKXtjLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Yy5vbkNvbXBsZXRlZCgpfSl9KX07Zi5ncm91cEJ5VW50aWw9ZnVuY3Rpb24oYSxiLGMsZCl7dmFyIGU9dGhpcztifHwoYj1RKTtkfHwoZD1cblcpO3JldHVybiBpKGZ1bmN0aW9uKGcpe3ZhciBoPXt9LGY9bmV3IHAsaT1uZXcgWihmKTtmLmFkZChlLnN1YnNjcmliZShmdW5jdGlvbihlKXt2YXIgayxqLG0sdCxvLHAsdSxzLHI7dHJ5e2o9YShlKSxwPWQoail9Y2F0Y2godyl7Zm9yKHIgaW4gaCloW3JdLm9uRXJyb3Iodyk7Zy5vbkVycm9yKHcpO3JldHVybn1vPSExO3RyeXtzPWhbcF0sc3x8KHM9bmV3IE8saFtwXT1zLG89ITApfWNhdGNoKHgpe2ZvcihyIGluIGgpaFtyXS5vbkVycm9yKHgpO2cub25FcnJvcih4KTtyZXR1cm59aWYobyl7bz1uZXcgYmEoaixzLGkpO2o9bmV3IGJhKGoscyk7dHJ5e2s9YyhqKX1jYXRjaCh5KXtmb3IociBpbiBoKWhbcl0ub25FcnJvcih5KTtnLm9uRXJyb3IoeSk7cmV0dXJufWcub25OZXh0KG8pO3U9bmV3IHY7Zi5hZGQodSk7dD1mdW5jdGlvbigpe2hbcF0hPT1uJiYoZGVsZXRlIGhbcF0scy5vbkNvbXBsZXRlZCgpKTtmLnJlbW92ZSh1KX07dS5kaXNwb3NhYmxlKGsudGFrZSgxKS5zdWJzY3JpYmUoZnVuY3Rpb24oKXt9LFxuZnVuY3Rpb24oYSl7Zm9yKHIgaW4gaCloW3JdLm9uRXJyb3IoYSk7Zy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe3QoKX0pKX10cnl7bT1iKGUpfWNhdGNoKEEpe2ZvcihyIGluIGgpaFtyXS5vbkVycm9yKEEpO2cub25FcnJvcihBKTtyZXR1cm59cy5vbk5leHQobSl9LGZ1bmN0aW9uKGEpe2Zvcih2YXIgYiBpbiBoKWhbYl0ub25FcnJvcihhKTtnLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Zm9yKHZhciBhIGluIGgpaFthXS5vbkNvbXBsZXRlZCgpO2cub25Db21wbGV0ZWQoKX0pKTtyZXR1cm4gaX0pfTtmLmdyb3VwQnk9ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB0aGlzLmdyb3VwQnlVbnRpbChhLGIsZnVuY3Rpb24oKXtyZXR1cm4gZGEoKX0sYyl9O2YudGFrZT1mdW5jdGlvbihhLGIpe2lmKDA+YSl0aHJvdyBFcnJvcihcIkFyZ3VtZW50IG91dCBvZiByYW5nZVwiKTtpZigwPT1hKXJldHVybiB0YShiKTt2YXIgYz10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGIpe3ZhciBlPWE7cmV0dXJuIGMuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe2lmKDA8XG5lJiYoZS0tLGIub25OZXh0KGEpLDA9PT1lKSliLm9uQ29tcGxldGVkKCl9LGZ1bmN0aW9uKGEpe3JldHVybiBiLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7cmV0dXJuIGIub25Db21wbGV0ZWQoKX0pfSl9O2Yuc2tpcD1mdW5jdGlvbihhKXtpZigwPmEpdGhyb3cgRXJyb3IoXCJBcmd1bWVudCBvdXQgb2YgcmFuZ2VcIik7dmFyIGI9dGhpcztyZXR1cm4gaShmdW5jdGlvbihjKXt2YXIgZD1hO3JldHVybiBiLnN1YnNjcmliZShmdW5jdGlvbihhKXtpZigwPj1kKWMub25OZXh0KGEpO2Vsc2UgZC0tfSxmdW5jdGlvbihhKXtyZXR1cm4gYy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe3JldHVybiBjLm9uQ29tcGxldGVkKCl9KX0pfTtmLnRha2VXaGlsZT1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPTAsZT0hMDtyZXR1cm4gYi5zdWJzY3JpYmUoZnVuY3Rpb24oYil7aWYoZSl7dHJ5e2U9YShiLGQrKyl9Y2F0Y2goaCl7Yy5vbkVycm9yKGgpO3JldHVybn1pZihlKWMub25OZXh0KGIpO1xuZWxzZSBjLm9uQ29tcGxldGVkKCl9fSxmdW5jdGlvbihhKXtyZXR1cm4gYy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe3JldHVybiBjLm9uQ29tcGxldGVkKCl9KX0pfTtmLnNraXBXaGlsZT1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPTAsZT0hMTtyZXR1cm4gYi5zdWJzY3JpYmUoZnVuY3Rpb24oYil7aWYoIWUpdHJ5e2U9IWEoYixkKyspfWNhdGNoKGgpe2Mub25FcnJvcihoKTtyZXR1cm59aWYoZSljLm9uTmV4dChiKX0sZnVuY3Rpb24oYSl7Yy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2Mub25Db21wbGV0ZWQoKX0pfSl9O2Yuc2VsZWN0TWFueT1mdW5jdGlvbihhLGIpe3JldHVybiBiIT09bj90aGlzLnNlbGVjdE1hbnkoZnVuY3Rpb24oYyl7cmV0dXJuIGEoYykuc2VsZWN0KGZ1bmN0aW9uKGEpe3JldHVybiBiKGMsYSl9KX0pOlwiZnVuY3Rpb25cIj09PXR5cGVvZiBhP3RoaXMuc2VsZWN0KGEpLm1lcmdlT2JzZXJ2YWJsZSgpOnRoaXMuc2VsZWN0KGZ1bmN0aW9uKCl7cmV0dXJuIGF9KS5tZXJnZU9ic2VydmFibGUoKX07XG5mLmZpbmFsVmFsdWU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGIpe3ZhciBjPSExLGQ7cmV0dXJuIGEuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe2M9ITA7ZD1hfSxmdW5jdGlvbihhKXtiLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7aWYoYyliLm9uTmV4dChkKSxiLm9uQ29tcGxldGVkKCk7ZWxzZSBiLm9uRXJyb3IoRXJyb3IoXCJTZXF1ZW5jZSBjb250YWlucyBubyBlbGVtZW50cy5cIikpfSl9KX07Zi50b0FycmF5PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2NhbihbXSxmdW5jdGlvbihhLGIpe2EucHVzaChiKTtyZXR1cm4gYX0pLnN0YXJ0V2l0aChbXSkuZmluYWxWYWx1ZSgpfTtmLm1hdGVyaWFsaXplPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztyZXR1cm4gaShmdW5jdGlvbihiKXtyZXR1cm4gYS5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7Yi5vbk5leHQodC5jcmVhdGVPbk5leHQoYSkpfSxmdW5jdGlvbihhKXtiLm9uTmV4dCh0LmNyZWF0ZU9uRXJyb3IoYSkpO1xuYi5vbkNvbXBsZXRlZCgpfSxmdW5jdGlvbigpe2Iub25OZXh0KHQuY3JlYXRlT25Db21wbGV0ZWQoKSk7Yi5vbkNvbXBsZXRlZCgpfSl9KX07Zi5kZW1hdGVyaWFsaXplPWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztyZXR1cm4gaShmdW5jdGlvbihiKXtyZXR1cm4gYS5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7cmV0dXJuIGEuYWNjZXB0KGIpfSxmdW5jdGlvbihhKXtiLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Yi5vbkNvbXBsZXRlZCgpfSl9KX07Zi5hc09ic2VydmFibGU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGIpe3JldHVybiBhLnN1YnNjcmliZShiKX0pfTtmLndpbmRvd1dpdGhDb3VudD1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7aWYoMD49YSl0aHJvdyBFcnJvcihcIkFyZ3VtZW50IG91dCBvZiByYW5nZVwiKTtiPT09biYmKGI9YSk7aWYoMD49Yil0aHJvdyBFcnJvcihcIkFyZ3VtZW50IG91dCBvZiByYW5nZVwiKTtyZXR1cm4gaShmdW5jdGlvbihkKXt2YXIgZT1cbm5ldyB2LGc9bmV3IFooZSksaD0wLGY9W10saT1mdW5jdGlvbigpe3ZhciBhPW5ldyBPO2YucHVzaChhKTtkLm9uTmV4dChqYShhLGcpKX07aSgpO2UuZGlzcG9zYWJsZShjLnN1YnNjcmliZShmdW5jdGlvbihjKXt2YXIgZDtmb3IoZD0wO2Q8Zi5sZW5ndGg7ZCsrKWZbZF0ub25OZXh0KGMpO2M9aC1hKzE7MDw9YyYmMD09PWMlYiYmKGM9Zi5zaGlmdCgpLGMub25Db21wbGV0ZWQoKSk7aCsrOzA9PT1oJWImJmkoKX0sZnVuY3Rpb24oYSl7Zm9yKDswPGYubGVuZ3RoOylmLnNoaWZ0KCkub25FcnJvcihhKTtkLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Zm9yKDswPGYubGVuZ3RoOylmLnNoaWZ0KCkub25Db21wbGV0ZWQoKTtkLm9uQ29tcGxldGVkKCl9KSk7cmV0dXJuIGd9KX07Zi5idWZmZXJXaXRoQ291bnQ9ZnVuY3Rpb24oYSxiKXtiPT09biYmKGI9YSk7cmV0dXJuIHRoaXMud2luZG93V2l0aENvdW50KGEsYikuc2VsZWN0TWFueShmdW5jdGlvbihhKXtyZXR1cm4gYS50b0FycmF5KCl9KS53aGVyZShmdW5jdGlvbihhKXtyZXR1cm4gMDxcbmEubGVuZ3RofSl9O2Yuc3RhcnRXaXRoPWZ1bmN0aW9uKCl7dmFyIGEsYjthPTA7MDxhcmd1bWVudHMubGVuZ3RoJiZ2b2lkIDAhPT1hcmd1bWVudHNbMF0ubm93PyhiPWFyZ3VtZW50c1swXSxhPTEpOmI9QjthPXkuY2FsbChhcmd1bWVudHMsYSk7cmV0dXJuIFMoW2dhKGEsYiksdGhpc10pLmNvbmNhdCgpfTtmLnNjYW49ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzO3JldHVybiBmYShmdW5jdGlvbigpe3ZhciBkPSExLGU7cmV0dXJuIGMuc2VsZWN0KGZ1bmN0aW9uKGMpe2Q/ZT1iKGUsYyk6KGU9YihhLGMpLGQ9ITApO3JldHVybiBlfSl9KX07Zi5zY2FuMT1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBmYShmdW5jdGlvbigpe3ZhciBjPSExLGQ7cmV0dXJuIGIuc2VsZWN0KGZ1bmN0aW9uKGIpe2M/ZD1hKGQsYik6KGQ9YixjPSEwKTtyZXR1cm4gZH0pfSl9O2YuZGlzdGluY3RVbnRpbENoYW5nZWQ9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzO2F8fChhPVEpO2J8fChiPVYpO1xucmV0dXJuIGkoZnVuY3Rpb24oZCl7dmFyIGU9ITEsZztyZXR1cm4gYy5zdWJzY3JpYmUoZnVuY3Rpb24oYyl7dmFyIGY9ITEsaTt0cnl7aT1hKGMpfWNhdGNoKGope2Qub25FcnJvcihqKTtyZXR1cm59aWYoZSl0cnl7Zj1iKGcsaSl9Y2F0Y2goayl7ZC5vbkVycm9yKGspO3JldHVybn1pZighZXx8IWYpZT0hMCxnPWksZC5vbk5leHQoYyl9LGZ1bmN0aW9uKGEpe2Qub25FcnJvcihhKX0sZnVuY3Rpb24oKXtkLm9uQ29tcGxldGVkKCl9KX0pfTtmLmZpbmFsbHlBY3Rpb249ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztyZXR1cm4gaShmdW5jdGlvbihjKXt2YXIgZD1iLnN1YnNjcmliZShjKTtyZXR1cm4gQShmdW5jdGlvbigpe3RyeXtkLmRpc3Bvc2UoKX1maW5hbGx5e2EoKX19KX0pfTtmLmRvQWN0aW9uPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLGU7MD09YXJndW1lbnRzLmxlbmd0aHx8MTxhcmd1bWVudHMubGVuZ3RofHxcImZ1bmN0aW9uXCI9PXR5cGVvZiBhP2U9YTooZT1mdW5jdGlvbihiKXthLm9uTmV4dChiKX0sXG5iPWZ1bmN0aW9uKGIpe2Eub25FcnJvcihiKX0sYz1mdW5jdGlvbigpe2Eub25Db21wbGV0ZWQoKX0pO3JldHVybiBpKGZ1bmN0aW9uKGEpe3JldHVybiBkLnN1YnNjcmliZShmdW5jdGlvbihiKXt0cnl7ZShiKX1jYXRjaChjKXthLm9uRXJyb3IoYyl9YS5vbk5leHQoYil9LGZ1bmN0aW9uKGMpe2lmKGIpdHJ5e2IoYyl9Y2F0Y2goZCl7YS5vbkVycm9yKGQpfWEub25FcnJvcihjKX0sZnVuY3Rpb24oKXtpZihjKXRyeXtjKCl9Y2F0Y2goYil7YS5vbkVycm9yKGIpfWEub25Db21wbGV0ZWQoKX0pfSl9O2Yuc2tpcExhc3Q9ZnVuY3Rpb24oYSl7dmFyIGI9dGhpcztyZXR1cm4gaShmdW5jdGlvbihjKXt2YXIgZD1bXTtyZXR1cm4gYi5zdWJzY3JpYmUoZnVuY3Rpb24oYil7ZC5wdXNoKGIpO2lmKGQubGVuZ3RoPmEpYy5vbk5leHQoZC5zaGlmdCgpKX0sZnVuY3Rpb24oYSl7Yy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2Mub25Db21wbGV0ZWQoKX0pfSl9O2YudGFrZUxhc3Q9ZnVuY3Rpb24oYSl7dmFyIGI9XG50aGlzO3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPVtdO3JldHVybiBiLnN1YnNjcmliZShmdW5jdGlvbihiKXtkLnB1c2goYik7ZC5sZW5ndGg+YSYmZC5zaGlmdCgpfSxmdW5jdGlvbihhKXtjLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Zm9yKDswPGQubGVuZ3RoOyljLm9uTmV4dChkLnNoaWZ0KCkpO2Mub25Db21wbGV0ZWQoKX0pfSl9O2YuaWdub3JlRWxlbWVudHM9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGIpe3JldHVybiBhLnN1YnNjcmliZShpYSxmdW5jdGlvbihhKXtiLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Yi5vbkNvbXBsZXRlZCgpfSl9KX07Zi5lbGVtZW50QXQ9ZnVuY3Rpb24oYSl7aWYoMD5hKXRocm93IEVycm9yKFwiQXJndW1lbnQgb3V0IG9mIHJhbmdlXCIpO3ZhciBiPXRoaXM7cmV0dXJuIGkoZnVuY3Rpb24oYyl7dmFyIGQ9YTtyZXR1cm4gYi5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7MD09PWQmJihjLm9uTmV4dChhKSxjLm9uQ29tcGxldGVkKCkpO1xuZC0tfSxmdW5jdGlvbihhKXtjLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7Yy5vbkVycm9yKEVycm9yKFwiQXJndW1lbnQgb3V0IG9mIHJhbmdlXCIpKX0pfSl9O2YuZWxlbWVudEF0T3JEZWZhdWx0PWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcztpZigwPmEpdGhyb3cgRXJyb3IoXCJBcmd1bWVudCBvdXQgb2YgcmFuZ2VcIik7Yj09PW4mJihiPW51bGwpO3JldHVybiBpKGZ1bmN0aW9uKGQpe3ZhciBlPWE7cmV0dXJuIGMuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpezA9PT1lJiYoZC5vbk5leHQoYSksZC5vbkNvbXBsZXRlZCgpKTtlLS19LGZ1bmN0aW9uKGEpe2Qub25FcnJvcihhKX0sZnVuY3Rpb24oKXtkLm9uTmV4dChiKTtkLm9uQ29tcGxldGVkKCl9KX0pfTtmLmRlZmF1bHRJZkVtcHR5PWZ1bmN0aW9uKGEpe3ZhciBiPXRoaXM7YT09PW4mJihhPW51bGwpO3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPSExO3JldHVybiBiLnN1YnNjcmliZShmdW5jdGlvbihhKXtkPSEwO2Mub25OZXh0KGEpfSxcbmZ1bmN0aW9uKGEpe2Mub25FcnJvcihhKX0sZnVuY3Rpb24oKXtpZighZCljLm9uTmV4dChhKTtjLm9uQ29tcGxldGVkKCl9KX0pfTtmLmRpc3RpbmN0PWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpczthfHwoYT1RKTtifHwoYj1XKTtyZXR1cm4gaShmdW5jdGlvbihkKXt2YXIgZT17fTtyZXR1cm4gYy5zdWJzY3JpYmUoZnVuY3Rpb24oYyl7dmFyIGYsaSxqLHE9ITE7dHJ5e2Y9YShjKSxpPWIoZil9Y2F0Y2goayl7ZC5vbkVycm9yKGspO3JldHVybn1mb3IoaiBpbiBlKWlmKGk9PT1qKXtxPSEwO2JyZWFrfXF8fChlW2ldPW51bGwsZC5vbk5leHQoYykpfSxmdW5jdGlvbihhKXtkLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7ZC5vbkNvbXBsZXRlZCgpfSl9KX07Zi5tZXJnZU9ic2VydmFibGU9ZnVuY3Rpb24oKXt2YXIgYT10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGIpe3ZhciBjPW5ldyBwLGQ9ITEsZT1uZXcgdjtjLmFkZChlKTtlLmRpc3Bvc2FibGUoYS5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7dmFyIGU9XG5uZXcgdjtjLmFkZChlKTtlLmRpc3Bvc2FibGUoYS5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7Yi5vbk5leHQoYSl9LGZ1bmN0aW9uKGEpe2Iub25FcnJvcihhKX0sZnVuY3Rpb24oKXtjLnJlbW92ZShlKTtpZihkJiYxPT09Yy5jb3VudCgpKWIub25Db21wbGV0ZWQoKX0pKX0sZnVuY3Rpb24oYSl7Yi5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2Q9ITA7aWYoMT09PWMuY291bnQoKSliLm9uQ29tcGxldGVkKCl9KSk7cmV0dXJuIGN9KX07Zi5tZXJnZT1mdW5jdGlvbihhKXt2YXIgYj10aGlzO3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPTAsZT1uZXcgcCxnPSExLGY9W10saT1mdW5jdGlvbihhKXt2YXIgYj1uZXcgdjtlLmFkZChiKTtiLmRpc3Bvc2FibGUoYS5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7Yy5vbk5leHQoYSl9LGZ1bmN0aW9uKGEpe2Mub25FcnJvcihhKX0sZnVuY3Rpb24oKXt2YXIgYTtlLnJlbW92ZShiKTtpZigwPGYubGVuZ3RoKWE9Zi5zaGlmdCgpLGkoYSk7ZWxzZSBpZihkLS0sXG5nJiYwPT09ZCljLm9uQ29tcGxldGVkKCl9KSl9O2UuYWRkKGIuc3Vic2NyaWJlKGZ1bmN0aW9uKGIpe2Q8YT8oZCsrLGkoYikpOmYucHVzaChiKX0sZnVuY3Rpb24oYSl7Yy5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2c9ITA7aWYoMD09PWQpYy5vbkNvbXBsZXRlZCgpfSkpO3JldHVybiBlfSl9O2Yuc3dpdGNoTGF0ZXN0PWZ1bmN0aW9uKCl7dmFyIGE9dGhpcztyZXR1cm4gaShmdW5jdGlvbihiKXt2YXIgYz0hMSxkPW5ldyBDLGU9ITEsZz0wLGY9YS5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7dmFyIGY9bmV3IHYsaD0rK2c7Yz0hMDtkLmRpc3Bvc2FibGUoZik7cmV0dXJuIGYuZGlzcG9zYWJsZShhLnN1YnNjcmliZShmdW5jdGlvbihhKXtpZihnPT09aCliLm9uTmV4dChhKX0sZnVuY3Rpb24oYSl7aWYoZz09PWgpYi5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2lmKGc9PT1oJiYoYz0hMSxlKSliLm9uQ29tcGxldGVkKCl9KSl9LGZ1bmN0aW9uKGEpe2Iub25FcnJvcihhKX0sZnVuY3Rpb24oKXtlPVxuITA7aWYoIWMpYi5vbkNvbXBsZXRlZCgpfSk7cmV0dXJuIG5ldyBwKGYsZCl9KX07ai5tZXJnZT1mdW5jdGlvbihhKXthfHwoYT1CKTt2YXIgYj0xPGFyZ3VtZW50cy5sZW5ndGgmJmFyZ3VtZW50c1sxXWluc3RhbmNlb2YgQXJyYXk/YXJndW1lbnRzWzFdOnkuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIGdhKGIsYSkubWVyZ2VPYnNlcnZhYmxlKCl9O2YuY29uY2F0PWZ1bmN0aW9uKCl7dmFyIGE9d2EsYjtiPWFyZ3VtZW50czt2YXIgYyxkO2M9W107Zm9yKGQ9MDtkPGIubGVuZ3RoO2QrKyljLnB1c2goYltkXSk7Yj1jO2IudW5zaGlmdCh0aGlzKTtyZXR1cm4gYS5hcHBseSh0aGlzLGIpfTtmLmNvbmNhdE9ic2VydmFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tZXJnZSgxKX07dmFyIHdhPWouY29uY2F0PWZ1bmN0aW9uKCl7dmFyIGE9MT09PWFyZ3VtZW50cy5sZW5ndGgmJmFyZ3VtZW50c1swXWluc3RhbmNlb2YgQXJyYXk/YXJndW1lbnRzWzBdOnkuY2FsbChhcmd1bWVudHMpO1xucmV0dXJuIFMoYSkuY29uY2F0KCl9O2YuY2F0Y2hFeGNlcHRpb249ZnVuY3Rpb24oYSl7cmV0dXJuXCJmdW5jdGlvblwiPT09dHlwZW9mIGE/eGEodGhpcyxhKTp5YShbdGhpcyxhXSl9O3ZhciB4YT1mdW5jdGlvbihhLGIpe3JldHVybiBpKGZ1bmN0aW9uKGMpe3ZhciBkPW5ldyB2LGU9bmV3IEM7ZC5kaXNwb3NhYmxlKGEuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe2Mub25OZXh0KGEpfSxmdW5jdGlvbihhKXt2YXIgZDt0cnl7ZD1iKGEpfWNhdGNoKGYpe2Mub25FcnJvcihmKTtyZXR1cm59YT1uZXcgdjtlLmRpc3Bvc2FibGUoYSk7YS5kaXNwb3NhYmxlKGQuc3Vic2NyaWJlKGMpKX0sZnVuY3Rpb24oKXtjLm9uQ29tcGxldGVkKCl9KSk7cmV0dXJuIGV9KX0seWE9ai5jYXRjaEV4Y2VwdGlvbj1mdW5jdGlvbigpe3ZhciBhPTE9PT1hcmd1bWVudHMubGVuZ3RoJiZhcmd1bWVudHNbMF1pbnN0YW5jZW9mIEFycmF5P2FyZ3VtZW50c1swXTp5LmNhbGwoYXJndW1lbnRzKTtyZXR1cm4gUyhhKS5jYXRjaEV4Y2VwdGlvbigpfTtcbmYub25FcnJvclJlc3VtZU5leHQ9ZnVuY3Rpb24oYSl7cmV0dXJuIHphKFt0aGlzLGFdKX07dmFyIHphPWoub25FcnJvclJlc3VtZU5leHQ9ZnVuY3Rpb24oKXt2YXIgYT0xPT09YXJndW1lbnRzLmxlbmd0aCYmYXJndW1lbnRzWzBdaW5zdGFuY2VvZiBBcnJheT9hcmd1bWVudHNbMF06eS5jYWxsKGFyZ3VtZW50cyk7cmV0dXJuIGkoZnVuY3Rpb24oYil7dmFyIGM9MCxkPW5ldyBDLGU9Qi5zY2hlZHVsZVJlY3Vyc2l2ZShmdW5jdGlvbihlKXt2YXIgZixpO2lmKGM8YS5sZW5ndGgpZj1hW2MrK10saT1uZXcgdixkLmRpc3Bvc2FibGUoaSksaS5kaXNwb3NhYmxlKGYuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe2Iub25OZXh0KGEpfSxmdW5jdGlvbigpe2UoKX0sZnVuY3Rpb24oKXtlKCl9KSk7ZWxzZSBiLm9uQ29tcGxldGVkKCl9KTtyZXR1cm4gbmV3IHAoZCxlKX0pfSxBYT1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSxjKXt2YXIgZD10aGlzO3RoaXMuc2VsZWN0b3I9YTt0aGlzLm9ic2VydmVyPVxuYzt0aGlzLmxlZnRRPVtdO3RoaXMucmlnaHRRPVtdO3RoaXMubGVmdD1JKGZ1bmN0aW9uKGEpe2lmKFwiRVwiPT09YS5raW5kKWQub2JzZXJ2ZXIub25FcnJvcihhLmV4Y2VwdGlvbik7ZWxzZSBpZigwPT09ZC5yaWdodFEubGVuZ3RoKWQubGVmdFEucHVzaChhKTtlbHNlIGQub25OZXh0KGEsZC5yaWdodFEuc2hpZnQoKSl9KTt0aGlzLnJpZ2h0PUkoZnVuY3Rpb24oYSl7aWYoXCJFXCI9PT1hLmtpbmQpZC5vYnNlcnZlci5vbkVycm9yKGEuZXhjZXB0aW9uKTtlbHNlIGlmKDA9PT1kLmxlZnRRLmxlbmd0aClkLnJpZ2h0US5wdXNoKGEpO2Vsc2UgZC5vbk5leHQoZC5sZWZ0US5zaGlmdCgpLGEpfSl9YS5wcm90b3R5cGUub25OZXh0PWZ1bmN0aW9uKGEsYyl7dmFyIGQ7aWYoXCJDXCI9PT1hLmtpbmR8fFwiQ1wiPT09Yy5raW5kKXRoaXMub2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtlbHNle3RyeXtkPXRoaXMuc2VsZWN0b3IoYS52YWx1ZSxjLnZhbHVlKX1jYXRjaChlKXt0aGlzLm9ic2VydmVyLm9uRXJyb3IoZSk7XG5yZXR1cm59dGhpcy5vYnNlcnZlci5vbk5leHQoZCl9fTtyZXR1cm4gYX0oKTtmLnppcD1mdW5jdGlvbihhLGIpe3JldHVybiBGKHRoaXMsYSxmdW5jdGlvbihhKXt2YXIgZD1uZXcgQWEoYixhKTtyZXR1cm4gbmV3IEgoZnVuY3Rpb24oYSl7cmV0dXJuIGQubGVmdC5vbk5leHQoYSl9LGZ1bmN0aW9uKGEpe3JldHVybiBkLnJpZ2h0Lm9uTmV4dChhKX0pfSl9O3ZhciBoYTtoYT1mdW5jdGlvbigpe2Z1bmN0aW9uIGEoYSxjKXt2YXIgZD10aGlzO3RoaXMuc2VsZWN0b3I9YTt0aGlzLm9ic2VydmVyPWM7dGhpcy5yaWdodFN0b3BwZWQ9dGhpcy5sZWZ0U3RvcHBlZD0hMTt0aGlzLmxlZnQ9SShmdW5jdGlvbihhKXtpZihcIk5cIj09PWEua2luZClpZihkLmxlZnRWYWx1ZT1hLGQucmlnaHRWYWx1ZSE9PW4pZC5vbk5leHQoKTtlbHNle2lmKGQucmlnaHRTdG9wcGVkKWQub2JzZXJ2ZXIub25Db21wbGV0ZWQoKX1lbHNlIGlmKFwiRVwiPT09YS5raW5kKWQub2JzZXJ2ZXIub25FcnJvcihhLmV4Y2VwdGlvbik7XG5lbHNlIGlmKGQubGVmdFN0b3BwZWQ9ITAsZC5yaWdodFN0b3BwZWQpZC5vYnNlcnZlci5vbkNvbXBsZXRlZCgpfSk7dGhpcy5yaWdodD1JKGZ1bmN0aW9uKGEpe2lmKFwiTlwiPT09YS5raW5kKWlmKGQucmlnaHRWYWx1ZT1hLGQubGVmdFZhbHVlIT09bilkLm9uTmV4dCgpO2Vsc2V7aWYoZC5sZWZ0U3RvcHBlZClkLm9ic2VydmVyLm9uQ29tcGxldGVkKCl9ZWxzZSBpZihcIkVcIj09PWEua2luZClkLm9ic2VydmVyLm9uRXJyb3IoYS5leGNlcHRpb24pO2Vsc2UgaWYoZC5yaWdodFN0b3BwZWQ9ITAsZC5sZWZ0U3RvcHBlZClkLm9ic2VydmVyLm9uQ29tcGxldGVkKCl9KX1hLnByb3RvdHlwZS5vbk5leHQ9ZnVuY3Rpb24oKXt2YXIgYTt0cnl7YT10aGlzLnNlbGVjdG9yKHRoaXMubGVmdFZhbHVlLnZhbHVlLHRoaXMucmlnaHRWYWx1ZS52YWx1ZSl9Y2F0Y2goYyl7dGhpcy5vYnNlcnZlci5vbkVycm9yKGMpO3JldHVybn10aGlzLm9ic2VydmVyLm9uTmV4dChhKX07cmV0dXJuIGF9KCk7Zi5jb21iaW5lTGF0ZXN0PVxuZnVuY3Rpb24oYSxiKXtyZXR1cm4gRih0aGlzLGEsZnVuY3Rpb24oYSl7dmFyIGQ9bmV3IGhhKGIsYSk7cmV0dXJuIG5ldyBIKGZ1bmN0aW9uKGEpe3JldHVybiBkLmxlZnQub25OZXh0KGEpfSxmdW5jdGlvbihhKXtyZXR1cm4gZC5yaWdodC5vbk5leHQoYSl9KX0pfTtmLnRha2VVbnRpbD1mdW5jdGlvbihhKXtyZXR1cm4gRihhLHRoaXMsZnVuY3Rpb24oYSxjKXt2YXIgZD0hMSxlPSExO3JldHVybiBuZXcgSChmdW5jdGlvbihjKXshZSYmIWQmJihcIkNcIj09PWMua2luZD9kPSEwOlwiRVwiPT09Yy5raW5kPyhlPWQ9ITAsYS5vbkVycm9yKGMuZXhjZXB0aW9uKSk6KGU9ITAsYS5vbkNvbXBsZXRlZCgpKSl9LGZ1bmN0aW9uKGQpe2V8fChkLmFjY2VwdChhKSwoZT1cIk5cIiE9PWQua2luZCkmJmMuZGlzcG9zZSgpKX0pfSl9O2Yuc2tpcFVudGlsPWZ1bmN0aW9uKGEpe3JldHVybiBGKHRoaXMsYSxmdW5jdGlvbihhLGMsZCl7dmFyIGU9ITEsZj0hMTtyZXR1cm4gbmV3IEgoZnVuY3Rpb24oYyl7aWYoXCJFXCI9PVxuYy5raW5kKWEub25FcnJvcihjLmV4Y2VwdGlvbik7ZWxzZSBlJiZjLmFjY2VwdChhKX0sZnVuY3Rpb24oYyl7aWYoIWYpe2lmKFwiTlwiPT09Yy5raW5kKWU9ITA7ZWxzZSBpZihcIkVcIj09PWMua2luZClhLm9uRXJyb3IoYy5leGNlcHRpb24pO2Y9ITA7ZC5kaXNwb3NlKCl9fSl9KX07ai5hbWI9ZnVuY3Rpb24oKXt2YXIgYT1kYSgpLGIsYz0xPT09YXJndW1lbnRzLmxlbmd0aCYmYXJndW1lbnRzWzBdaW5zdGFuY2VvZiBBcnJheT9hcmd1bWVudHNbMF06eS5jYWxsKGFyZ3VtZW50cyk7Zm9yKGI9MDtiPGMubGVuZ3RoO2IrKylhPWEuYW1iKGNbYl0pO3JldHVybiBhfTtmLmFtYj1mdW5jdGlvbihhKXtyZXR1cm4gRih0aGlzLGEsZnVuY3Rpb24oYSxjLGQpe3ZhciBlPVwiTlwiO3JldHVybiBuZXcgSChmdW5jdGlvbihjKXtcIk5cIj09PWUmJihlPVwiTFwiLGQuZGlzcG9zZSgpKTtcIkxcIj09PWUmJmMuYWNjZXB0KGEpfSxmdW5jdGlvbihkKXtcIk5cIj09PWUmJihlPVwiUlwiLGMuZGlzcG9zZSgpKTtcIlJcIj09PVxuZSYmZC5hY2NlcHQoYSl9KX0pfX07XG4iLCIvKlxuIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiAgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiBUaGlzIGNvZGUgaXMgbGljZW5zZWQgYnkgTWljcm9zb2Z0IENvcnBvcmF0aW9uIHVuZGVyIHRoZSB0ZXJtc1xuIG9mIHRoZSBNSUNST1NPRlQgUkVBQ1RJVkUgRVhURU5TSU9OUyBGT1IgSkFWQVNDUklQVCBBTkQgLk5FVCBMSUJSQVJJRVMgTGljZW5zZS5cbiBTZWUgaHR0cDovL2dvLm1pY3Jvc29mdC5jb20vZndsaW5rLz9MaW5rSUQ9MjIwNzYyLlxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocSxoKXt2YXIgZjtmPXEuUng7dmFyIHo9Zi5PYnNlcnZhYmxlLHU9Zi5Db21wb3NpdGVEaXNwb3NhYmxlLEU9Zi5SZWZDb3VudERpc3Bvc2FibGUscz1mLlNpbmdsZUFzc2lnbm1lbnREaXNwb3NhYmxlLEs9Zi5TZXJpYWxEaXNwb3NhYmxlLEE9Zi5TdWJqZWN0O2Y9ei5wcm90b3R5cGU7dmFyIEw9ei5lbXB0eSx2PXouY3JlYXRlV2l0aERpc3Bvc2FibGUsTT1mdW5jdGlvbihiLGEpe3JldHVybiBiPT09YX0sTj1mdW5jdGlvbigpe30sQj1mdW5jdGlvbihiLGEpe3JldHVybiB2KGZ1bmN0aW9uKGMpe3JldHVybiBuZXcgdShhLmdldERpc3Bvc2FibGUoKSxiLnN1YnNjcmliZShjKSl9KX0sQyxGLG8sRyx3LHg7bz1bMSwzLDcsMTMsMzEsNjEsMTI3LDI1MSw1MDksMTAyMSwyMDM5LDQwOTMsODE5MSwxNjM4MSxcbjMyNzQ5LDY1NTIxLDEzMTA3MSwyNjIxMzksNTI0Mjg3LDEwNDg1NzMsMjA5NzE0Myw0MTk0MzAxLDgzODg1OTMsMTY3NzcyMTMsMzM1NTQzOTMsNjcxMDg4NTksMTM0MjE3Njg5LDI2ODQzNTM5OSw1MzY4NzA5MDksMTA3Mzc0MTc4OSwyMTQ3NDgzNjQ3XTtGPWZ1bmN0aW9uKGIpe3ZhciBhLGM7aWYoYiYwKXJldHVybiAyPT09YjthPU1hdGguc3FydChiKTtmb3IoYz0zO2M8PWE7KXtpZigwPT09YiVjKXJldHVybiExO2MrPTJ9cmV0dXJuITB9O0M9ZnVuY3Rpb24oYil7dmFyIGEsYztmb3IoYT0wO2E8by5sZW5ndGg7KythKWlmKGM9b1thXSxjPj1iKXJldHVybiBjO2ZvcihhPWJ8MTthPG9bby5sZW5ndGgtMV07KXtpZihGKGEpKXJldHVybiBhO2ErPTJ9cmV0dXJuIGJ9O0c9MDt3PWZ1bmN0aW9uKGIpe3ZhciBhO2lmKGI9PT1oKXRocm93XCJubyBzdWNoIGtleVwiO2lmKGIuZ2V0SGFzaENvZGUhPT1oKXJldHVybiBiLmdldEhhc2hDb2RlKCk7YT0xNypHKys7Yi5nZXRIYXNoQ29kZT1mdW5jdGlvbigpe3JldHVybiBhfTtcbnJldHVybiBhfTt4PWZ1bmN0aW9uKCl7cmV0dXJue2tleTpudWxsLHZhbHVlOm51bGwsbmV4dDowLGhhc2hDb2RlOjB9fTt2YXIgeT1mdW5jdGlvbigpe2Z1bmN0aW9uIGIoYSxjKXt0aGlzLl9pbml0aWFsaXplKGEpO3RoaXMuY29tcGFyZXI9Y3x8TTt0aGlzLnNpemU9dGhpcy5mcmVlQ291bnQ9MDt0aGlzLmZyZWVMaXN0PS0xfWIucHJvdG90eXBlLl9pbml0aWFsaXplPWZ1bmN0aW9uKGEpe3ZhciBhPUMoYSksYzt0aGlzLmJ1Y2tldHM9QXJyYXkoYSk7dGhpcy5lbnRyaWVzPUFycmF5KGEpO2ZvcihjPTA7YzxhO2MrKyl0aGlzLmJ1Y2tldHNbY109LTEsdGhpcy5lbnRyaWVzW2NdPXgoKTt0aGlzLmZyZWVMaXN0PS0xfTtiLnByb3RvdHlwZS5jb3VudD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnNpemV9O2IucHJvdG90eXBlLmFkZD1mdW5jdGlvbihhLGMpe3JldHVybiB0aGlzLl9pbnNlcnQoYSxjLCEwKX07Yi5wcm90b3R5cGUuX2luc2VydD1mdW5jdGlvbihhLGMsYil7dmFyIGUsZCxcbmc7dGhpcy5idWNrZXRzPT09aCYmdGhpcy5faW5pdGlhbGl6ZSgwKTtnPXcoYSkmMjE0NzQ4MzY0NztlPWcldGhpcy5idWNrZXRzLmxlbmd0aDtmb3IoZD10aGlzLmJ1Y2tldHNbZV07MDw9ZDtkPXRoaXMuZW50cmllc1tkXS5uZXh0KWlmKHRoaXMuZW50cmllc1tkXS5oYXNoQ29kZT09PWcmJnRoaXMuY29tcGFyZXIodGhpcy5lbnRyaWVzW2RdLmtleSxhKSl7aWYoYil0aHJvd1wiZHVwbGljYXRlIGtleVwiO3RoaXMuZW50cmllc1tkXS52YWx1ZT1jO3JldHVybn0wPHRoaXMuZnJlZUNvdW50PyhiPXRoaXMuZnJlZUxpc3QsdGhpcy5mcmVlTGlzdD10aGlzLmVudHJpZXNbYl0ubmV4dCwtLXRoaXMuZnJlZUNvdW50KToodGhpcy5zaXplPT09dGhpcy5lbnRyaWVzLmxlbmd0aCYmKHRoaXMuX3Jlc2l6ZSgpLGU9ZyV0aGlzLmJ1Y2tldHMubGVuZ3RoKSxiPXRoaXMuc2l6ZSwrK3RoaXMuc2l6ZSk7dGhpcy5lbnRyaWVzW2JdLmhhc2hDb2RlPWc7dGhpcy5lbnRyaWVzW2JdLm5leHQ9dGhpcy5idWNrZXRzW2VdO1xudGhpcy5lbnRyaWVzW2JdLmtleT1hO3RoaXMuZW50cmllc1tiXS52YWx1ZT1jO3RoaXMuYnVja2V0c1tlXT1ifTtiLnByb3RvdHlwZS5fcmVzaXplPWZ1bmN0aW9uKCl7dmFyIGEsYyxiLGUsZDtkPUMoMip0aGlzLnNpemUpO2I9QXJyYXkoZCk7Zm9yKGE9MDthPGIubGVuZ3RoOysrYSliW2FdPS0xO2U9QXJyYXkoZCk7Zm9yKGE9MDthPHRoaXMuc2l6ZTsrK2EpZVthXT10aGlzLmVudHJpZXNbYV07Zm9yKGE9dGhpcy5zaXplO2E8ZDsrK2EpZVthXT14KCk7Zm9yKGE9MDthPHRoaXMuc2l6ZTsrK2EpYz1lW2FdLmhhc2hDb2RlJWQsZVthXS5uZXh0PWJbY10sYltjXT1hO3RoaXMuYnVja2V0cz1iO3RoaXMuZW50cmllcz1lfTtiLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24oYSl7dmFyIGIsayxlLGQ7aWYodGhpcy5idWNrZXRzIT09aCl7ZD13KGEpJjIxNDc0ODM2NDc7Yj1kJXRoaXMuYnVja2V0cy5sZW5ndGg7az0tMTtmb3IoZT10aGlzLmJ1Y2tldHNbYl07MDw9ZTtlPXRoaXMuZW50cmllc1tlXS5uZXh0KXtpZih0aGlzLmVudHJpZXNbZV0uaGFzaENvZGU9PT1cbmQmJnRoaXMuY29tcGFyZXIodGhpcy5lbnRyaWVzW2VdLmtleSxhKSlyZXR1cm4gMD5rP3RoaXMuYnVja2V0c1tiXT10aGlzLmVudHJpZXNbZV0ubmV4dDp0aGlzLmVudHJpZXNba10ubmV4dD10aGlzLmVudHJpZXNbZV0ubmV4dCx0aGlzLmVudHJpZXNbZV0uaGFzaENvZGU9LTEsdGhpcy5lbnRyaWVzW2VdLm5leHQ9dGhpcy5mcmVlTGlzdCx0aGlzLmVudHJpZXNbZV0ua2V5PW51bGwsdGhpcy5lbnRyaWVzW2VdLnZhbHVlPW51bGwsdGhpcy5mcmVlTGlzdD1lLCsrdGhpcy5mcmVlQ291bnQsITA7az1lfX1yZXR1cm4hMX07Yi5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXt2YXIgYTtpZighKDA+PXRoaXMuc2l6ZSkpe2ZvcihhPTA7YTx0aGlzLmJ1Y2tldHMubGVuZ3RoOysrYSl0aGlzLmJ1Y2tldHNbYV09LTE7Zm9yKGE9MDthPHRoaXMuc2l6ZTsrK2EpdGhpcy5lbnRyaWVzW2FdPXgoKTt0aGlzLmZyZWVMaXN0PS0xO3RoaXMuc2l6ZT0wfX07Yi5wcm90b3R5cGUuX2ZpbmRFbnRyeT1cbmZ1bmN0aW9uKGEpe3ZhciBiLGs7aWYodGhpcy5idWNrZXRzIT09aCl7az13KGEpJjIxNDc0ODM2NDc7Zm9yKGI9dGhpcy5idWNrZXRzW2sldGhpcy5idWNrZXRzLmxlbmd0aF07MDw9YjtiPXRoaXMuZW50cmllc1tiXS5uZXh0KWlmKHRoaXMuZW50cmllc1tiXS5oYXNoQ29kZT09PWsmJnRoaXMuY29tcGFyZXIodGhpcy5lbnRyaWVzW2JdLmtleSxhKSlyZXR1cm4gYn1yZXR1cm4tMX07Yi5wcm90b3R5cGUuY291bnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zaXplLXRoaXMuZnJlZUNvdW50fTtiLnByb3RvdHlwZS50cnlHZXRFbnRyeT1mdW5jdGlvbihhKXthPXRoaXMuX2ZpbmRFbnRyeShhKTtyZXR1cm4gMDw9YT97a2V5OnRoaXMuZW50cmllc1thXS5rZXksdmFsdWU6dGhpcy5lbnRyaWVzW2FdLnZhbHVlfTpofTtiLnByb3RvdHlwZS5nZXRWYWx1ZXM9ZnVuY3Rpb24oKXt2YXIgYT0wLGIsaz1bXTtpZih0aGlzLmVudHJpZXMhPT1oKWZvcihiPTA7Yjx0aGlzLnNpemU7YisrKWlmKDA8PVxudGhpcy5lbnRyaWVzW2JdLmhhc2hDb2RlKWtbYSsrXT10aGlzLmVudHJpZXNbYl0udmFsdWU7cmV0dXJuIGt9O2IucHJvdG90eXBlLmdldD1mdW5jdGlvbihhKXthPXRoaXMuX2ZpbmRFbnRyeShhKTtpZigwPD1hKXJldHVybiB0aGlzLmVudHJpZXNbYV0udmFsdWU7dGhyb3cgRXJyb3IoXCJubyBzdWNoIGtleVwiKTt9O2IucHJvdG90eXBlLnNldD1mdW5jdGlvbihhLGIpe3RoaXMuX2luc2VydChhLGIsITEpfTtiLnByb3RvdHlwZS5jb250YWluc2tleT1mdW5jdGlvbihhKXtyZXR1cm4gMDw9dGhpcy5fZmluZEVudHJ5KGEpfTtyZXR1cm4gYn0oKTtmLmpvaW49ZnVuY3Rpb24oYixhLGMsayl7dmFyIGU9dGhpcztyZXR1cm4gdihmdW5jdGlvbihkKXt2YXIgZz1uZXcgdSxqPSExLGY9MCxsPW5ldyB5LGg9ITEscj0wLHQ9bmV3IHk7Zy5hZGQoZS5zdWJzY3JpYmUoZnVuY3Rpb24oYil7dmFyIGMsZSxwPWYrKyxpPW5ldyBzLEg7bC5hZGQocCxiKTtnLmFkZChpKTtlPWZ1bmN0aW9uKCl7aWYobC5yZW1vdmUocCkmJlxuMD09PWwuY291bnQoKSYmailkLm9uQ29tcGxldGVkKCk7cmV0dXJuIGcucmVtb3ZlKGkpfTt0cnl7Yz1hKGIpfWNhdGNoKGgpe2Qub25FcnJvcihoKTtyZXR1cm59aS5kaXNwb3NhYmxlKGMudGFrZSgxKS5zdWJzY3JpYmUoZnVuY3Rpb24oKXt9LGZ1bmN0aW9uKGEpe2Qub25FcnJvcihhKX0sZnVuY3Rpb24oKXtlKCl9KSk7Yz10LmdldFZhbHVlcygpO2Zvcih2YXIgbj0wO248Yy5sZW5ndGg7bisrKXt0cnl7SD1rKGIsY1tuXSl9Y2F0Y2gocil7ZC5vbkVycm9yKHIpO2JyZWFrfWQub25OZXh0KEgpfX0sZnVuY3Rpb24oYSl7ZC5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2o9ITA7aWYoaHx8MD09PWwuY291bnQoKSlkLm9uQ29tcGxldGVkKCl9KSk7Zy5hZGQoYi5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7dmFyIGIsZSxwPXIrKyxpPW5ldyBzLGo7dC5hZGQocCxhKTtnLmFkZChpKTtlPWZ1bmN0aW9uKCl7aWYodC5yZW1vdmUocCkmJjA9PT10LmNvdW50KCkmJmgpZC5vbkNvbXBsZXRlZCgpO1xucmV0dXJuIGcucmVtb3ZlKGkpfTt0cnl7Yj1jKGEpfWNhdGNoKGYpe2Qub25FcnJvcihmKTtyZXR1cm59aS5kaXNwb3NhYmxlKGIudGFrZSgxKS5zdWJzY3JpYmUoZnVuY3Rpb24oKXt9LGZ1bmN0aW9uKGEpe2Qub25FcnJvcihhKX0sZnVuY3Rpb24oKXtlKCl9KSk7Yj1sLmdldFZhbHVlcygpO2Zvcih2YXIgbj0wO248Yi5sZW5ndGg7bisrKXt0cnl7aj1rKGJbbl0sYSl9Y2F0Y2goTyl7ZC5vbkVycm9yKE8pO2JyZWFrfWQub25OZXh0KGopfX0sZnVuY3Rpb24oYSl7ZC5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2g9ITA7aWYoanx8MD09PXQuY291bnQoKSlkLm9uQ29tcGxldGVkKCl9KSk7cmV0dXJuIGd9KX07Zi5ncm91cEpvaW49ZnVuY3Rpb24oYixhLGMsayl7dmFyIGU9dGhpcztyZXR1cm4gdihmdW5jdGlvbihkKXt2YXIgZz1uZXcgdSxqPW5ldyBFKGcpLGY9MCxsPW5ldyB5LGg9MCxyPW5ldyB5O2cuYWRkKGUuc3Vic2NyaWJlKGZ1bmN0aW9uKGIpe3ZhciBjLGUsbSxwPWYrKyxpLFxuaCxELG49bmV3IEE7bC5hZGQocCxuKTt0cnl7bT1rKGIsQihuLGopKX1jYXRjaChvKXtpPWwuZ2V0VmFsdWVzKCk7Zm9yKG09MDttPGkubGVuZ3RoO20rKylpW21dLm9uRXJyb3Iobyk7ZC5vbkVycm9yKG8pO3JldHVybn1kLm9uTmV4dChtKTtEPXIuZ2V0VmFsdWVzKCk7Zm9yKG09MDttPEQubGVuZ3RoO20rKyluLm9uTmV4dChEW21dKTtoPW5ldyBzO2cuYWRkKGgpO2U9ZnVuY3Rpb24oKXtpZihsLnJlbW92ZShwKSluLm9uQ29tcGxldGVkKCk7Zy5yZW1vdmUoaCl9O3RyeXtjPWEoYil9Y2F0Y2gocSl7aT1sLmdldFZhbHVlcygpO2ZvcihtPTA7bTxpLmxlbmd0aDttKyspaVttXS5vbkVycm9yKHEpO2Qub25FcnJvcihxKTtyZXR1cm59aC5kaXNwb3NhYmxlKGMudGFrZSgxKS5zdWJzY3JpYmUoZnVuY3Rpb24oKXt9LGZ1bmN0aW9uKGEpe3ZhciBiO2k9bC5nZXRWYWx1ZXMoKTtmb3IoYj0wO2I8aS5sZW5ndGg7YisrKWlbYl0ub25FcnJvcihhKTtkLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7ZSgpfSkpfSxcbmZ1bmN0aW9uKGEpe3ZhciBiLGM7Yz1sLmdldFZhbHVlcygpO2ZvcihiPTA7YjxjLmxlbmd0aDtiKyspY1tiXS5vbkVycm9yKGEpO2Qub25FcnJvcihhKX0sZnVuY3Rpb24oKXtkLm9uQ29tcGxldGVkKCl9KSk7Zy5hZGQoYi5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7dmFyIGIsZSxrLGYsaTtrPWgrKztyLmFkZChrLGEpO2k9bmV3IHM7Zy5hZGQoaSk7ZT1mdW5jdGlvbigpe3IucmVtb3ZlKGspO2cucmVtb3ZlKGkpfTt0cnl7Yj1jKGEpfWNhdGNoKGope2Y9bC5nZXRWYWx1ZXMoKTtmb3IoYj0wO2I8Zi5sZW5ndGg7YisrKWZbYl0ub25FcnJvcihqKTtkLm9uRXJyb3Ioaik7cmV0dXJufWkuZGlzcG9zYWJsZShiLnRha2UoMSkuc3Vic2NyaWJlKGZ1bmN0aW9uKCl7fSxmdW5jdGlvbihhKXt2YXIgYjtmPWwuZ2V0VmFsdWVzKCk7Zm9yKGI9MDtiPGYubGVuZ3RoO2IrKylmW2JdLm9uRXJyb3IoYSk7ZC5vbkVycm9yKGEpfSxmdW5jdGlvbigpe2UoKX0pKTtmPWwuZ2V0VmFsdWVzKCk7Zm9yKGI9XG4wO2I8Zi5sZW5ndGg7YisrKWZbYl0ub25OZXh0KGEpfSxmdW5jdGlvbihiKXt2YXIgYSxjO2M9bC5nZXRWYWx1ZXMoKTtmb3IoYT0wO2E8Yy5sZW5ndGg7YSsrKWNbYV0ub25FcnJvcihiKTtkLm9uRXJyb3IoYil9KSk7cmV0dXJuIGp9KX07Zi5idWZmZXI9ZnVuY3Rpb24oYixhKXtyZXR1cm5cImZ1bmN0aW9uXCI9PT10eXBlb2YgYj9JKGIpLnNlbGVjdE1hbnkoZnVuY3Rpb24oYSl7cmV0dXJuIG9ic2VydmFibGVUb0FycmF5KGEpfSk6Sih0aGlzLGIsYSkuc2VsZWN0TWFueShmdW5jdGlvbihhKXtyZXR1cm4gb2JzZXJ2YWJsZVRvQXJyYXkoYSl9KX07Zi53aW5kb3c9ZnVuY3Rpb24oYixhKXtyZXR1cm5cImZ1bmN0aW9uXCI9PT10eXBlb2YgYj9JLmNhbGwodGhpcyxiKTpKLmNhbGwodGhpcyxiLGEpfTt2YXIgSj1mdW5jdGlvbihiLGEpe3JldHVybiBiLmdyb3VwSm9pbih0aGlzLGEsZnVuY3Rpb24oKXtyZXR1cm4gTCgpfSxmdW5jdGlvbihhLGIpe3JldHVybiBifSl9LEk9ZnVuY3Rpb24oYil7dmFyIGE9XG50aGlzO3JldHVybiB2KGZ1bmN0aW9uKGMpe3ZhciBmLGU9bmV3IEssZD1uZXcgdShlKSxnPW5ldyBFKGQpLGo9bmV3IEE7Yy5vbk5leHQoQihqLGcpKTtkLmFkZChhLnN1YnNjcmliZShmdW5jdGlvbihhKXtqLm9uTmV4dChhKX0sZnVuY3Rpb24oYSl7ai5vbkVycm9yKGEpO2Mub25FcnJvcihhKX0sZnVuY3Rpb24oKXtqLm9uQ29tcGxldGVkKCk7Yy5vbkNvbXBsZXRlZCgpfSkpO2Y9ZnVuY3Rpb24oKXt2YXIgYSxkO3RyeXtkPWIoKX1jYXRjaChoKXtjLm9uRXJyb3IoaCk7cmV0dXJufWE9bmV3IHM7ZS5kaXNwb3NhYmxlKGEpO2EuZGlzcG9zYWJsZShkLnRha2UoMSkuc3Vic2NyaWJlKE4sZnVuY3Rpb24oYSl7ai5vbkVycm9yKGEpO2Mub25FcnJvcihhKX0sZnVuY3Rpb24oKXtqLm9uQ29tcGxldGVkKCk7aj1uZXcgQTtjLm9uTmV4dChCKGosZykpO2YoKX0pKX07ZigpO3JldHVybiBnfSl9fTtcbiIsIi8qXG4gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uICBBbGwgcmlnaHRzIHJlc2VydmVkLlxuIFRoaXMgY29kZSBpcyBsaWNlbnNlZCBieSBNaWNyb3NvZnQgQ29ycG9yYXRpb24gdW5kZXIgdGhlIHRlcm1zXG4gb2YgdGhlIE1JQ1JPU09GVCBSRUFDVElWRSBFWFRFTlNJT05TIEZPUiBKQVZBU0NSSVBUIEFORCAuTkVUIExJQlJBUklFUyBMaWNlbnNlLlxuIFNlZSBodHRwOi8vZ28ubWljcm9zb2Z0LmNvbS9md2xpbmsvP0xpbmtJRD0yMjA3NjIuXG4qL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihrLGgpe3ZhciBpO2k9ay5SeDt2YXIgdz1BcnJheS5wcm90b3R5cGUuc2xpY2UseD1PYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LHk9ZnVuY3Rpb24oYixhKXtmdW5jdGlvbiBjKCl7dGhpcy5jb25zdHJ1Y3Rvcj1ifWZvcih2YXIgZiBpbiBhKXguY2FsbChhLGYpJiYoYltmXT1hW2ZdKTtjLnByb3RvdHlwZT1hLnByb3RvdHlwZTtiLnByb3RvdHlwZT1uZXcgYztiLmJhc2U9YS5wcm90b3R5cGU7cmV0dXJuIGJ9LGw9aS5PYnNlcnZhYmxlLHA9bC5wcm90b3R5cGUsej1sLmNyZWF0ZVdpdGhEaXNwb3NhYmxlLEE9bC50aHJvd0V4Y2VwdGlvbixCPWkuT2JzZXJ2ZXIuY3JlYXRlLHE9aS5JbnRlcm5hbHMuTGlzdCxDPWkuU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUsRD1pLkNvbXBvc2l0ZURpc3Bvc2FibGUsXG5FPWkuSW50ZXJuYWxzLkFic3RyYWN0T2JzZXJ2ZXIsRj1mdW5jdGlvbihiLGEpe3JldHVybiBiPT09YX0sbyxyLGoscyxtLG47aj1bMSwzLDcsMTMsMzEsNjEsMTI3LDI1MSw1MDksMTAyMSwyMDM5LDQwOTMsODE5MSwxNjM4MSwzMjc0OSw2NTUyMSwxMzEwNzEsMjYyMTM5LDUyNDI4NywxMDQ4NTczLDIwOTcxNDMsNDE5NDMwMSw4Mzg4NTkzLDE2Nzc3MjEzLDMzNTU0MzkzLDY3MTA4ODU5LDEzNDIxNzY4OSwyNjg0MzUzOTksNTM2ODcwOTA5LDEwNzM3NDE3ODksMjE0NzQ4MzY0N107cj1mdW5jdGlvbihiKXt2YXIgYSxjO2lmKGImMClyZXR1cm4gMj09PWI7YT1NYXRoLnNxcnQoYik7Zm9yKGM9MztjPD1hOyl7aWYoMD09PWIlYylyZXR1cm4hMTtjKz0yfXJldHVybiEwfTtvPWZ1bmN0aW9uKGIpe3ZhciBhLGM7Zm9yKGE9MDthPGoubGVuZ3RoOysrYSlpZihjPWpbYV0sYz49YilyZXR1cm4gYztmb3IoYT1ifDE7YTxqW2oubGVuZ3RoLTFdOyl7aWYocihhKSlyZXR1cm4gYTthKz0yfXJldHVybiBifTtcbnM9MDttPWZ1bmN0aW9uKGIpe3ZhciBhO2lmKGI9PT1oKXRocm93XCJubyBzdWNoIGtleVwiO2lmKGIuZ2V0SGFzaENvZGUhPT1oKXJldHVybiBiLmdldEhhc2hDb2RlKCk7YT0xNypzKys7Yi5nZXRIYXNoQ29kZT1mdW5jdGlvbigpe3JldHVybiBhfTtyZXR1cm4gYX07bj1mdW5jdGlvbigpe3JldHVybntrZXk6bnVsbCx2YWx1ZTpudWxsLG5leHQ6MCxoYXNoQ29kZTowfX07dmFyIHQ9ZnVuY3Rpb24oKXtmdW5jdGlvbiBiKGEsYyl7dGhpcy5faW5pdGlhbGl6ZShhKTt0aGlzLmNvbXBhcmVyPWN8fEY7dGhpcy5zaXplPXRoaXMuZnJlZUNvdW50PTA7dGhpcy5mcmVlTGlzdD0tMX1iLnByb3RvdHlwZS5faW5pdGlhbGl6ZT1mdW5jdGlvbihhKXt2YXIgYT1vKGEpLGM7dGhpcy5idWNrZXRzPUFycmF5KGEpO3RoaXMuZW50cmllcz1BcnJheShhKTtmb3IoYz0wO2M8YTtjKyspdGhpcy5idWNrZXRzW2NdPS0xLHRoaXMuZW50cmllc1tjXT1uKCk7dGhpcy5mcmVlTGlzdD0tMX07Yi5wcm90b3R5cGUuY291bnQ9XG5mdW5jdGlvbigpe3JldHVybiB0aGlzLnNpemV9O2IucHJvdG90eXBlLmFkZD1mdW5jdGlvbihhLGMpe3JldHVybiB0aGlzLl9pbnNlcnQoYSxjLCEwKX07Yi5wcm90b3R5cGUuX2luc2VydD1mdW5jdGlvbihhLGMsYil7dmFyIGQsZSxnO3RoaXMuYnVja2V0cz09PWgmJnRoaXMuX2luaXRpYWxpemUoMCk7Zz1tKGEpJjIxNDc0ODM2NDc7ZD1nJXRoaXMuYnVja2V0cy5sZW5ndGg7Zm9yKGU9dGhpcy5idWNrZXRzW2RdOzA8PWU7ZT10aGlzLmVudHJpZXNbZV0ubmV4dClpZih0aGlzLmVudHJpZXNbZV0uaGFzaENvZGU9PT1nJiZ0aGlzLmNvbXBhcmVyKHRoaXMuZW50cmllc1tlXS5rZXksYSkpe2lmKGIpdGhyb3dcImR1cGxpY2F0ZSBrZXlcIjt0aGlzLmVudHJpZXNbZV0udmFsdWU9YztyZXR1cm59MDx0aGlzLmZyZWVDb3VudD8oYj10aGlzLmZyZWVMaXN0LHRoaXMuZnJlZUxpc3Q9dGhpcy5lbnRyaWVzW2JdLm5leHQsLS10aGlzLmZyZWVDb3VudCk6KHRoaXMuc2l6ZT09PXRoaXMuZW50cmllcy5sZW5ndGgmJlxuKHRoaXMuX3Jlc2l6ZSgpLGQ9ZyV0aGlzLmJ1Y2tldHMubGVuZ3RoKSxiPXRoaXMuc2l6ZSwrK3RoaXMuc2l6ZSk7dGhpcy5lbnRyaWVzW2JdLmhhc2hDb2RlPWc7dGhpcy5lbnRyaWVzW2JdLm5leHQ9dGhpcy5idWNrZXRzW2RdO3RoaXMuZW50cmllc1tiXS5rZXk9YTt0aGlzLmVudHJpZXNbYl0udmFsdWU9Yzt0aGlzLmJ1Y2tldHNbZF09Yn07Yi5wcm90b3R5cGUuX3Jlc2l6ZT1mdW5jdGlvbigpe3ZhciBhLGMsYixkLGU7ZT1vKDIqdGhpcy5zaXplKTtiPUFycmF5KGUpO2ZvcihhPTA7YTxiLmxlbmd0aDsrK2EpYlthXT0tMTtkPUFycmF5KGUpO2ZvcihhPTA7YTx0aGlzLnNpemU7KythKWRbYV09dGhpcy5lbnRyaWVzW2FdO2ZvcihhPXRoaXMuc2l6ZTthPGU7KythKWRbYV09bigpO2ZvcihhPTA7YTx0aGlzLnNpemU7KythKWM9ZFthXS5oYXNoQ29kZSVlLGRbYV0ubmV4dD1iW2NdLGJbY109YTt0aGlzLmJ1Y2tldHM9Yjt0aGlzLmVudHJpZXM9ZH07Yi5wcm90b3R5cGUucmVtb3ZlPVxuZnVuY3Rpb24oYSl7dmFyIGMsYixkLGU7aWYodGhpcy5idWNrZXRzIT09aCl7ZT1tKGEpJjIxNDc0ODM2NDc7Yz1lJXRoaXMuYnVja2V0cy5sZW5ndGg7Yj0tMTtmb3IoZD10aGlzLmJ1Y2tldHNbY107MDw9ZDtkPXRoaXMuZW50cmllc1tkXS5uZXh0KXtpZih0aGlzLmVudHJpZXNbZF0uaGFzaENvZGU9PT1lJiZ0aGlzLmNvbXBhcmVyKHRoaXMuZW50cmllc1tkXS5rZXksYSkpcmV0dXJuIDA+Yj90aGlzLmJ1Y2tldHNbY109dGhpcy5lbnRyaWVzW2RdLm5leHQ6dGhpcy5lbnRyaWVzW2JdLm5leHQ9dGhpcy5lbnRyaWVzW2RdLm5leHQsdGhpcy5lbnRyaWVzW2RdLmhhc2hDb2RlPS0xLHRoaXMuZW50cmllc1tkXS5uZXh0PXRoaXMuZnJlZUxpc3QsdGhpcy5lbnRyaWVzW2RdLmtleT1udWxsLHRoaXMuZW50cmllc1tkXS52YWx1ZT1udWxsLHRoaXMuZnJlZUxpc3Q9ZCwrK3RoaXMuZnJlZUNvdW50LCEwO2I9ZH19cmV0dXJuITF9O2IucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dmFyIGE7XG5pZighKDA+PXRoaXMuc2l6ZSkpe2ZvcihhPTA7YTx0aGlzLmJ1Y2tldHMubGVuZ3RoOysrYSl0aGlzLmJ1Y2tldHNbYV09LTE7Zm9yKGE9MDthPHRoaXMuc2l6ZTsrK2EpdGhpcy5lbnRyaWVzW2FdPW4oKTt0aGlzLmZyZWVMaXN0PS0xO3RoaXMuc2l6ZT0wfX07Yi5wcm90b3R5cGUuX2ZpbmRFbnRyeT1mdW5jdGlvbihhKXt2YXIgYyxiO2lmKHRoaXMuYnVja2V0cyE9PWgpe2I9bShhKSYyMTQ3NDgzNjQ3O2ZvcihjPXRoaXMuYnVja2V0c1tiJXRoaXMuYnVja2V0cy5sZW5ndGhdOzA8PWM7Yz10aGlzLmVudHJpZXNbY10ubmV4dClpZih0aGlzLmVudHJpZXNbY10uaGFzaENvZGU9PT1iJiZ0aGlzLmNvbXBhcmVyKHRoaXMuZW50cmllc1tjXS5rZXksYSkpcmV0dXJuIGN9cmV0dXJuLTF9O2IucHJvdG90eXBlLmNvdW50PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2l6ZS10aGlzLmZyZWVDb3VudH07Yi5wcm90b3R5cGUudHJ5R2V0RW50cnk9ZnVuY3Rpb24oYSl7YT10aGlzLl9maW5kRW50cnkoYSk7XG5yZXR1cm4gMDw9YT97a2V5OnRoaXMuZW50cmllc1thXS5rZXksdmFsdWU6dGhpcy5lbnRyaWVzW2FdLnZhbHVlfTpofTtiLnByb3RvdHlwZS5nZXRWYWx1ZXM9ZnVuY3Rpb24oKXt2YXIgYT0wLGMsYj1bXTtpZih0aGlzLmVudHJpZXMhPT1oKWZvcihjPTA7Yzx0aGlzLnNpemU7YysrKWlmKDA8PXRoaXMuZW50cmllc1tjXS5oYXNoQ29kZSliW2ErK109dGhpcy5lbnRyaWVzW2NdLnZhbHVlO3JldHVybiBifTtiLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24oYSl7YT10aGlzLl9maW5kRW50cnkoYSk7aWYoMDw9YSlyZXR1cm4gdGhpcy5lbnRyaWVzW2FdLnZhbHVlO3Rocm93IEVycm9yKFwibm8gc3VjaCBrZXlcIik7fTtiLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24oYSxiKXt0aGlzLl9pbnNlcnQoYSxiLCExKX07Yi5wcm90b3R5cGUuY29udGFpbnNrZXk9ZnVuY3Rpb24oYSl7cmV0dXJuIDA8PXRoaXMuX2ZpbmRFbnRyeShhKX07cmV0dXJuIGJ9KCksdT1mdW5jdGlvbigpe2Z1bmN0aW9uIGIoYSl7dGhpcy5wYXR0ZXJucz1cbmF9Yi5wcm90b3R5cGUuYW5kPWZ1bmN0aW9uKGEpe3ZhciBjPXRoaXMucGF0dGVybnMsZixkO2Q9W107Zm9yKGY9MDtmPGMubGVuZ3RoO2YrKylkLnB1c2goY1tmXSk7ZC5wdXNoKGEpO3JldHVybiBuZXcgYihkKX07Yi5wcm90b3R5cGUudGhlbj1mdW5jdGlvbihhKXtyZXR1cm4gbmV3IEcodGhpcyxhKX07cmV0dXJuIGJ9KCksRz1mdW5jdGlvbigpe2Z1bmN0aW9uIGIoYSxiKXt0aGlzLmV4cHJlc3Npb249YTt0aGlzLnNlbGVjdG9yPWJ9Yi5wcm90b3R5cGUuYWN0aXZhdGU9ZnVuY3Rpb24oYSxiLGYpe3ZhciBkLGUsZyxoO2g9dGhpcztnPVtdO2ZvcihlPTA7ZTx0aGlzLmV4cHJlc3Npb24ucGF0dGVybnMubGVuZ3RoO2UrKylnLnB1c2goSChhLHRoaXMuZXhwcmVzc2lvbi5wYXR0ZXJuc1tlXSxmdW5jdGlvbihhKXtiLm9uRXJyb3IoYSl9KSk7ZD1uZXcgdihnLGZ1bmN0aW9uKCl7dmFyIGE7dHJ5e2E9aC5zZWxlY3Rvci5hcHBseShoLGFyZ3VtZW50cyl9Y2F0Y2goZCl7Yi5vbkVycm9yKGQpO1xucmV0dXJufWIub25OZXh0KGEpfSxmdW5jdGlvbigpe3ZhciBhO2ZvcihhPTA7YTxnLmxlbmd0aDthKyspZ1thXS5yZW1vdmVBY3RpdmVQbGFuKGQpO2YoZCl9KTtmb3IoZT0wO2U8Zy5sZW5ndGg7ZSsrKWdbZV0uYWRkQWN0aXZlUGxhbihkKTtyZXR1cm4gZH07cmV0dXJuIGJ9KCksSD1mdW5jdGlvbihiLGEsYyl7dmFyIGY7Zj1iLnRyeUdldEVudHJ5KGEpO3JldHVybiBmPT09aD8oYz1uZXcgSShhLGMpLGIuYWRkKGEsYyksYyk6Zi52YWx1ZX0sdjt2PWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYihhLGIsZil7dGhpcy5qb2luT2JzZXJ2ZXJBcnJheT1hO3RoaXMub25OZXh0PWI7dGhpcy5vbkNvbXBsZXRlZD1mO3RoaXMuam9pbk9ic2VydmVycz1uZXcgdDtmb3IoYT0wO2E8dGhpcy5qb2luT2JzZXJ2ZXJBcnJheS5sZW5ndGg7YSsrKWI9dGhpcy5qb2luT2JzZXJ2ZXJBcnJheVthXSx0aGlzLmpvaW5PYnNlcnZlcnMuYWRkKGIsYil9Yi5wcm90b3R5cGUuZGVxdWV1ZT1mdW5jdGlvbigpe3ZhciBhLFxuYjtiPXRoaXMuam9pbk9ic2VydmVycy5nZXRWYWx1ZXMoKTtmb3IoYT0wO2E8Yi5sZW5ndGg7YSsrKWJbYV0ucXVldWUuc2hpZnQoKX07Yi5wcm90b3R5cGUubWF0Y2g9ZnVuY3Rpb24oKXt2YXIgYSxiLGY7YT0hMDtmb3IoYj0wO2I8dGhpcy5qb2luT2JzZXJ2ZXJBcnJheS5sZW5ndGg7YisrKWlmKDA9PT10aGlzLmpvaW5PYnNlcnZlckFycmF5W2JdLnF1ZXVlLmxlbmd0aCl7YT0hMTticmVha31pZihhKXthPVtdO2Y9ITE7Zm9yKGI9MDtiPHRoaXMuam9pbk9ic2VydmVyQXJyYXkubGVuZ3RoO2IrKylhLnB1c2godGhpcy5qb2luT2JzZXJ2ZXJBcnJheVtiXS5xdWV1ZVswXSksXCJDXCI9PT10aGlzLmpvaW5PYnNlcnZlckFycmF5W2JdLnF1ZXVlWzBdLmtpbmQmJihmPSEwKTtpZihmKXRoaXMub25Db21wbGV0ZWQoKTtlbHNle3RoaXMuZGVxdWV1ZSgpO2Y9W107Zm9yKGI9MDtiPGEubGVuZ3RoO2IrKylmLnB1c2goYVtiXS52YWx1ZSk7dGhpcy5vbk5leHQuYXBwbHkodGhpcyxmKX19fTtcbnJldHVybiBifSgpO3ZhciBJPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gYihhLGIpe3RoaXMuc291cmNlPWE7dGhpcy5vbkVycm9yPWI7dGhpcy5xdWV1ZT1bXTt0aGlzLmFjdGl2ZVBsYW5zPW5ldyBxO3RoaXMuc3Vic2NyaXB0aW9uPW5ldyBDO3RoaXMuaXNEaXNwb3NlZD0hMX15KGIsRSk7Yi5wcm90b3R5cGUuYWRkQWN0aXZlUGxhbj1mdW5jdGlvbihhKXt0aGlzLmFjdGl2ZVBsYW5zLmFkZChhKX07Yi5wcm90b3R5cGUuc3Vic2NyaWJlPWZ1bmN0aW9uKCl7dGhpcy5zdWJzY3JpcHRpb24uZGlzcG9zYWJsZSh0aGlzLnNvdXJjZS5tYXRlcmlhbGl6ZSgpLnN1YnNjcmliZSh0aGlzKSl9O2IucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oYSl7dmFyIGI7aWYoIXRoaXMuaXNEaXNwb3NlZClpZihcIkVcIj09PWEua2luZCl0aGlzLm9uRXJyb3IoYS5leGNlcHRpb24pO2Vsc2V7dGhpcy5xdWV1ZS5wdXNoKGEpO2E9dGhpcy5hY3RpdmVQbGFucy50b0FycmF5KCk7Zm9yKGI9MDtiPGEubGVuZ3RoO2IrKylhW2JdLm1hdGNoKCl9fTtcbmIucHJvdG90eXBlLmVycm9yPWZ1bmN0aW9uKCl7fTtiLnByb3RvdHlwZS5jb21wbGV0ZWQ9ZnVuY3Rpb24oKXt9O2IucHJvdG90eXBlLnJlbW92ZUFjdGl2ZVBsYW49ZnVuY3Rpb24oYSl7dGhpcy5hY3RpdmVQbGFucy5yZW1vdmUoYSk7MD09PXRoaXMuYWN0aXZlUGxhbnMuY291bnQoKSYmdGhpcy5kaXNwb3NlKCl9O2IucHJvdG90eXBlLmRpc3Bvc2U9ZnVuY3Rpb24oKXtiLmJhc2UuZGlzcG9zZS5jYWxsKHRoaXMpO2lmKCF0aGlzLmlzRGlzcG9zZWQpdGhpcy5pc0Rpc3Bvc2VkPSEwLHRoaXMuc3Vic2NyaXB0aW9uLmRpc3Bvc2UoKX07cmV0dXJuIGJ9KCk7cC5hbmQ9ZnVuY3Rpb24oYil7cmV0dXJuIG5ldyB1KFt0aGlzLGJdKX07cC50aGVuPWZ1bmN0aW9uKGIpe3JldHVybihuZXcgdShbdGhpc10pKS50aGVuKGIpfTtsLndoZW49ZnVuY3Rpb24oKXt2YXIgYj0xPT09YXJndW1lbnRzLmxlbmd0aCYmYXJndW1lbnRzWzBdaW5zdGFuY2VvZiBBcnJheT9hcmd1bWVudHNbMF06dy5jYWxsKGFyZ3VtZW50cyk7XG5yZXR1cm4geihmdW5jdGlvbihhKXt2YXIgYz1uZXcgcSxmPW5ldyB0LGQsZSxnLGgsaTtpPUIoZnVuY3Rpb24oYil7YS5vbk5leHQoYil9LGZ1bmN0aW9uKGIpe2Zvcih2YXIgYz1mLmdldFZhbHVlcygpLGQ9MDtkPGMubGVuZ3RoO2QrKyljW2RdLm9uRXJyb3IoYik7YS5vbkVycm9yKGIpfSxmdW5jdGlvbigpe2Eub25Db21wbGV0ZWQoKX0pO3RyeXtmb3IoZT0wO2U8Yi5sZW5ndGg7ZSsrKWMuYWRkKGJbZV0uYWN0aXZhdGUoZixpLGZ1bmN0aW9uKGEpe2MucmVtb3ZlKGEpO2lmKDA9PT1jLmNvdW50KCkpaS5vbkNvbXBsZXRlZCgpfSkpfWNhdGNoKGope0Eoaikuc3Vic2NyaWJlKGEpfWQ9bmV3IEQ7aD1mLmdldFZhbHVlcygpO2ZvcihlPTA7ZTxoLmxlbmd0aDtlKyspZz1oW2VdLGcuc3Vic2NyaWJlKCksZC5hZGQoZyk7cmV0dXJuIGR9KX19O1xuIiwiLypcbiBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gVGhpcyBjb2RlIGlzIGxpY2Vuc2VkIGJ5IE1pY3Jvc29mdCBDb3Jwb3JhdGlvbiB1bmRlciB0aGUgdGVybXNcbiBvZiB0aGUgTUlDUk9TT0ZUIFJFQUNUSVZFIEVYVEVOU0lPTlMgRk9SIEpBVkFTQ1JJUFQgQU5EIC5ORVQgTElCUkFSSUVTIExpY2Vuc2UuXG4gU2VlIGh0dHA6Ly9nby5taWNyb3NvZnQuY29tL2Z3bGluay8/TGlua0lEPTIyMDc2Mi5cbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHcsbil7dmFyIHA7cD13LlJ4O3ZhciBxPXAuT2JzZXJ2YWJsZSxvPXEucHJvdG90eXBlLG09cS5jcmVhdGVXaXRoRGlzcG9zYWJsZSx5PXEuZGVmZXIsRj1xLnRocm93RXhjZXB0aW9uLGw9cC5TY2hlZHVsZXIuVGltZW91dCxyPXAuU2luZ2xlQXNzaWdubWVudERpc3Bvc2FibGUsdD1wLlNlcmlhbERpc3Bvc2FibGUscz1wLkNvbXBvc2l0ZURpc3Bvc2FibGUsej1wLlJlZkNvdW50RGlzcG9zYWJsZSx1PXAuU3ViamVjdCxHPXAuSW50ZXJuYWxzLkJpbmFyeU9ic2VydmVyLHY9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gbShmdW5jdGlvbihjKXtyZXR1cm4gbmV3IHMoYi5nZXREaXNwb3NhYmxlKCksYS5zdWJzY3JpYmUoYykpfSl9LEg9ZnVuY3Rpb24oYSxiLGMpe3JldHVybiBtKGZ1bmN0aW9uKGQpe3ZhciBmPVxubmV3IHIsZT1uZXcgcixkPWMoZCxmLGUpO2YuZGlzcG9zYWJsZShhLm1hdGVyaWFsaXplKCkuc2VsZWN0KGZ1bmN0aW9uKGIpe3JldHVybntzd2l0Y2hWYWx1ZTpmdW5jdGlvbihjKXtyZXR1cm4gYyhiKX19fSkuc3Vic2NyaWJlKGQpKTtlLmRpc3Bvc2FibGUoYi5tYXRlcmlhbGl6ZSgpLnNlbGVjdChmdW5jdGlvbihiKXtyZXR1cm57c3dpdGNoVmFsdWU6ZnVuY3Rpb24oYyxhKXtyZXR1cm4gYShiKX19fSkuc3Vic2NyaWJlKGQpKTtyZXR1cm4gbmV3IHMoZixlKX0pfSxJPWZ1bmN0aW9uKGEsYil7cmV0dXJuIG0oZnVuY3Rpb24oYyl7cmV0dXJuIGIuc2NoZWR1bGVXaXRoQWJzb2x1dGUoYSxmdW5jdGlvbigpe2Mub25OZXh0KDApO2Mub25Db21wbGV0ZWQoKX0pfSl9LEE9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPTA+Yj8wOmI7cmV0dXJuIG0oZnVuY3Rpb24oYil7dmFyIGU9MCxnPWE7cmV0dXJuIGMuc2NoZWR1bGVSZWN1cnNpdmVXaXRoQWJzb2x1dGUoZyxmdW5jdGlvbihhKXt2YXIgaTtcbjA8ZCYmKGk9Yy5ub3coKSxnKz1kLGc8PWkmJihnPWkrZCkpO2Iub25OZXh0KGUrKyk7YShnKX0pfSl9LEo9ZnVuY3Rpb24oYSxiKXt2YXIgYz0wPmE/MDphO3JldHVybiBtKGZ1bmN0aW9uKGEpe3JldHVybiBiLnNjaGVkdWxlV2l0aFJlbGF0aXZlKGMsZnVuY3Rpb24oKXthLm9uTmV4dCgwKTthLm9uQ29tcGxldGVkKCl9KX0pfSxCPWZ1bmN0aW9uKGEsYixjKXtyZXR1cm4geShmdW5jdGlvbigpe3JldHVybiBBKGMubm93KCkrYSxiLGMpfSl9LEs9cS5pbnRlcnZhbD1mdW5jdGlvbihhLGIpe2J8fChiPWwpO3JldHVybiBCKGEsYSxiKX07cS50aW1lcj1mdW5jdGlvbihhLGIsYyl7dmFyIGQ7Y3x8KGM9bCk7YiE9PW4mJlwibnVtYmVyXCI9PT10eXBlb2YgYj9kPWI6YiE9PW4mJlwib2JqZWN0XCI9PT10eXBlb2YgYiYmKGM9Yik7cmV0dXJuIGEgaW5zdGFuY2VvZiBEYXRlJiZkPT09bj9JKGEuZ2V0VGltZSgpLGMpOmEgaW5zdGFuY2VvZiBEYXRlJiZkIT09bj9BKGEuZ2V0VGltZSgpLGIsYyk6XG5kPT09bj9KKGEsYyk6QihhLGQsYyl9O3ZhciBEPWZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gbShmdW5jdGlvbihkKXt2YXIgZj0hMSxlPW5ldyB0LGc9bnVsbCxoPVtdLGk9ITEsajtqPWEubWF0ZXJpYWxpemUoKS50aW1lc3RhbXAoYykuc3Vic2NyaWJlKGZ1bmN0aW9uKGEpe1wiRVwiPT09YS52YWx1ZS5raW5kPyhoPVtdLGgucHVzaChhKSxnPWEudmFsdWUuZXhjZXB0aW9uLGE9IWkpOihoLnB1c2goe3ZhbHVlOmEudmFsdWUsdGltZXN0YW1wOmEudGltZXN0YW1wK2J9KSxhPSFmLGY9ITApO2lmKGEpaWYobnVsbCE9PWcpZC5vbkVycm9yKGcpO2Vsc2UgYT1uZXcgcixlLmRpc3Bvc2FibGUoYSksYS5kaXNwb3NhYmxlKGMuc2NoZWR1bGVSZWN1cnNpdmVXaXRoUmVsYXRpdmUoYixmdW5jdGlvbihhKXt2YXIgYixlLGo7aWYobnVsbD09PWcpe2k9ITA7ZG97Yj1udWxsO2lmKDA8aC5sZW5ndGgmJjA+PWhbMF0udGltZXN0YW1wLWMubm93KCkpYj1oLnNoaWZ0KCkudmFsdWU7bnVsbCE9PWImJlxuYi5hY2NlcHQoZCl9d2hpbGUobnVsbCE9PWIpO2o9ITE7ZT0wOzA8aC5sZW5ndGg/KGo9ITAsZT1NYXRoLm1heCgwLGhbMF0udGltZXN0YW1wLWMubm93KCkpKTpmPSExO2I9ZztpPSExO2lmKG51bGwhPT1iKWQub25FcnJvcihiKTtlbHNlIGomJmEoZSl9fSkpfSk7cmV0dXJuIG5ldyBzKGosZSl9KX0sTD1mdW5jdGlvbihhLGIsYyl7cmV0dXJuIHkoZnVuY3Rpb24oKXt2YXIgYT1iLWMubm93KCk7cmV0dXJuIEQoYSxjKX0pfTtvLmRlbGF5PWZ1bmN0aW9uKGEsYil7Ynx8KGI9bCk7cmV0dXJuIGEgaW5zdGFuY2VvZiBEYXRlP0wodGhpcyxhLmdldFRpbWUoKSxiKTpEKHRoaXMsYSxiKX07by50aHJvdHRsZT1mdW5jdGlvbihhLGIpe2J8fChiPWwpO3ZhciBjPXRoaXM7cmV0dXJuIG0oZnVuY3Rpb24oZCl7dmFyIGY9bmV3IHQsZT0hMSxnPTAsaCxpPW51bGw7aD1jLnN1YnNjcmliZShmdW5jdGlvbihjKXt2YXIgaztlPSEwO2k9YztnKys7az1nO2M9bmV3IHI7Zi5kaXNwb3NhYmxlKGMpO1xuYy5kaXNwb3NhYmxlKGIuc2NoZWR1bGVXaXRoUmVsYXRpdmUoYSxmdW5jdGlvbigpe2lmKGUmJmc9PT1rKWQub25OZXh0KGkpO2U9ITF9KSl9LGZ1bmN0aW9uKGEpe2YuZGlzcG9zZSgpO2Qub25FcnJvcihhKTtlPSExO2crK30sZnVuY3Rpb24oKXtmLmRpc3Bvc2UoKTtpZihlKWQub25OZXh0KGkpO2Qub25Db21wbGV0ZWQoKTtlPSExO2crK30pO3JldHVybiBuZXcgcyhoLGYpfSl9O28ud2luZG93V2l0aFRpbWU9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMsZjtiPT09biYmKGY9YSk7Yz09PW4mJihjPWwpO1wibnVtYmVyXCI9PT10eXBlb2YgYj9mPWI6XCJvYmplY3RcIj09PXR5cGVvZiBiJiYoZj1hLGM9Yik7cmV0dXJuIG0oZnVuY3Rpb24oYil7dmFyIGcsaCxpPWYsaj1hLGs9W10seCxDPW5ldyB0LGw9MDtoPW5ldyBzKEMpO3g9bmV3IHooaCk7Zz1mdW5jdGlvbigpe3ZhciBhLGQsaCxtLG47aD1uZXcgcjtDLmRpc3Bvc2FibGUoaCk7YT1kPSExO2o9PT1pP2E9ZD0hMDpqPGk/ZD0hMDpcbmE9ITA7bT1kP2o6aTtuPW0tbDtsPW07ZCYmKGorPWYpO2EmJihpKz1mKTtoLmRpc3Bvc2FibGUoYy5zY2hlZHVsZVdpdGhSZWxhdGl2ZShuLGZ1bmN0aW9uKCl7dmFyIGM7YSYmKGM9bmV3IHUsay5wdXNoKGMpLGIub25OZXh0KHYoYyx4KSkpO2QmJihjPWsuc2hpZnQoKSxjLm9uQ29tcGxldGVkKCkpO2coKX0pKX07ay5wdXNoKG5ldyB1KTtiLm9uTmV4dCh2KGtbMF0seCkpO2coKTtoLmFkZChkLnN1YnNjcmliZShmdW5jdGlvbihhKXt2YXIgYixjO2ZvcihiPTA7YjxrLmxlbmd0aDtiKyspYz1rW2JdLGMub25OZXh0KGEpfSxmdW5jdGlvbihhKXt2YXIgYyxkO2ZvcihjPTA7YzxrLmxlbmd0aDtjKyspZD1rW2NdLGQub25FcnJvcihhKTtiLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7dmFyIGEsYztmb3IoYT0wO2E8ay5sZW5ndGg7YSsrKWM9a1thXSxjLm9uQ29tcGxldGVkKCk7Yi5vbkNvbXBsZXRlZCgpfSkpO3JldHVybiB4fSl9O28ud2luZG93V2l0aFRpbWVPckNvdW50PWZ1bmN0aW9uKGEsXG5iLGMpe3ZhciBkPXRoaXM7Y3x8KGM9bCk7cmV0dXJuIG0oZnVuY3Rpb24oZil7dmFyIGUsZyxoPTAsaSxqLGs9bmV3IHQsbD0wO2c9bmV3IHMoayk7aT1uZXcgeihnKTtlPWZ1bmN0aW9uKGIpe3ZhciBkPW5ldyByO2suZGlzcG9zYWJsZShkKTtkLmRpc3Bvc2FibGUoYy5zY2hlZHVsZVdpdGhSZWxhdGl2ZShhLGZ1bmN0aW9uKCl7dmFyIGE7Yj09PWwmJihoPTAsYT0rK2wsai5vbkNvbXBsZXRlZCgpLGo9bmV3IHUsZi5vbk5leHQodihqLGkpKSxlKGEpKX0pKX07aj1uZXcgdTtmLm9uTmV4dCh2KGosaSkpO2UoMCk7Zy5hZGQoZC5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7dmFyIGM9MCxkPSExO2oub25OZXh0KGEpO2grKztoPT09YiYmKGQ9ITAsaD0wLGM9KytsLGoub25Db21wbGV0ZWQoKSxqPW5ldyB1LGYub25OZXh0KHYoaixpKSkpO2QmJmUoYyl9LGZ1bmN0aW9uKGEpe2oub25FcnJvcihhKTtmLm9uRXJyb3IoYSl9LGZ1bmN0aW9uKCl7ai5vbkNvbXBsZXRlZCgpO2Yub25Db21wbGV0ZWQoKX0pKTtcbnJldHVybiBpfSl9O28uYnVmZmVyV2l0aFRpbWU9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkO2I9PT1uJiYoZD1hKTtjfHwoYz1sKTtcIm51bWJlclwiPT09dHlwZW9mIGI/ZD1iOlwib2JqZWN0XCI9PT10eXBlb2YgYiYmKGQ9YSxjPWIpO3JldHVybiB0aGlzLndpbmRvd1dpdGhUaW1lKGEsZCxjKS5zZWxlY3RNYW55KGZ1bmN0aW9uKGEpe3JldHVybiBhLnRvQXJyYXkoKX0pfTtvLmJ1ZmZlcldpdGhUaW1lT3JDb3VudD1mdW5jdGlvbihhLGIsYyl7Y3x8KGM9bCk7cmV0dXJuIHRoaXMud2luZG93V2l0aFRpbWVPckNvdW50KGEsYixjKS5zZWxlY3RNYW55KGZ1bmN0aW9uKGEpe3JldHVybiBhLnRvQXJyYXkoKX0pfTtvLnRpbWVJbnRlcnZhbD1mdW5jdGlvbihhKXt2YXIgYj10aGlzO2F8fChhPWwpO3JldHVybiB5KGZ1bmN0aW9uKCl7dmFyIGM9YS5ub3coKTtyZXR1cm4gYi5zZWxlY3QoZnVuY3Rpb24oYil7dmFyIGY9YS5ub3coKSxlPWYtYztjPWY7cmV0dXJue3ZhbHVlOmIsaW50ZXJ2YWw6ZX19KX0pfTtcbm8udGltZXN0YW1wPWZ1bmN0aW9uKGEpe2F8fChhPWwpO3JldHVybiB0aGlzLnNlbGVjdChmdW5jdGlvbihiKXtyZXR1cm57dmFsdWU6Yix0aW1lc3RhbXA6YS5ub3coKX19KX07dmFyIEU9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gSChhLGIsZnVuY3Rpb24oYSl7dmFyIGI9ITEsZjtyZXR1cm4gbmV3IEcoZnVuY3Rpb24oZSl7XCJOXCI9PT1lLmtpbmQmJihmPWUpO1wiRVwiPT09ZS5raW5kJiZlLmFjY2VwdChhKTtcIkNcIj09PWUua2luZCYmKGI9ITApfSxmdW5jdGlvbigpe3ZhciBlPWY7Zj1uO2UhPT1uJiZlLmFjY2VwdChhKTtpZihiKWEub25Db21wbGV0ZWQoKX0pfSl9O28uc2FtcGxlPWZ1bmN0aW9uKGEsYil7Ynx8KGI9bCk7cmV0dXJuXCJudW1iZXJcIj09PXR5cGVvZiBhP0UodGhpcyxLKGEsYikpOkUodGhpcyxhKX07by50aW1lb3V0PWZ1bmN0aW9uKGEsYixjKXt2YXIgZCxmPXRoaXM7Yj09PW4mJihiPUYoRXJyb3IoXCJUaW1lb3V0XCIpKSk7Y3x8KGM9bCk7ZD1hIGluc3RhbmNlb2YgRGF0ZT9cbmZ1bmN0aW9uKGEsYil7Yy5zY2hlZHVsZVdpdGhBYnNvbHV0ZShhLGIpfTpmdW5jdGlvbihhLGIpe2Muc2NoZWR1bGVXaXRoUmVsYXRpdmUoYSxiKX07cmV0dXJuIG0oZnVuY3Rpb24oYyl7dmFyIGcsaD0wLGk9bmV3IHIsaj1uZXcgdCxrPSExLGw9bmV3IHQ7ai5kaXNwb3NhYmxlKGkpO2c9ZnVuY3Rpb24oKXt2YXIgZj1oO2wuZGlzcG9zYWJsZShkKGEsZnVuY3Rpb24oKXsoaz1oPT09ZikmJmouZGlzcG9zYWJsZShiLnN1YnNjcmliZShjKSl9KSl9O2coKTtpLmRpc3Bvc2FibGUoZi5zdWJzY3JpYmUoZnVuY3Rpb24oYSl7a3x8KGgrKyxjLm9uTmV4dChhKSxnKCkpfSxmdW5jdGlvbihhKXtrfHwoaCsrLGMub25FcnJvcihhKSl9LGZ1bmN0aW9uKCl7a3x8KGgrKyxjLm9uQ29tcGxldGVkKCkpfSkpO3JldHVybiBuZXcgcyhqLGwpfSl9O3EuZ2VuZXJhdGVXaXRoQWJzb2x1dGVUaW1lPWZ1bmN0aW9uKGEsYixjLGQsZixlKXtlfHwoZT1sKTtyZXR1cm4gbShmdW5jdGlvbihnKXt2YXIgaD1cbiEwLGk9ITEsaixrPWEsbDtyZXR1cm4gZS5zY2hlZHVsZVJlY3Vyc2l2ZVdpdGhBYnNvbHV0ZShlLm5vdygpLGZ1bmN0aW9uKGEpe2lmKGkpZy5vbk5leHQoaik7dHJ5e2lmKGg/aD0hMTprPWMoayksaT1iKGspKWo9ZChrKSxsPWYoayl9Y2F0Y2goZSl7Zy5vbkVycm9yKGUpO3JldHVybn1pZihpKWEobCk7ZWxzZSBnLm9uQ29tcGxldGVkKCl9KX0pfTtxLmdlbmVyYXRlV2l0aFJlbGF0aXZlVGltZT1mdW5jdGlvbihhLGIsYyxkLGYsZSl7ZXx8KGU9bCk7cmV0dXJuIG0oZnVuY3Rpb24oZyl7dmFyIGg9ITAsaT0hMSxqLGs9YSxsO3JldHVybiBlLnNjaGVkdWxlUmVjdXJzaXZlV2l0aFJlbGF0aXZlKDAsZnVuY3Rpb24oYSl7aWYoaSlnLm9uTmV4dChqKTt0cnl7aWYoaD9oPSExOms9YyhrKSxpPWIoaykpaj1kKGspLGw9ZihrKX1jYXRjaChlKXtnLm9uRXJyb3IoZSk7cmV0dXJufWlmKGkpYShsKTtlbHNlIGcub25Db21wbGV0ZWQoKX0pfSl9fTtcbiJdfQ==
;