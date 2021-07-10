const { connect } = require("nats");

async function run() {
  const nc = await connect('nats://connect.ngs.synadia-test.com')

  nc.subscribe('test', {
    callback: (err, msg) => console.log(err, new TextDecoder().decode(msg))
  })
}

run()