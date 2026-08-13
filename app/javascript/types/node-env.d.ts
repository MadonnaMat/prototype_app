// Rspack's DefinePlugin statically replaces process.env.NODE_ENV at build time;
// this isn't a real Node process global, just the one property bundlers inject.
declare const process: {
  env: {
    NODE_ENV: "development" | "production" | "test"
  }
}
