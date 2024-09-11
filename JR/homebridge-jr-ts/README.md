# JR Automation

Table of Content

- [Description](#description)

## Description

This driver provides Home Automation control for JR Automation Touch Switches via [Apple HomeKit](https://www.apple.com/in/home-app/). It control devices through TCP/IP connection.

## Installation

From Homebridge CLI at `/var/lib/homebridge/`

```bash
$ npm install @cuehome/homebridge-jr-ts --registry http://path/to/cuehome/registry/
```

## Configuration

Edit `config.json` of Homebridge. See for all available properties [`config.schema.json`][config-schema].

For sample config see : [`sample.config.json`][sample-config]

## Development API

API Documentation for Switch Panel is available [Touch Switch API](API).

After clone this repository run following commands.

```bash
$ npm install && npm run build && npm link
$ sudo hb-service link
```

## License

## Todo

- [ ] Update License

[config-schema]: ./config.schema.json
[sample-config]: ./sample.config.json
[API]: ./API/Touch%20Switches%20API_server.pdf