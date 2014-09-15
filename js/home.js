'use strict';

function initPlugin() {
  function onPluginLoaded() {
    console.log("plugin loaded done");
	call_plugin();
  };

  var plugin = window.document.createElement('embed');
  plugin.style.cssText =
      ('position: absolute;' +
       'top: -99px' +
       'width: 0;' +
       'height: 0;');

  var pluginURL = '../plugin/nacl/ssh_client.nmf';

  plugin.setAttribute('src', pluginURL);
  plugin.setAttribute('type', 'application/x-nacl');
  plugin.setAttribute('id', 'ssh_plugin');
  plugin.addEventListener('load', onPluginLoaded);
  plugin.addEventListener('message', onPluginMessage);
  plugin.addEventListener('crash', function (ev) {
    console.log('plugin crashed');
    self.exit(-1);
  });

  document.body.insertBefore(plugin, document.body.firstChild);
};
window.onload = initPlugin;


function onPluginMessage(e) {
  var msg = JSON.parse(e.data);
  msg.argv = msg.arguments;

  if (msg.name in plugin_handler) {
    plugin_handler[msg.name].apply(this, msg.argv);
  } else {
    console.log('Unknown "' + desc + '" message: ' + msg.name);
  }
};

function sendToPlugin(name, args) {
  var str = JSON.stringify({name: name, arguments: args});
  console.log("#########post message##############");
  console.log(str);
  console.log("#########post message finished##############\n");
  
  var plugin = document.getElementById("ssh_plugin");
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
  var return_string = atob(data);
  console.log("******Start**********");
  console.log('qq'+fd+'qq');
  console.log(return_string);
  console.log("******End**********\n");
  if (return_string.match(/Are you sure you want to continue connecting \(yes\/no\)\?/)) {
    sendToPlugin('onRead', [0, btoa("yes\n")]);
  }
  else if (return_string.match(/Password:/)) {
    sendToPlugin('onRead', [0, btoa("Pass2014\n")]);
  }
  else if (return_string.match(/Last login:/)) {
	sendToPlugin('onRead', [0, btoa("cd ~;cat app.log\n")]);
  }
  else if (return_string.match(/weblogictest/)) {
	plugin_handler.write = function(fd, data) {
	  var return_string = atob(data);
	  console.log("******Start**********");
	  console.log('qq'+fd+'qq');
      console.log(return_string);
      console.log("******End**********\n");
	  if( fd == 1) {
	    var string = document.getElementById("output").innerHTML;
	    document.getElementById("output").innerHTML = string + return_string;
	  }
	}
  }
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

function call_plugin(){
	var start_session_args = JSON.parse('[{"useJsSocket":false,"environment":{"TERM":"xterm-256color"},"writeWindow":8192,"arguments":["-C","test@10.16.128.20"]}]');
	var yes_string = atob("yes");
	sendToPlugin('startSession', start_session_args);
//	setTimeout(function(){ sendToPlugin('onRead', [0, btoa("cd ~; cat app.log\n")])}, 0);
}










