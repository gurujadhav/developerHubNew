import mongoose, { Document, Model } from "mongoose";

export type ProjectStatus =
  | "pending"
  | "deploying"
  | "running"
  | "failed"
  | "stopped";

export type RunMode = "parallel" | "sequential";

export type ProjectType = "express" | "python";

export interface EnvVar {
  key: string;
  value: string;
}

export interface OutputLink {
  port: number;
  url: string;
}

export interface AfterScript {
  commands: string[];
  file: string;
}

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  repoUrl: string;
  pat: string;
  projectType: ProjectType; // "express" or "python"
  envVars: EnvVar[];
  runCommand: string; // composed command actually sent to the runner
  runCommands: string[]; // individual commands (up to 5)
  runMode: RunMode; // how runCommands are combined
  port: number; // primary port (backward compat = ports[0])
  ports: number[]; // up to 5 ports, each gets its own tunnel
  // After-scripts (structured for editing + composed string sent to the runner)
  afterStart: AfterScript; // runs once after the app is healthy
  afterStartScript: string;
  afterStop: AfterScript; // runs on teardown (stop / fail / rotate)
  afterStopScript: string;
  // Cloudflare
  cfSubdomain: string | null;
  cfWorkersKey: string | null; // project-level CF key (overrides user key)
  cfKvNamespaceId: string | null;
  // State
  status: ProjectStatus;
  outputLink: string | null; // primary tunnel URL (backward compat = outputLinks[0])
  outputLinks: OutputLink[]; // one URL per exposed port
  activeWorkflow: number | null; // 1–12
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
  { _id: false },
);

const OutputLinkSchema = new mongoose.Schema<OutputLink>(
  {
    port: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const AfterScriptSchema = new mongoose.Schema<AfterScript>(
  {
    commands: { type: [String], default: [] },
    file: { type: String, default: "" },
  },
  { _id: false },
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
    projectType: {
      type: String,
      enum: ["express", "python"],
      required: [true, "Project type is required"],
      default: "express",
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
    runCommands: {
      type: [String],
      default: ["pnpm dev"],
      validate: {
        validator: (arr: string[]) => arr.length >= 1 && arr.length <= 5,
        message: "A project must have between 1 and 5 run commands",
      },
    },
    runMode: {
      type: String,
      enum: ["parallel", "sequential"],
      default: "sequential",
    },
    afterStart: {
      type: AfterScriptSchema,
      default: () => ({ commands: [], file: "" }),
    },
    afterStartScript: { type: String, default: "" },
    afterStop: {
      type: AfterScriptSchema,
      default: () => ({ commands: [], file: "" }),
    },
    afterStopScript: { type: String, default: "" },
    port: {
      type: Number,
      default: 3000,
    },
    ports: {
      type: [Number],
      default: [3000],
      validate: {
        validator: (arr: number[]) => arr.length >= 1 && arr.length <= 5,
        message: "A project must expose between 1 and 5 ports",
      },
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
    outputLinks: { type: [OutputLinkSchema], default: [] },
    activeWorkflow: { type: Number, default: null },
    activeWorkflowRunId: { type: String, default: null },
    lastCronRun: { type: Date, default: null },
    deployedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
