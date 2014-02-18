# Introduction

This extension lets scratchnet instances on the local network connect to each other using predefined protocols.

*future* Whenever instances are connected a scratch extension file is generated which can be imported into scratch, providing blocks which allow communication between the 2 connected scratch instances.

Both scratch instances need to run the nodejs app (launcher.js).

# Tips
You can add the extension in Scratch 2 by shift-clicking on 'File',
then select import experimental extension. Under 'more blocks' you can find the blocks which allow you to communicate with the other instance.

# Running the tests:

    npm install -g mocha
    mocha

# Useful during development:

## nodemon

Install using `npm install -g nodemon`

Automatically restarts whenever a change is made to your code

    nodemon mngr.js 2000
    nodemon mngr.js 2001

