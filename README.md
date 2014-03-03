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

## Advanced startup

To start on a different port, use

    node scratchnet.js 5000

To start 2 instances and automatically start a service, use

    node scratchnet.js 2000:2001:chat-1.0

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


