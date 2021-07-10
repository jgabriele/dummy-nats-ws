import { NatsConnection } from "nats";

const { connect } = require("nats");

let _nc: NatsConnection

export async function initNatsConnection() {
  try {
    const nc = await connect('nats://connect.ngs.synadia-test.com')
    _nc = nc
  } catch(e) {
    console.error(e)
  }
}

export async function getNatsClient() {
  if (!_nc) {
    await initNatsConnection()
  }
  return _nc
}