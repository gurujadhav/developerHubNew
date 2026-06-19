import mongoose, { Document, Model } from "mongoose";

export type UserRole = "user" | "superadmin";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  cfWorkersKey: string | null;
  cfAccountId: string | null;
  role: UserRole;
  canDeploy: boolean;   // whether the user is allowed to host/deploy projects
  maxProjects: number;  // per-user project quota (ignored for superadmin)
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_MAX_PROJECTS = 3;

const UserSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    cfWorkersKey: {
      type: String,
      default: null,
    },
    cfAccountId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "superadmin"],
      default: "user",
    },
    canDeploy: {
      type: Boolean,
      default: true,
    },
    maxProjects: {
      type: Number,
      default: DEFAULT_MAX_PROJECTS,
    },
  },
  { timestamps: true }
);

// Prevent model recompilation in dev
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
