// Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// CSP means that we can't kick off the initialization from the html file,
// so we do it like this instead.
window.onload = function() {
  
  function execNaSSH() {
	nassh_command = new nassh.CommandInstance();
  }

  lib.init(execNaSSH, console.log.bind(console));
};
