mngr = require('./lib/mngr')

port = process.argv[2] || 2000

my = mngr({port: Number(port)})
