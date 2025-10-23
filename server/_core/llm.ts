import Replicate from "replicate";
import { ENV } from "./env.js";
import { assertForgeEnabled } from "./forge.js";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIChatCompletionResponse = {
  id?: string;
  created?: number;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices: Array<{
    index?: number;
    finish_reason?: string | null;
    message?: {
      role?: string;
      content?: unknown;
    };
  }>;
};

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";

const replicateClient =
  process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN.length > 0
    ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
    : null;

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const formatMessagesToPrompt = (messages: Message[]): string => {
  return messages
    .map(message => {
      const parts = ensureArray(message.content)
        .map(part =>
          typeof part === "string"
            ? part
            : part.type === "text"
              ? part.text
              : JSON.stringify(part)
        )
        .join("\n");
      const header =
        message.role === "assistant"
          ? "Assistant"
          : message.role === "system"
            ? "System"
            : "User";
      return `${header}: ${parts}`;
    })
    .join("\n\n");
};

const invokeForge = async (params: InvokeParams): Promise<InvokeResult> => {
  assertForgeEnabled("LLM service");
  if (!ENV.forgeApiKey) {
    throw new Error("Forge API key is not configured");
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;
  payload.thinking = {
    budget_tokens: 128,
  };

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = (await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  })) as any;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
};

const toOpenAIMessage = (message: Message): OpenAIChatMessage | null => {
  const parts = ensureArray(message.content).map(part =>
    typeof part === "string"
      ? part
      : part.type === "text"
        ? part.text
        : JSON.stringify(part)
  );
  const content = parts.join("\n").trim();
  if (!content) return null;

  let role: OpenAIChatMessage["role"];
  switch (message.role) {
    case "system":
      role = "system";
      break;
    case "assistant":
      role = "assistant";
      break;
    default:
      role = "user";
      break;
  }

  return { role, content };
};

const resolveOpenAIContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(item =>
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "text" in item
            ? (item as { text?: string }).text ?? ""
            : JSON.stringify(item)
      )
      .join("\n");
  }

  if (content && typeof content === "object" && "text" in content) {
    const maybeText = (content as { text?: string }).text;
    if (typeof maybeText === "string") return maybeText;
  }

  return "";
};

const extractUserPrompt = (messages: Message[]): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "system") continue;
    const parts = ensureArray(message.content).map(part =>
      typeof part === "string"
        ? part
        : part.type === "text"
          ? part.text
          : JSON.stringify(part)
    );
    const joined = parts.join("\n").trim();
    if (joined.length > 0) {
      return joined;
    }
  }
  return "";
};

const buildFallbackLyrics = (messages: Message[]): string => {
  const prompt = extractUserPrompt(messages);
  
  // Extract style/genre from the prompt (e.g., "Rock style", "Pop style")
  const styleMatch = prompt.match(/in the (\w+) style/i);
  const style = styleMatch ? styleMatch[1] : "music";
  
  // Use the style as the topic instead of the full prompt
  const topic = style.toLowerCase();

  const hook = topic
    .charAt(0)
    .toUpperCase()
    .concat(topic.slice(1));

  return [
    "[Intro]",
    `${hook} in the fading city lights`,
    "",
    "[Verse 1]",
    `Walking through the echoes of ${topic}`,
    "Footsteps keeping time with a restless heart",
    "Shadows paint the skyline in silver and gold",
    "Every whispered dream is a brand new start",
    "",
    "[Chorus]",
    `${hook}, we sing it loud`,
    "Raise our hands above the crowd",
    "Every heartbeat finds the sound",
    `${hook}, we're breaking out`,
    "",
    "[Verse 2]",
    "Moonlight on the water, reflections ignite",
    "Promises of tomorrow written in the air",
    "Voices in the night say we'll be alright",
    "Because the fire we carry is always there",
    "",
    "[Bridge]",
    "Hold on tight, the night is ours",
    "Chasing sparks and falling stars",
    "We'll remix the sky into neon art",
    "Turn every pulse into a work of heart",
    "",
    "[Chorus]",
    `${hook}, we sing it loud`,
    "Raise our hands above the crowd",
    "Every heartbeat finds the sound",
    `${hook}, we're breaking out`,
    "",
    "[Outro]",
    `${hook}, echo in the night`,
    "We'll keep dancing till the morning light",
  ].join("\n");
};

const createFallbackResult = (messages: Message[]): InvokeResult => {
  const content = buildFallbackLyrics(messages);
  return {
    id: `fallback-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: "fallback-lyrics-generator",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
  };
};

const invokeOpenAI = async (params: InvokeParams): Promise<InvokeResult> => {
  if (!ENV.openaiApiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  const messages = params.messages
    .map(toOpenAIMessage)
    .filter((message): message is OpenAIChatMessage => message !== null);

  if (messages.length === 0) {
    return createFallbackResult(params.messages);
  }

  const body = JSON.stringify({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: params.maxTokens ?? params.max_tokens ?? 1024,
  });

  const response = (await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openaiApiKey}`,
    },
    body,
  })) as any;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI request failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const completion = (await response.json()) as OpenAIChatCompletionResponse;
  const choice = completion.choices?.[0];
  if (!choice) {
    return createFallbackResult(params.messages);
  }

  const content = resolveOpenAIContent(choice?.message?.content);

  return {
    id: completion.id ?? `openai-${Date.now()}`,
    created: completion.created ?? Math.floor(Date.now() / 1000),
    model: completion.model ?? "gpt-4o-mini",
    choices: [
      {
        index: choice?.index ?? 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: choice?.finish_reason ?? null,
      },
    ],
    usage: completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens ?? 0,
          completion_tokens: completion.usage.completion_tokens ?? 0,
          total_tokens: completion.usage.total_tokens ?? 0,
        }
      : undefined,
  };
};

const invokeReplicate = async (params: InvokeParams): Promise<InvokeResult> => {
  if (!replicateClient) {
    throw new Error("Replicate API token is not configured");
  }

  const prompt = `${formatMessagesToPrompt(params.messages)}\n\nAssistant:`;

  try {
    const output = (await replicateClient.run(
      "meta/meta-llama-3.1-8b-instruct",
      {
        input: {
          prompt,
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.9,
          presence_penalty: 0,
          frequency_penalty: 0,
        },
      }
    )) as unknown;

    const content = Array.isArray(output)
      ? output.join("")
      : typeof output === "string"
        ? output
        : JSON.stringify(output);

    return {
      id: `replicate-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: "meta/meta-llama-3.1-8b-instruct",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content,
          },
          finish_reason: "stop",
        },
      ],
    };
  } catch (error) {
    console.warn(
      "[LLM] Replicate request failed, using fallback lyrics:",
      error
    );
    return createFallbackResult(params.messages);
  }
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const canUseForge = ENV.forgeFeaturesEnabled && !!ENV.forgeApiKey;
  if (canUseForge) {
    return invokeForge(params);
  }

  if (ENV.openaiApiKey) {
    try {
      return await invokeOpenAI(params);
    } catch (error) {
      console.warn("[LLM] OpenAI request failed, attempting fallback:", error);
    }
  }

  if (replicateClient) {
    return invokeReplicate(params);
  }

  console.warn(
    "[LLM] No external LLM provider available, using static fallback lyrics"
  );
  return createFallbackResult(params.messages);
}
