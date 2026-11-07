/**
 * Minimal OpenAI-compatible mock used to exercise the assistant and the policy
 * generator without a real provider. It answers /v1/chat/completions only:
 * streaming SSE for chat, JSON for object generation.
 *
 *   node scripts/mock-ai.mjs 8799
 *   AI_API_KEY=test AI_BASE_URL=http://127.0.0.1:8799/v1 AI_MODEL=mock-1 npm run serve
 */
import http from "node:http";

const port = Number(process.argv[2] ?? 8799);

const ANSWER = `Here are the three gaps I would close first in this workspace.

1. **No approved policies.** Stage 1 expects documented, approved versions — you have drafts only. Submit the information security policy for review, then approve it.
2. **Control coverage is below half.** Auditors sample implementation evidence from the Statement of Applicability. Pick the ten highest-risk Annex A controls (A.5.15, A.8.8, A.8.2 first) and move them to implemented with evidence attached.
3. **Expired evidence still linked.** An expired artefact is worse than none: it shows the control lapsed. Replace or withdraw it before the opening meeting.

Next step: approve one policy and attach fresh evidence to A.8.8 this week.`;

const POLICY = {
  title: "Access Control Policy",
  summary: "Defines how access to workspace systems and customer data is requested, approved, reviewed and removed.",
  content: `## 1. Purpose

This policy sets out how Northwind Cloud Ltd grants, reviews and removes access to its information systems, so that only authorised people and services can reach customer data.

## 2. Scope

It applies to every employee, contractor and third-party service that accesses production systems, source code or customer data, and to all identity providers the organisation operates.

## 3. Policy statement

1. Access **must** be granted on the principle of least privilege and tied to a named individual.
2. Every account **must** be unique. Shared or generic accounts are prohibited except for documented break-glass accounts held in the password manager.
3. Multi-factor authentication **must** be enforced for administrative access, remote access and the email and identity provider tenants.
4. Access requests **must** be approved by the system owner and recorded in the access register before provisioning.
5. Privileged access **must** be time-bound and reviewed monthly; all other access is reviewed quarterly.
6. Joiners, movers and leavers **must** follow the documented lifecycle: access is provisioned on day one, adjusted on role change, and revoked within one business day of termination.
7. Credentials **must** be stored only in the approved password manager; secrets in source code, tickets or chat are prohibited.
8. Authentication and authorisation events **must** be logged centrally and retained for twelve months.

## 4. Roles and responsibilities

- **CISO** owns the policy and approves exceptions.
- **System owners** approve access to their systems and confirm quarterly reviews.
- **IT operations** provisions and removes access and maintains the identity provider configuration.
- **All staff** protect their credentials and report suspected compromise immediately.

## 5. Related controls

- A.5.15 Access control — mapped to the quarterly review export.
- A.5.16 Identity management and A.5.18 Access rights — mapped to the joiner/mover/leaver checklist.
- A.8.2 Privileged access rights — mapped to the monthly privileged access review.
- A.8.5 Secure authentication — mapped to the MFA configuration export.

## 6. Compliance and review

Compliance is monitored through the quarterly access review export and internal audit sampling. Exceptions must be approved by the CISO, recorded with an expiry date, and reviewed at the management review. This policy is reviewed at least annually or after a significant change to systems, organisation or threat landscape.`,
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || !req.url?.includes("/chat/completions")) {
    return send(res, 404, { error: { message: "Not found" } });
  }

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", async () => {
    let body = {};
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return send(res, 400, { error: { message: "Bad JSON" } });
    }

    const wantsJson = body.response_format?.type === "json_object";
    if (wantsJson) {
      return send(res, 200, {
        id: "mock",
        choices: [{ message: { role: "assistant", content: JSON.stringify(POLICY) }, finish_reason: "stop" }],
      });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const words = ANSWER.split(" ");
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `${word} ` } }] })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    res.write("data: [DONE]\n\n");
    res.end();
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-ai] listening on http://127.0.0.1:${port}/v1`);
});
