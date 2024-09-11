const http = require('http')


function set(macid, switch_no, value){
const data = JSON.stringify({ 
  type: 'operate',
  data: {
  macId: macid,
  switchNo: switch_no,
  percentage: value,
  "variant": "3"
}
})
const options = {
  hostname: '192.168.1.51',
  port: 8900,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}
const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', d => {
    console.log(String(d));
  })
})
req.on('error', error => {
  console.error(error)
})
req.write(data)
req.end()
}








function setcurtain(macid, switch_no, value){
const data = JSON.stringify({ 
  type: 'operate',
  data: {
  macId: macid,
  switchNo: switch_no,
  percentage: value,
  "variant": "6"
}
})
const options = {
  hostname: '192.168.1.51',
  port: 8900,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}
const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', d => {
    console.log(String(d));
  })
})
req.on('error', error => {
  console.error(error)
})
req.write(data)
req.end()
}


function getfeedback(){
const data = JSON.stringify({ 
    "type" : "retrieveSavedData"
})
const options = {
  hostname: '192.168.1.51',
  port: 8900,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}
const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', d => {
    console.log(String(d));
  })
})
req.on('error', error => {
  console.error(error)
})
req.write(data)
req.end()
}


module.exports = { set, setcurtain ,getfeedback}