This readme is created to guide how to use SL-BUS Java APIs from node.js based application

1> Configure the System

	Test Environment - Ubuntu
	node v18.0.0
	npm v8.6.0

	Check node version by following command
		node -v

	check version of npm using
		npm -v

	if system don't have node installed then installed it using following command
		sudo apt install nodejs

	check version for installed node.

	if npm is not get installed, then installed it by follwing command
		sudo apt install npm

	check version for installed npm.

	if version of node is not 18.0.0, then follow following step to install 18.0.0
		sudo npm cache clean -f
		sudo npm install -g n
		sudo n 18.0.0

	Confirm the installed node version. If terminal is showing old version, then
	check with in new terminal.

	In case if you need to Remove installed node and npm (If required for re-installation)

		sudo rm -rf /usr/local/bin/npm /usr/local/share/man/man1/node* ~/.npm
		sudo rm -rf /usr/local/lib/node*
		sudo rm -rf /usr/local/bin/node*
		sudo rm -rf /usr/local/include/node*

		sudo apt-get purge nodejs npm
		sudo apt autoremove


2> Run the node server

	node nodejs_server.js

	Please note the SL-BUS APIs java libray must be present there in ../java/libs/ for ex: lib-slbus-comm-x.y.z.jar

	if asked for installation of modules e.g. java or request use following command
	sudo npm install request
	sudo npm install java

	After successful installations of required modules server will run on port 1400

3> How to operate SL-BUS Devices
	Use following format to operate SL-BUS devices.
	It will require dlm_access_token, uuid of the SL-BUS device, IP Address of the SL-BUS Device and command to operated SL-BUS device mentioned in the SL-BUS_APIs_Document.xlsx.

	curl localhost:1400 -H "Content-Type: application/json" -d '{"dlm_access_token":"<dlm_access_token>", "uuid":"<uuid>", "ip_address":"<ip_address>", "cmd":<JSON Object from SL-BUS API doc>'

	e.g. To Switch On Node Address 1
	curl 127.0.0.1:1400 -H "Content-Type: application/json" -d '{"dlm_access_token":"<dlm_access_token>", "uuid":"<uuid>", "ip_address":"192.168.2.121", "cmd":{"islands":[{"bus_id":0, "groups":[{"nodes":[{"address":1, "SL-SW": {"state":"on"}}]}]}]}}'

	You will get response of SL-BUS APIs accordingly.
