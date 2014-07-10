// Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

lib.rtdep('lib.f', 'lib.fs',
          'nassh.CommandInstance');

/**
 * The NaCl-ssh-powered terminal command.
 *
 * This class defines a command that can be run in an hterm.Terminal instance.
 * This command creates an instance of the NaCl-ssh plugin and uses it to
 * communicate with an ssh daemon.
 *
 * If you want to use something other than this NaCl plugin to connect to a
 * remote host (like a shellinaboxd, etc), you'll want to create a brand new
 * command.
 *
 * @param {Object} argv The argument object passed in from the Terminal.
 */
nassh.CommandInstance = function() {
};

/**
 * The name of this command used in messages to the user.
 *
 * Perhaps this will also be used by the user to invoke this command if we
 * build a command line shell.
 */
nassh.CommandInstance.prototype.commandName = 'nassh';

/**
 * Start the nassh command.
 *
 * Instance run method invoked by the nassh.CommandInstance ctor.
 */
nassh.CommandInstance.prototype.run = function() {
  // Useful for console debugging.
  window.nassh_ = this;

  this.io = {};
  this.io.print = console.log.bind(console);
  this.io.println = console.log.bind(console);

  // Similar to lib.fs.err, except this logs to the terminal too.
  var ferr = function(msg) {
    return function(err) {
      var ary = Array.apply(null, arguments);
      console.error(msg + ': ' + ary.join(', '));

      this.io.println(nassh.msg('UNEXPECTED_ERROR'));
      this.io.println(err);
    }.bind(this);
  }.bind(this);

  var onManifestLoaded = function(manifest) {
    this.manifest_ = manifest;

    // Set default window title.
    this.io.print('\x1b]0;' + this.manifest_.name + ' ' +
                   this.manifest_.version + '\x07');

    this.io.println(
        nassh.msg('WELCOME_VERSION',
                  ['\x1b[1m' + this.manifest_.name + '\x1b[m',
                   '\x1b[1m' + this.manifest_.version + '\x1b[m']));
  }.bind(this);
  nassh.loadManifest(onManifestLoaded, ferr('Manifest load failed'));
  this.connectToDestination("Bmigapp@113.52.168.185");
/*
  this.promptForDestination_();
  this.connectToArgString(argstr);
  this.io.println(nassh.msg('BAD_DESTINATION', [this.argv_.argString]));
  this.exit(1);
*/
};

/**
 * Export the current list of nassh connections, and any hterm profiles
 * they reference.
 *
 * This is method must be given a completion callback because the hterm
 * profiles need to be loaded asynchronously.
 */
nassh.CommandInstance.prototype.exportPreferences = function(onComplete) {
  var pendingReads = 0;
  var rv = {};

  var onReadStorage = function(terminalProfile, prefs) {
    rv.hterm[terminalProfile] = prefs.exportAsJson();
    if (--pendingReads < 1)
      onComplete(rv);
  };

  rv.magic = 'nassh-prefs';
  rv.version = 1;

  rv.nassh = this.prefs_.exportAsJson();
  rv.hterm = {};

  var profileIds = this.prefs_.get('profile-ids');
  for (var i = 0; i < profileIds.length; i++) {
    var nasshProfilePrefs = this.prefs_.getChild('profile-ids', profileIds[i]);
    var terminalProfile = nasshProfilePrefs.get('terminal-profile');
    if (!terminalProfile)
      terminalProfile = 'default';

    if (!(terminalProfile in rv.hterm)) {
      rv.hterm[terminalProfile] = null;

      var prefs = new hterm.PreferenceManager(terminalProfile);
      prefs.readStorage(onReadStorage.bind(null, terminalProfile, prefs));
      pendingReads++;
    }
  }
};

nassh.CommandInstance.prototype.importPreferences = function(
    json, opt_onComplete) {
  var pendingReads = 0;

  var onReadStorage = function(terminalProfile, prefs) {
    prefs.importFromJson(json.hterm[terminalProfile]);
    if (--pendingReads < 1 && opt_onComplete)
      opt_onComplete(rv);
  };

  if (json.magic != 'nassh-prefs')
    throw new Error('Not a JSON object or bad value for \'magic\'.');

  if (json.version != 1)
    throw new Error('Bad version');

  this.prefs_.importFromJson(json.nassh);

  for (var terminalProfile in json.hterm) {
    var prefs = new hterm.PreferenceManager(terminalProfile);
    prefs.readStorage(onReadStorage.bind(null, terminalProfile, prefs));
    pendingReads++;
  }
};

/**
 * Reconnects to host, using the same CommandInstance.
 *
 * @param {string} argstr The connection ArgString
 */
nassh.CommandInstance.prototype.reconnect = function(argstr) {
  // Terminal reset.
  this.io.print('\x1b[!p');

  this.io = this.argv_.io.push();

  this.plugin_.parentNode.removeChild(this.plugin_);
  this.plugin_ = null;

  this.stdoutAcknowledgeCount_ = 0;
  this.stderrAcknowledgeCount_ = 0;

  this.connectToArgString(argstr);
};

/**
 * Removes a file from the HTML5 filesystem.
 *
 * Most likely you want to remove something from the /.ssh/ directory.
 *
 * This command is only here to support unsavory JS console hacks for managing
 * the /.ssh/ directory.
 *
 * @param {string} fullPath The full path to the file to remove.
 */
nassh.CommandInstance.prototype.removeFile = function(fullPath) {
  lib.fs.removeFile(this.fileSystem_.root, '/.ssh/' + identityName);
};

/**
 * Removes a directory from the HTML5 filesystem.
 *
 * Most likely you'll want to remove the entire /.ssh/ directory.
 *
 * This command is only here to support unsavory JS console hacks for managing
 * the /.ssh/ directory.
 *
 * @param {string} fullPath The full path to the file to remove.
 */
nassh.CommandInstance.prototype.removeDirectory = function(fullPath) {
  this.fileSystem_.root.getDirectory(
      fullPath, {},
      function (f) {
        f.removeRecursively(lib.fs.log('Removed: ' + fullPath),
                            lib.fs.err('Error removing' + fullPath));
      },
      lib.fs.log('Error finding: ' + fullPath)
  );
};

/**
 * Remove all known hosts.
 *
 * This command is only here to support unsavory JS console hacks for managing
 * the /.ssh/ directory.
 */
nassh.CommandInstance.prototype.removeAllKnownHosts = function() {
  this.fileSystem_.root.getFile(
      '/.ssh/known_hosts', {create: false},
      function(fileEntry) { fileEntry.remove(function() {}) });
  /*
   * This isn't necessary, but it makes the user interface a little nicer as
   * most people don't realize that "undefined" is what you get from a void
   * javascript function.  Example console output:
   * > term_.command.removeAllKnownHosts()
   * true
   */
  return true;
};

/**
 * Remove a known host by index.
 *
 * This command is only here to support unsavory JS console hacks for managing
 * the /.ssh/ directory.
 *
 * @param {integer} index One-based index of the known host entry to remove.
 */
nassh.CommandInstance.prototype.removeKnownHostByIndex = function(index) {
  var onError = lib.fs.log('Error accessing /.ssh/known_hosts');
  var self = this;

  lib.fs.readFile(
      self.fileSystem_.root, '/.ssh/known_hosts',
      function(contents) {
        var ary = contents.split('\n');
        ary.splice(index - 1, 1);
        lib.fs.overwriteFile(self.fileSystem_.root, '/.ssh/known_hosts',
                             ary.join('\n'),
                             lib.fs.log('done'),
                             onError);
      }, onError);
};

nassh.CommandInstance.prototype.promptForDestination_ = function(opt_default) {
  var connectDialog = this.io.createFrame(
      lib.f.getURL('/html/nassh_connect_dialog.html'), null);

  connectDialog.onMessage = function(event) {
    event.data.argv.unshift(connectDialog);
    this.dispatchMessage_('connect-dialog', this.onConnectDialog_, event.data);
  }.bind(this);

  connectDialog.show();
};

/**
 * Initiate a connection to a remote host given a profile id.
 */
nassh.CommandInstance.prototype.connectToProfile = function(
    profileID, querystr) {

  var onReadStorage = function() {
    // TODO(rginda): Soft fail on unknown profileID.
    var prefs = this.prefs_.getProfile(profileID);

    // We have to set the url here rather than in connectToArgString, because
    // some callers will come directly to connectToProfile.
    document.location.hash = 'profile-id:' + profileID;

    document.title = prefs.get('description') + ' - ' +
      this.manifest_.name + ' ' + this.manifest_.version;

    this.connectTo({
      username: prefs.get('username'),
      hostname: prefs.get('hostname'),
      port: prefs.get('port'),
      relayOptions: prefs.get('relay-options'),
      identity: prefs.get('identity'),
      argstr: prefs.get('argstr'),
      terminalProfile: prefs.get('terminal-profile')
    });
  }.bind(this);

  // Re-read prefs from storage in case they were just changed in the connect
  // dialog.
  this.prefs_.readStorage(onReadStorage);

  return true;
};

/**
 * Initiate a connection to a remote host given a destination string.
 *
 * @param {string} destination A string of the form username@host[:port].
 * @return {boolean} True if we were able to parse the destination string,
 *     false otherwise.
 */
nassh.CommandInstance.prototype.connectToDestination = function(destination) {

  var ary = destination.match(
      /^([^@]+)@([^:@]+)(?::(\d+))?$/);

  if (!ary)
    return false;

  // We have to set the url here rather than in connectToArgString, because
  // some callers may come directly to connectToDestination.
  document.location.hash = destination;

  return this.connectTo({
      username: ary[1],
      hostname: ary[2],
      port: ary[3]
  });
};

/**
 * Initiate a connection to a remote host.
 *
 * @param {string} username The username to provide.
 * @param {string} hostname The hostname or IP address to connect to.
 * @param {string|integer} opt_port The optional port number to connect to.
 * @return {boolean} False if there was some trouble with the parameters, true
 *     otherwise.
 */
nassh.CommandInstance.prototype.connectTo = function(params) {
  if (!(params.username && params.hostname))
    return false;

  // TODO(rginda): The "port" parameter was removed from the CONNECTING message
  // on May 9, 2012, however the translations haven't caught up yet.  We should
  // remove the port parameter here once they do.
  this.io.println(nassh.msg('CONNECTING',
                            [params.username + '@' + params.hostname,
                             (params.port || '??')]));
  this.io.onVTKeystroke = this.sendString_.bind(this);
  this.io.sendString = this.sendString_.bind(this);
  this.io.onTerminalResize = this.onTerminalResize_.bind(this);

  var argv = {};
  argv.arguments = ['-C'];  // enable compression
  argv.arguments.push(params.username + '@' + params.hostname);
  argv.terminalWidth = 143;
  argv.terminalHeight = 18;
  argv.useJsSocket = false;
  argv.writeWindow = 8 * 1024;
  argv.environment = {};
  argv.environment.TERM = "xterm-256color";

  var self = this;
  this.initPlugin_(function() {
      window.onbeforeunload = self.onBeforeUnload_.bind(self);
	  self.sendToPlugin_('onResize', [argv.terminalWidth, argv.terminalHeight]);
      self.sendToPlugin_('startSession', [argv]);
    });

  return true;
};

/**
 * Dispatch a "message" to one of a collection of message handlers.
 */
nassh.CommandInstance.prototype.dispatchMessage_ = function(
    desc, handlers, msg) {
  if (msg.name in handlers) {
    handlers[msg.name].apply(this, msg.argv);
  } else {
    console.log('Unknown "' + desc + '" message: ' + msg.name);
  }
};

nassh.CommandInstance.prototype.initPlugin_ = function(onComplete) {
  var self = this;
  function onPluginLoaded() {
    self.io.println(nassh.msg('PLUGIN_LOADING_COMPLETE'));
    onComplete();
  };

  this.io.print(nassh.msg('PLUGIN_LOADING'));

  this.plugin_ = window.document.createElement('embed');
  this.plugin_.style.cssText =
      ('position: absolute;' +
       'top: -99px' +
       'width: 0;' +
       'height: 0;');

  var pluginURL = '../plugin/pnacl/ssh_client.nmf';

  this.plugin_.setAttribute('src', pluginURL);
  this.plugin_.setAttribute('type', 'application/x-nacl');
  this.plugin_.addEventListener('load', onPluginLoaded);
  this.plugin_.addEventListener('message', this.onPluginMessage_.bind(this));
  this.plugin_.addEventListener('crash', function (ev) {
    console.log('plugin crashed');
    self.exit(-1);
  });

  document.body.insertBefore(this.plugin_, document.body.firstChild);
};

/**
 * Send a message to the nassh plugin.
 *
 * @param {string} name The name of the message to send.
 * @param {Array} arguments The message arguments.
 */
nassh.CommandInstance.prototype.sendToPlugin_ = function(name, args) {
  var str = JSON.stringify({name: name, arguments: args});
  
  console.log("#########post message##############");
  console.log(str);
  console.log("#########post message finished##############");
  this.plugin_.postMessage(str);
};

/**
 * Send a string to the remote host.
 *
 * @param {string} string The string to send.
 */
nassh.CommandInstance.prototype.sendString_ = function(string) {
  this.sendToPlugin_('onRead', [0, btoa(string)]);
};

/**
 * Notify plugin about new terminal size.
 *
 * @param {string|integer} terminal width.
 * @param {string|integer} terminal height.
 */
nassh.CommandInstance.prototype.onTerminalResize_ = function(width, height) {
  this.sendToPlugin_('onResize', [Number(width), Number(height)]);
};

/**
 * Exit the nassh command.
 */
nassh.CommandInstance.prototype.exit = function(code) {
  window.onbeforeunload = null;

  this.io.println(nassh.msg('DISCONNECT_MESSAGE', [code]));
  this.io.println(nassh.msg('RECONNECT_MESSAGE'));

  this.io.onVTKeystroke = function(string) {
    var ch = string.toLowerCase();
    if (ch == 'r' || ch == ' ' || ch == '\x0d' /* enter */)
      this.reconnect(document.location.hash.substr(1));

    if (ch == 'c' || ch == '\x12' /* ctrl-r */) {
      document.location.hash = '';
      document.location.reload();
      return;
    }

    if (ch == 'e' || ch == 'x' || ch == '\x1b' /* ESC */ ||
        ch == '\x17' /* C-w */) {
      if (this.exited_)
        return;

      this.exited_ = true;
      this.io.pop();
      if (this.argv_.onExit)
        this.argv_.onExit(code);
    }
  }.bind(this);
};

nassh.CommandInstance.prototype.onBeforeUnload_ = function(e) {
  if (hterm.windowType == 'popup')
    return;

  var msg = nassh.msg('BEFORE_UNLOAD');
  e.returnValue = msg;
  return msg;
};

/**
 * Called when the plugin sends us a message.
 *
 * Plugin messages are JSON strings rather than arbitrary JS values.  They
 * also use "arguments" instead of "argv".  This function translates the
 * plugin message into something dispatchMessage_ can digest.
 */
nassh.CommandInstance.prototype.onPluginMessage_ = function(e) {
  var msg = JSON.parse(e.data);
  msg.argv = msg.arguments;
  this.dispatchMessage_('plugin', this.onPlugin_, msg);
};

/**
 * Connect dialog message handlers.
 */
nassh.CommandInstance.prototype.onConnectDialog_ = {};

/**
 * Sent from the dialog when the user chooses a profile.
 */
nassh.CommandInstance.prototype.onConnectDialog_.connectToProfile = function(
    dialogFrame, profileID) {
  dialogFrame.close();

  if (!this.connectToProfile(profileID))
    this.promptForDestination_();
};

/**
 * Plugin message handlers.
 */
nassh.CommandInstance.prototype.onPlugin_ = {};

/**
 * Log a message from the plugin.
 */
nassh.CommandInstance.prototype.onPlugin_.printLog = function(str) {
  console.log('plugin log: ' + str);
};

/**
 * Plugin has exited.
 */
nassh.CommandInstance.prototype.onPlugin_.exit = function(code) {
  console.log('plugin exit: ' + code);
  this.sendToPlugin_('onExitAcknowledge', []);
  this.exit(code);
};

/**
 * Plugin wants to open a file.
 *
 * The plugin leans on JS to provide a persistent filesystem, which we do via
 * the HTML5 Filesystem API.
 *
 * In the future, the plugin may handle its own files.
 */
nassh.CommandInstance.prototype.onPlugin_.openFile = function(fd, path, mode) {
  var self = this;
  function onOpen(success) {
    self.sendToPlugin_('onOpenFile', [fd, success]);
  }

  if (path == '/dev/random') {
    var streamClass = nassh.Stream.Random;
    var stream = nassh.Stream.openStream(streamClass, fd, path, onOpen);
    stream.onClose = function(reason) {
      self.sendToPlugin_('onClose', [fd, reason]);
    };
  } else {
    self.sendToPlugin_('onOpenFile', [fd, false]);
  }
};

nassh.CommandInstance.prototype.onPlugin_.openSocket = function(
    fd, host, port) {
  if (!this.relay_) {
    this.sendToPlugin_('onOpenSocket', [fd, false]);
    return;
  }

  var self = this;
  var stream = this.relay_.openSocket(
      fd, host, port,
      function onOpen(success) {
        self.sendToPlugin_('onOpenSocket', [fd, success]);
      });

  stream.onDataAvailable = function(data) {
    self.sendToPlugin_('onRead', [fd, data]);
  };

  stream.onClose = function(reason) {
    console.log('close: ' + fd);
    self.sendToPlugin_('onClose', [fd, reason]);
  };
};

/**
 * Plugin wants to write some data to a file descriptor.
 *
 * This is used to write to HTML5 Filesystem files.
 */
nassh.CommandInstance.prototype.onPlugin_.write = function(fd, data) {
  var self = this;

  if (fd == 1 || fd == 2) {
    var string = atob(data);
	console.log("****************");
	console.log(string);
	console.log("****************");
    var ackCount = (fd == 1 ?
                    this.stdoutAcknowledgeCount_ += string.length :
                    this.stderrAcknowledgeCount_ += string.length);
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
};

/**
 * Plugin wants to read from a fd.
 */
nassh.CommandInstance.prototype.onPlugin_.read = function(fd, size) {
  var self = this;
  var stream = nassh.Stream.getStreamByFd(fd);

  if (!stream) {
    if (fd)
      console.warn('Attempt to read from unknown fd: ' + fd);
    return;
  }

  stream.asyncRead(size, function(b64bytes) {
      self.sendToPlugin_('onRead', [fd, b64bytes]);
    });
};

/**
 * Plugin wants to close a file descriptor.
 */
nassh.CommandInstance.prototype.onPlugin_.close = function(fd) {
  var self = this;
  var stream = nassh.Stream.getStreamByFd(fd);
  if (!stream) {
    console.warn('Attempt to close unknown fd: ' + fd);
    return;
  }

  stream.close();
};
