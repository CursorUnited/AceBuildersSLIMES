// MCP endpoint (Streamable HTTP via mcp-handler). Tools wrap lib/mcpTools.ts.
// Never log tool inputs (they may carry student profile data).
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { documentChecklist, getScheme, matchSchemes, nextQuestionTool } from "@/lib/mcpTools";
import { ENUMS } from "@/lib/engine/fields";

const profileInput = z.record(z.string(), z.unknown());

const PROFILE_HELP = `Student profile as a JSON object. Only include facts the student actually said; leave unknown fields out. Fields: state (2-letter code, e.g. TN); education_level (${ENUMS.education_level.join(", ")}); course_type (${ENUMS.course_type.join(", ")}); institution_type (${ENUMS.institution_type.join(", ")}); year_of_study (1-6); gender (${ENUMS.gender.join(", ")}); community (${ENUMS.community.join(", ")}); religion (${ENUMS.religion.join(", ")}); income {min, max} in rupees per YEAR (max null = no upper bound); first_graduate (boolean); school_6_to_12 (${ENUMS.school_6_to_12.join(", ")}); current_school_type (${ENUMS.current_school_type.join(", ")}); medium (${ENUMS.medium.join(", ")}); admission_route (${ENUMS.admission_route.join(", ")}); aicte_approved, central_obc_certificate, lateral_entry, rural (booleans); disability_percent, last_exam_percent (0-100); age (integer).`;

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

// No basePath option: mcp-handler's options type has no basePath (removed in 2.x).
// Routing is handled by this file's location (app/api/[transport]).
const handler = createMcpHandler((server) => {
  server.registerTool(
    "match_schemes",
    {
      title: "Match schemes",
      description:
        "Find Indian government scholarships a student is likely eligible for. Results are 'likely eligible', never guaranteed.",
      inputSchema: z.object({ profile: profileInput.describe(PROFILE_HELP) }),
    },
    async ({ profile }) => asText(await matchSchemes(profile)),
  );

  server.registerTool(
    "next_question",
    {
      title: "Next question",
      description: "Get the next profile field to ask a student, to unlock more scholarship matches.",
      inputSchema: z.object({ profile: profileInput.describe(PROFILE_HELP) }),
    },
    async ({ profile }) => asText(await nextQuestionTool(profile)),
  );

  server.registerTool(
    "get_scheme",
    {
      title: "Get scheme",
      description: "Get one scholarship scheme by id, with text in the chosen language (en or ta).",
      inputSchema: z.object({ id: z.string().describe("Scheme id from match_schemes, e.g. pudhumai-penn"), lang: z.enum(["en", "ta"]) }),
    },
    async ({ id, lang }) => asText(await getScheme(id, lang)),
  );

  server.registerTool(
    "document_checklist",
    {
      title: "Document checklist",
      description: "List documents needed for a scholarship scheme, filtered by the student's profile.",
      inputSchema: z.object({
        scheme_id: z.string().describe("Scheme id from match_schemes, e.g. pudhumai-penn"),
        profile: profileInput.describe(PROFILE_HELP),
      }),
    },
    async ({ scheme_id, profile }) => asText(await documentChecklist(scheme_id, profile)),
  );
});

export { handler as GET, handler as POST, handler as DELETE };
