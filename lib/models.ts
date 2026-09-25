import mongoose, { Schema, type Document, type Model } from "mongoose"
import type { User as UserType } from "./types"

export interface IUserDocument extends Omit<UserType, "id">, Document {
  id: string
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpires: { type: Number },
    roles: { type: [String], default: ["donor"] },
    location: { type: String, default: "Central Relief Area" },
    coords: {
      lat: { type: Number, default: 30.2672 },
      lng: { type: Number, default: -97.7431 },
    },
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    createdAt: { type: Number, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const obj = ret as Record<string, unknown>
        obj.id = obj.id || (obj._id ? String(obj._id) : undefined)
        delete obj._id
        delete obj.__v
        delete obj.password
        return obj
      },
    },
  },
)

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema)
