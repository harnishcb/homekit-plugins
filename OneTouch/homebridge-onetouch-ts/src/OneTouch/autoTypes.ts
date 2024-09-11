export type AutomationReturn = {
    error: boolean;
    message: string;
    cooldownActive?: boolean;
};

// From homebridge-camera-ffmpeg
// Right now this module does not required its only for motion & doorbell handler.