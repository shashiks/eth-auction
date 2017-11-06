// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8080,
      network_id: '1971' // Match any network id
    }
  }
}
