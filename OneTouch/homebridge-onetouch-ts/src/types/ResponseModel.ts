import { z } from "zod"

// For firmware status
const FirmwareStatus = z.object({
    retcode: z.number(),
    action: z.string(),
    message: z.string(),
    data: z.object({
        FirmwareVersion: z.string(),
        HardwareVersion: z.string(),
        MAC: z.string(),
        Model: z.string(),
    }),
})

type FirmwareStatus = z.infer<typeof FirmwareStatus>

const callStatus = z.object({
    retcode: z.number(),
    action: z.string(),
    message: z.string(),
    data: z.object({
        Status: z.string(),
    })
})

type callStatus = z.infer<typeof callStatus>

const relayStatus = z.object({
    retcode: z.number(),
    action: z.string(),
    message: z.string(),
    data: z.object({
        RelayA: z.number(),
        ReplayB: z.number(),
        RelayC: z.number(),
    })
});

type relayStatus = z.infer<typeof relayStatus>;

export type {
    FirmwareStatus,
    callStatus,
    relayStatus,
}