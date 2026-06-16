import mongoose, { Document, Model } from "mongoose";

export type ProjectStatus = "pending" | "deploying" | "running" | "failed" | "stopped";

export interface EnvVar {
  key: string;
  value: string;
}

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  repoUrl: string;
  pat: string;
  envVars: EnvVar[];
  runCommand: string;
  port: number;
  // Cloudflare
  cfSubdomain: string | null;
  cfWorkersKey: string | null;     // project-level CF key (overrides user key)
  cfKvNamespaceId: string | null;
  // State
  status: ProjectStatus;
  outputLink: string | null;
  activeWorkflow: number | null;   // 1–12
  activeWorkflowRunId: string | null;
  lastCronRun: Date | null;
  deployedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const EnvVarSchema = new mongoose.Schema<EnvVar>(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema<IProject>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [60, "Project name cannot exceed 60 characters"],
    },
    repoUrl: {
      type: String,
      required: [true, "Repository URL is required"],
      trim: true,
    },
    pat: {
      type: String,
      default: "", // empty for public repos, which clone without a token
    },
    envVars: {
      type: [EnvVarSchema],
      default: [],
    },
    runCommand: {
      type: String,
      default: "pnpm dev",
      trim: true,
    },
    port: {
      type: Number,
      default: 3000,
    },
    cfSubdomain: { type: String, default: null },
    cfWorkersKey: { type: String, default: null },
    cfKvNamespaceId: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "deploying", "running", "failed", "stopped"],
      default: "pending",
    },
    outputLink: { type: String, default: null },
    activeWorkflow: { type: Number, default: null },
    activeWorkflowRunId: { type: String, default: null },
    lastCronRun: { type: Date, default: null },
    deployedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
