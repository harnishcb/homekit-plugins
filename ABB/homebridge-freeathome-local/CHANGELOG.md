### 3.0.5

##### Features
* added support for "Window Sensor Accessory 6222/1 AP-64-WL"
* added wireless thermostat accessory "Heizkörperthermostat Basic 6256/1-WL"

Many thanks to Dennis Nikolas Falk https://github.com/dennis-nikolas-falk for this great contribiution!

##### Bug Fixes
* fix for "Window Contact Sensor Sensor/Schaltaktor 8/8-fach 6251/8.8":
 they not have the window status on the datapoint odp0000 but on the datapoint odp000c. Now the pairingID 53 is searched and the corresponding datapoint is assigned.

##### Bump Dependencies
* axios         ^0.26.1  →  ^0.27.2     
* express       ^4.17.3  →  ^4.18.1     
* ip             ^1.1.5  →   ^1.1.8     
* npm            ^8.7.0  →  ^8.13.2     
* ws             ^8.5.0  →   ^8.8.0     
* @types/node  ^17.0.25  →  ^18.0.0     
* @types/pako    ^1.0.3  →   ^2.0.0     
* typescript     ^4.6.3  →   ^4.7.4 


### 3.0.4

* Reconnect Limit setting in config (default 30s)
* Cleanup unused code

### 3.0.4-beta.2

* Destroy existing Socket before Reconnect 
* Debug Logger repaired

### 3.0.4-beta.1

* Reconnect Websocket if connection is lost or no broadcast messages will be retrieved in any 30s interval
* Update npm modules to current versions

### 3.0.4-beta.0

* Config setting for TLS or Plain communication (UseTLS)
* Attic window actuator & Awning actuator added
* Update npm modules to current versions


### 3.0.3

* Config UI fixed 

### 3.0.2

* Fixed a bug in BuschJaegerDimmAktorAccessory wich stopped the plugin from working
* New Setting "dimmActorMinValue"
* Removed useless reading from "Input Datapoints"

### 3.0.0 (2022-01-11)

* Ready for SysAP v3.0
* Homebridge UI config
* Readme

### 2.6.1 (2022-01-06)

* Ping timeout websocket
* Better logging information on connect
* Return to old UUID to avoid loosing accessories configuration (like automisation, room assignments or custom nameing) in Home.app

### 2.6.0 (2022-01-03)

* Added experimental support for the local REST API (instead of the Jabber Cloud solution)

### 2.0.3 (2020-08-19)

* Fix issue which would prevent accessories from reading correct datapoint values

### 2.0.2 (2020-08-16)

* Correctly expose motion sensors
* Add debug option to log requests from/to SysAP
* Fix contact sensor state inverted

### 2.0.1 (2020-08-12)

##### Features

* Added support for shutters
* Added support for motion sensors
+ Added support for window contact sensors

## 2.0.0 (2020-08-11)

##### Features

* Use freathome-api as a library
* Automatically detect accessory type based on functionId
* Expose Sonos speakers as speaker to HomeKit
* Added support for smoke sensors
* automatically detect light bulbs
* renamed plugin

##### Upgrade Notes
To upgrade from `< 2.0.0` please follow below steps:

1. Uninstall old Plugin `homebridge-buschjaeger`
2. Install the new Plugin `homebridge-freeathome`
3. Edit homebridge's `config.json`:
    1. Change the platform to `free@home`
    2. Change the `SysIP` to the IP/Hostname of the System Access Point
    3. Set the `username` and `password` previously used for the `freeathome-api`
    4. Remove the `updateInterval` option if set
    5. Remove any unnecessary mappings. Unused accessory will automatically be detected
4. Start Homebridge

Speakers need to be re-added. Just add another accessory and they should show up as *Smart Speaker*.
The `freeathome-api` can be stopped and uninstalled as it is not needed anymore.

#### 1.7.1 (2020-04-14)

##### Features

* **Actuator:** Added support for:
    - Dimmaktor 4-fach (1022)

#### 1.7.0 (2020-04-13)

##### Features

* **Actuator:** Added support for:
    - Sensor/ Schaltaktor 2/1-fach (100E)
    - Sensor/Dimmaktor 1/1-fach (1017)
    - Sensor/Dimmaktor 2/1-fach (1019)
    - automatically set accessory name based on free@home device layout

##### Improvements
* **BuschJaegerDimmAktorAccessory**:
    - limit minimum brightness based on free@home setting

#### 1.6.0 (2019-07-17)

##### Features

* **Actuator:** Added support for:
    - free@homeTouch 7 (1038) [Door Lock Only]

#### 1.5.5 (2019-04-12)

##### Improvements

* If no response has been received from the SysAp within 5 seconds the accessory will show an error within HomeKit and the pending event will be cleaned up. This prevents the HomeKit UI from not responding for up to 1 minute with left over event which eventually may crash homebridge.

#### 1.5.4 (2019-04-01)

##### Improvements

* **BuschJaegerJalousieAccessory**:  
    Moving the shutters is now more reliable (than ever) and should not cause the shutters to stop and start when the position is changed multiple times while moving. Additionally position changes should now be exact and reflect the actual window.

#### 1.5.3 (2019-01-25)

##### Bug Fixes

* Fixed crash if all channels of an actuator were blacklisted.

#### 1.5.2 (2018-09-18)

##### Features

* The thermostat accessory now reports temperature in 0.5 steps for increased accuracy.
As this is a non-breaking feature it will included in a patch release.

#### 1.5.1 (2018-09-05)

##### Bug Fixes

* Fixed a bug that caused (switch) actuators not to react if they are turned on,
on homebridge start

### 1.5.0 (2018-07-04)

##### Features

* **Custom Actuator** Added support for:
    - Garage Door

##### Bug Fixes
* **BuschJaegerThermostatAccessory**:
    - fixed Thermostat heating to 35 °C / cooling to 7 °C
    - fixed incorrect temperature readout
    - set min value to 7 °C and max to 35 °C
    - enable heating mode before changing target temperature when mode is off
    - fixed incorrect current heating state

### 1.4.0 (2018-06-26)

##### Features

* **Custom Actuator** Added support for:
    - (Video) Door bell

### 1.3.0 (2018-06-05)

##### Features


* **Actuator** Added support for:
    - Sensor/ Schaltaktor 2/2-fach (1010)

### 1.2.0 (2018-04-16)

##### Features

* **Actuator:** Added support for:
    - Sensor/ Schaltaktor 1/1-fach (100C)

### 1.1.0 (2018-04-01)

##### Features

* **Actuator:** Added support for:
    - Schaltaktor 4-fach, 16A, REG (B002)

## 1.0.0 (2018-03-28)

##### Features

* **Actuator:** Added support for:
    - Dimmaktor 4-fach (101C)
    - Sensor/ Jalousieaktor 2/1-fach (1015)
    - Sensor/ Jalousieaktor 1/1-fach (1013)
    - Sonos Media Player (0001)

##### Bug Fixes

* **Accessory:** Fix lockup of JalousieAccessory

##### Improvements

* **API:** Make the UI more reactive by listening for websocket events from the SysAp
* **API:** Update only once every 60 seconds by default to reduce load

##### Upgrade Notes
* ~~**API:** The plugin depends on features that have not yet been merged in the API project and therefore you need to use the fork https://github.com/henry-spanka/home~~

#### 0.0.2 (2018-03-09)

##### Features

* **Actuator:** Added support for:
    - Raumtemperaturregler (1004)
    - Jalousieaktor 4-fach, REG (B001)
    - Sensor/ Schaltaktor 8/8fach, REG (B008)
    - Dimmaktor 4-fach (1021)
* **Configuration:** Allow to ignore some actuators/channels
* **Performance:** The UI is now more responsive.

# Bug Fixes
* **HomeKit:** Under some circumstances if the API can not authenticate against the SysAp the plugin will report zero accessories and all accessories are removed from the HomeKit database.
* **API:** If the connection to the API is lost Homebridge crashes.

# Improvements
* **Documentation:** Improved documentation.
