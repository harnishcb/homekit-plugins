// Configuration of Device
type DeviceConfig = {
    name: string,
    host: string,
    lockTimeout:number,
    username?: string,
    password?: string,
    cameraConfig: CameraConfig;
    manufacturer?: string,
    model?: string,
    serialNumber?: string
    videoProcessor?: string,
}

type CameraConfig = {
    name?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    firmwareRevision?: string;
    motion?: boolean;
    doorbell?: boolean;
    switches?: boolean;
    motionTimeout?: number;
    motionDoorbell?: boolean;
    unbridge?: boolean;
    videoConfig?: VideoConfig;
}

type VideoConfig = {
    source?: string;
    stillImageSource?: string;
    returnAudioTarget?: string;
    maxStreams?: number;
    maxWidth?: number;
    maxHeight?: number;
    maxFPS?: number;
    maxBitrate?: number;
    forceMax?: boolean;
    vcodec?: string;
    packetSize?: number;
    videoFilter?: string;
    encoderOptions?: string;
    mapvideo?: string;
    mapaudio?: string;
    audio?: boolean;
    debug?: boolean;
    debugReturn?: boolean;
}

export type {
    DeviceConfig,
    CameraConfig,
    VideoConfig
}