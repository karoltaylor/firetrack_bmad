import sodium from "libsodium-wrappers"

await sodium.ready

self.onmessage = (_evt: MessageEvent) => {
  self.postMessage({ status: "ok" })
}
