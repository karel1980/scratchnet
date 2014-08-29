# Introduction

This application lets different scratch instances on the local network
task to each other.

## Installation / Dependencies

    #TODO: verify this sequence on a fresh vm
    npm install -g bower
    bower install
    npm install

## Start scratchnet

    node scratchnet.js

## Startup options:

    -c config (use an alternate configuration, defaults to 'me')
    -n name (override the name from the launcher config)
    -p port (override the port from the launcher config)

## Auto-connect example:

    node scratchnet.js -c bob
    node scratchnet.js -c alice

## Using scratchnet

After starting scratchnet, go to

    http://localhost:2000

1. Choose an application (chat, hangman, number-guess)
2. Invite another scratchnet instance to join you.
3. When the other instance accepts the invitation a scratch extension file ({service}.s2e) is generated in the current directory.

Start scratch

1. Shift-click on 'File' in the menu bar.
2. Select 'Open experimental extension'
3. Open the scratch extension.
4. Start scratching ;) You'll find the extension under 'Blocks'

## Quick Demo

While still in development we provided this fast test env to check how things work out in scratch:

1. launch:  
    node devscripts/launcher-comm.js EchoChat
2. startup the scratch project found at
    ./scratch-sample/echo.sb2

