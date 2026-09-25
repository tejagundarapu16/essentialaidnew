import { readStore, writeStore } from "@/lib/backend-store"
import type { OtpRecord } from "@/lib/types"

export class OtpRepository {
  static async save(record: OtpRecord): Promise<OtpRecord> {
    const store = await readStore()
    const records = store.state.otpRecords || []
    
    // Deactivate/remove any previous active OTPs for this exact identifier
    const updatedRecords = records.filter((r) => r.identifier !== record.identifier)
    updatedRecords.push(record)

    store.state.otpRecords = updatedRecords
    await writeStore(store)
    return record
  }

  static async findLatestByIdentifier(identifier: string): Promise<OtpRecord | null> {
    const store = await readStore()
    const records = store.state.otpRecords || []
    const matching = records
      .filter((r) => r.identifier === identifier)
      .sort((a, b) => b.created_at - a.created_at)

    return matching[0] ?? null
  }

  static async update(record: OtpRecord): Promise<OtpRecord> {
    const store = await readStore()
    const records = store.state.otpRecords || []
    const idx = records.findIndex((r) => r.id === record.id)
    
    if (idx !== -1) {
      records[idx] = record
    } else {
      records.push(record)
    }

    store.state.otpRecords = records
    await writeStore(store)
    return record
  }

  static async invalidate(id: string): Promise<void> {
    const store = await readStore()
    const records = store.state.otpRecords || []
    const idx = records.findIndex((r) => r.id === id)
    if (idx !== -1) {
      records[idx].verified = true
      store.state.otpRecords = records
      await writeStore(store)
    }
  }
}
