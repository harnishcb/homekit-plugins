import { z } from "zod";


const JR_CONN_DEFAULT_PORT = 4096

const DTSchema = z.object({
    dp_id: z.number(),
    identifier: z.string(),
    name: z.string(),
    value: z.union([z.string(), z.boolean(), z.number(), z.array(z.number())]),
    mac: z.string(),
    ip: z.string(),
})

type DT = z.infer<typeof DTSchema>

export type { DT }
export { JR_CONN_DEFAULT_PORT, DTSchema }