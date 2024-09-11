const http = require('http')


function set(url,ip){
console.log(url,ip);  
const options = {
  hostname: ip,
  port: 80,
  path: url,
  method: 'GET'
}
const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', d => {
    //console.log(String(d));
  })
})
req.on('error', error => {
  console.error(error)
})
req.end()
}



module.exports = { set }