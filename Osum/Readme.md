# Plugin for SL-Bus support

A typescript plugin to support sl-bus devices

## Basic Flow

```mermaid
graph TD;
    Start --> Cloud_API_Request;
    Cloud_API_Request --> Analyse_each_device;
    Analyse_each_device --> Device_type_supported;
    Device_type_supported --> |Yes| Generate_UUId_and_add_device;
    Generate_UUId_and_add_device --> End;

                    
## Logic for UUID

SL-bus system has bus no in range (1-x) and device number in range (1-x). Hence combination of both, bus no as first character and device in second charater gives a unique number in a sl-bus installation. UUID name - Device name + Bus no. + Device no.