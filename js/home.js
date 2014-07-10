'use strict';

function initPlugin() {
  function onPluginLoaded() {
    console.log("plugin loaded done");
  };

  var plugin = window.document.createElement('embed');
  plugin.style.cssText =
      ('position: absolute;' +
       'top: -99px' +
       'width: 0;' +
       'height: 0;');

  var pluginURL = '../plugin/pnacl/ssh_client.nmf';

  plugin.setAttribute('src', pluginURL);
  plugin.setAttribute('type', 'application/x-nacl');
  plugin.addEventListener('load', onPluginLoaded);
  plugin.addEventListener('message', onPluginMessage);
  plugin.addEventListener('crash', function (ev) {
    console.log('plugin crashed');
    self.exit(-1);
  });

  document.body.insertBefore(plugin, document.body.firstChild);
  return plugin;
};

function onPluginMessage(e) {
  console.log("OH great, there is message");
  var msg = JSON.parse(e.data);
  msg.argv = msg.arguments;

  if (msg.name in plugin_handler) {
    plugin_handler[msg.name].apply(this, msg.argv);
  } else {
    console.log('Unknown "' + desc + '" message: ' + msg.name);
  }
};

function sendToPlugin(plugin, name, args) {
  var str = JSON.stringify({name: name, arguments: args});

  console.log("#########post message##############");
  console.log(str);
  console.log("#########post message finished##############\n");
  
  plugin.postMessage(str);
};



var plugin_handler = {};

plugin_handler.printLog = function(str) {
  console.log('plugin log: ' + str);
};


plugin_handler.exit = function(code) {
  console.log('plugin exit: ' + code);
};


plugin_handler.openFile = function(fd, path, mode) {
  console.log('plugin openFile');
};

plugin_handler.openSocket = function(
    fd, host, port) {
  console.log('plugin openSocket');
};

plugin_handler.write = function(fd, data) {
  console.log('plugin write');
  console.log(fd);
  console.log(data);
/*
  if (fd == 1 || fd == 2) {
    var string = atob(data);
    var ackCount = (fd == 1 ?
                    this.stdoutAcknowledgeCount_ += string.length :
                    this.stderrAcknowledgeCount_ += string.length);
    this.io.writeUTF8(string);

    setTimeout(function() {
        self.sendToPlugin_('onWriteAcknowledge', [fd, ackCount]);
      }, 0);
    return;
  }

  var stream = nassh.Stream.getStreamByFd(fd);
  if (!stream) {
    console.warn('Attempt to write to unknown fd: ' + fd);
    return;
  }

  stream.asyncWrite(data, function(writeCount) {
      self.sendToPlugin_('onWriteAcknowledge', [fd, writeCount]);
    }, 100);
*/
};


plugin_handler.read = function(fd, size) {
  console.log('plugin read');
};


plugin_handler.close = function(fd) {
  console.log('plugin close');
};

function call_plugin(plugin){
	var args_start = JSON.parse('[{"terminalWidth":143,"terminalHeight":34,"useJsSocket":false,"environment":{"TERM":"xterm-256color"},"writeWindow":8192,"arguments":["-C","Bmigapp@113.52.168.185"]}]');
	var args_resize = JSON.parse('[143,34]');
	
	sendToPlugin(plugin, 'onResize', args_resize);

	sendToPlugin(plugin, 'startSession', args_start);
}

var plugin_obj = initPlugin();
setTimeout(call_plugin.bind(null,plugin_obj),1000);








