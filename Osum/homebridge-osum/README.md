# Homebridge Platform Plugin Template

</span>

This is a plugin to for Osum SL-Bus devices with homebridge.


### Setup Environment

This plugin requires the SLbus server to be active for communication. Link- https://github.com/CueHome/SLBus-Server.git


### Flow

Get Device List from SL-Bus cloud during homebridge process startup --->  Init the Devices in Platform accessory ---> Control the device through REST API within LAN ---> Get asynchronous feedback from UDP broadcast .


### Cloud Response-

{"login":{"status":"pass","msg":"success","cid":"EU1704721213150","data":{"dnsListData":[{"bus":0,"dname":"SL-WC-SCN-BPS-V63Q-3621","sname":"Demo Kit","ipAddress":"192.168.1.214","rmacid":"c0:74:ad:de:0f:19","groupList":[{"groupId":"Ga","groupName":"Osum","gk":0,"ss":[{"sn":"All on","sk":0},{"sn":"All off","sk":1},{"sn":"Dim 50","sk":2},{"sn":"Dim 30","sk":3},{"sn":"Cool light ","sk":4},{"sn":"Warm light ","sk":5},{"sn":"Ceiling light ","sk":6},{"sn":"Chimney Tv","sk":7},{"sn":"Red","sk":8},{"sn":"Green","sk":9},{"sn":"Blue","sk":10},{"sn":"White","sk":11},{"sn":"Curtain Open","sk":12},{"sn":"Curtain close","sk":13}],"ns":[{"nn":"Relay","nk":0,"nt":100},{"nn":"Fan","nk":1,"nt":102},{"nn":"Curtain ","nk":2,"nt":103},{"nn":"Phase cut light","nk":3,"nt":101},{"nn":"Dali light","nk":4,"nt":6},{"nn":"Dali Tunable","nk":5,"nt":8,"nst":"tc"},{"nn":"Rgb","nk":6,"nt":8,"nst":"rgb"}],"is":[]}],"uuid":"324e3639350c5e0b2c3b708c3621","type":"SL-WC-SCN-BPS-V63Q"}]}}}

