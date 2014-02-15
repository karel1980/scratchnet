# Running the tests:

    npm install -g mocha

    mocha

# Introduction

This extension lets two scratch instances communicate with each other via a helper webapp implemented by nodejs.

Both scratch instances need to run the nodejs app.

You can add the extension in Scratch 2 by shift-clicking on 'File',
then select import experimental extension. Under 'more blocks' you can find the blocks which allow you to communicate with the other instance.

# Running the nodejs app:

First install dependencies by running the following command. You need to do this only once.

    npm install

Start the communication extension by running:

    node comm.js 12300 hostname 12300 

The first argument is the port to listen on,
the 2nd argument is the machine we'll be communicating with (hostname or ip).
the 3rd argument is the port on the target machine

I've tried to run on localhost using two different ports and two scratch instances via 2 user accounts, but it didn't appear to work.

